// netlify/functions/find-link.js
// "Get my tips" — a returning member enters the phone number they signed up with.
// We find their access token, confirm with STRIPE that their subscription is still
// active (or trialing), and return the token so the page can send them to their tips.
// No login, no password — just the phone on file, matched against Stripe.

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { getStore } = require('@netlify/blobs');

function store(name) {
  return getStore({
    name,
    siteID: process.env.NETLIFY_SITE_ID || process.env.SITE_ID,
    token: process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_API_TOKEN,
  });
}

// Australian-friendly phone match: reduce ANY format the member might type
// (+61 4.., 04.., spaces, dashes, brackets) down to the last 9 digits and compare.
//   "+61412345678" -> "412345678"
//   "0412 345 678" -> "412345678"
const normPhone = (p) => (p || '').replace(/\D/g, '').slice(-9);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'method_not_allowed' }) };
  }

  let phone = null;
  try { phone = JSON.parse(event.body || '{}').phone; } catch { /* ignore */ }

  const target = normPhone(phone);
  if (target.length < 9) {
    return { statusCode: 400, body: JSON.stringify({ error: 'bad_phone' }) };
  }

  try {
    const members = store('members');

    // Find the member whose stored phone matches. (Fine at small scale — if the
    // member list ever gets very large, swap this for a by-phone index written by
    // the webhook.)
    const { blobs } = await members.list();
    let match = null;
    for (const b of blobs) {
      const rec = await members.get(b.key, { type: 'json' });
      if (rec && normPhone(rec.phone) === target) { match = { token: b.key, rec }; break; }
    }

    if (!match) {
      return { statusCode: 404, body: JSON.stringify({ error: 'not_found' }) };
    }

    // Confirm the subscription is still active/trialing (cancelled members get nothing).
    const subs = await stripe.subscriptions.list({
      customer: match.rec.customerId,
      status: 'all',
      limit: 10,
    });
    const valid = subs.data.find(s => ['active', 'trialing'].includes(s.status));
    if (!valid) {
      return { statusCode: 403, body: JSON.stringify({ error: 'inactive' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, token: match.token }),
    };
  } catch (err) {
    console.error('find-link error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'server_error' }) };
  }
};
