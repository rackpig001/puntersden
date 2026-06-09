// netlify/functions/stripe-webhook.js
// Stripe calls this automatically on payment events.
// On a completed checkout: generate a unique access token for the member,
// store token -> { customerId, tier, phone } in Netlify Blobs, then send the
// welcome SMS (their private tips link) via Mobile Message, and add them to
// the members contact list for weekly "tips are live" sends.
//
// ENV VARS REQUIRED FOR SMS (Netlify > Site configuration > Environment variables):
//   MOBILE_MESSAGE_API_USERNAME   your Mobile Message API username
//   MOBILE_MESSAGE_API_PASSWORD   your Mobile Message API password
//   SMS_SENDER                    the sender exactly as it appears in your Mobile Message
//                                 account (your dedicated virtual number now, e.g. 04xxxxxxxx;
//                                 change to PUNTERSDEN once ACMA-approved)
//   SMS_MEMBERS_LIST_ID           (optional) numeric ID of your "Members" contact list in
//                                 Mobile Message - enables one-tap weekly sends to all members
//
// If the SMS env vars aren't set yet, the webhook still works exactly as before -
// it just logs that SMS is not configured. SMS problems NEVER block member creation.

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');

const SITE_URL = 'https://thepuntersden.com';
const MM_API = 'https://api.mobilemessage.com.au/v1';

// Helper: get a Blobs store with explicit config (works in classic functions)
function store(name) {
  return getStore({
    name,
    siteID: process.env.NETLIFY_SITE_ID || process.env.SITE_ID,
    token: process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_API_TOKEN,
  });
}

// ── Referral helpers ─────────────────────────────────────────────────────
// A member's shareable code: DEN-XXXX, derived deterministically from their
// customer id (stable, and uses an unambiguous alphabet - no 0/O/1/I).
const REFCODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
function genRefCode(seed) {
  const h = crypto.createHash('sha256').update(String(seed)).digest();
  let code = '';
  for (let i = 0; i < 4; i++) code += REFCODE_ALPHABET[h[i] % REFCODE_ALPHABET.length];
  return 'DEN-' + code;
}

// ── Mobile Message helpers ───────────────────────────────────────────────
function mmConfigured() {
  return !!(process.env.MOBILE_MESSAGE_API_USERNAME && process.env.MOBILE_MESSAGE_API_PASSWORD && process.env.SMS_SENDER);
}

function mmAuthHeader() {
  const creds = `${process.env.MOBILE_MESSAGE_API_USERNAME}:${process.env.MOBILE_MESSAGE_API_PASSWORD}`;
  return 'Basic ' + Buffer.from(creds).toString('base64');
}

async function mmRequest(method, path, body, idempotencyKey) {
  const headers = { 'Authorization': mmAuthHeader(), 'Content-Type': 'application/json' };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const res = await fetch(`${MM_API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Mobile Message ${method} ${path} -> HTTP ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

// The welcome SMS. GSM-7 safe (no emojis / fancy punctuation, so it isn't
// stripped or double-charged). {optout} is replaced by Mobile Message with a
// compliant 20-char opt-out instruction automatically.
function welcomeText(tier, link) {
  const tierName = tier && tier !== 'unknown' ? tier.charAt(0).toUpperCase() + tier.slice(1) : '';
  const hello = tierName ? `Welcome to The Punters Den (${tierName})!` : 'Welcome to The Punters Den!';
  return `${hello} Your private tips link - save it:\n${link}\n\nFresh tips drop each week. 18+ Gamble responsibly 1800 858 858.{optout}`;
}

// Send the welcome SMS. Idempotency-Key is tied to the Stripe session, so if
// Stripe retries the webhook the member still only gets ONE welcome text.
async function sendWelcomeSms(phone, tier, link, sessionId) {
  const result = await mmRequest('POST', '/messages', {
    messages: [{
      to: phone,
      message: welcomeText(tier, link),
      sender: process.env.SMS_SENDER,
      custom_ref: `welcome-${tier}`,
    }],
    max_parts: 3,
  }, `welcome-${sessionId}`);
  const status = result?.results?.[0]?.status || 'unknown';
  console.log(`Welcome SMS to ${phone}: ${status}`);
  return status === 'success';
}

// Save the member as a Mobile Message contact (tier in field_1, their tips link
// in field_2 - so a weekly list send can use {field_2} to include each member's
// own link), and add them to the Members list if SMS_MEMBERS_LIST_ID is set.
async function addMemberContact(phone, tier, link) {
  try {
    await mmRequest('POST', '/contacts', {
      number: phone,
      company: 'The Punters Den member',
      field_1: tier,
      field_2: link,
    });
  } catch (e) {
    // 409 = contact already exists (e.g. re-subscriber) - that's fine
    if (!String(e.message).includes('409')) throw e;
  }
  const listId = parseInt(process.env.SMS_MEMBERS_LIST_ID, 10);
  if (listId) {
    await mmRequest('POST', '/list-contacts', { list_id: listId, number: phone });
  }
}

// On cancellation, take them off the weekly list so they stop getting "tips are
// live" texts (their link is already revoked separately).
async function removeMemberContact(phone) {
  const listId = parseInt(process.env.SMS_MEMBERS_LIST_ID, 10);
  if (listId && phone) {
    await mmRequest('DELETE', '/list-contacts', { list_id: listId, number: phone });
  }
}

// ── Webhook handler ──────────────────────────────────────────────────────
exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    // Verify the event really came from Stripe (uses the webhook signing secret)
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  const members = store('members');        // token -> member record
  const byCustomer = store('by-customer'); // customerId -> token (so we can revoke on cancel)
  const byRefcode = store('by-refcode');   // referralCode -> token (find a referrer by their code)

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object;
        const tier = session.metadata?.tier || 'unknown';
        const customerId = session.customer;
        const phone = session.customer_details?.phone || session.customer_phone || null;

        // Generate an unguessable token for the member's private link
        const token = crypto.randomBytes(24).toString('hex');
        const link = `${SITE_URL}/tips?key=${token}`;

        // Referral: the referrer's code rides in on client_reference_id (or sub metadata).
        const referredBy = (session.client_reference_id || session.metadata?.ref || '').trim() || null;
        const referralCode = genRefCode(customerId || token); // this member's OWN code to share

        const record = {
          customerId,
          tier,
          phone,
          createdAt: new Date().toISOString(),
          welcomeSmsSent: false,
          // ── loyalty / referral ──
          referralCode,             // DEN-XXXX they share
          referredBy,               // referrer's code, if they were referred
          referralCredited: false,  // true once their trial converts and their referrer is credited
          referrals: { allTime: 0, season: 0 },
          points: 0,
          handle: null,
        };

        await members.setJSON(token, record);
        if (customerId) await byCustomer.setJSON(customerId, { token });
        // Index their referral code so a future conversion can find them as a referrer.
        try { await byRefcode.setJSON(referralCode, { token }); }
        catch (e) { console.error('Could not index referral code (member still created):', e.message); }
        console.log(`New ${tier} member. Token: ${token}. Phone: ${phone || 'none captured'}`);

        // ── Welcome SMS + contact list (best-effort: NEVER blocks the member record) ──
        if (!mmConfigured()) {
          console.log('SMS not configured (set MOBILE_MESSAGE_API_USERNAME / _PASSWORD / SMS_SENDER) - skipping welcome SMS.');
        } else if (!phone) {
          console.warn('No phone number on this checkout session - cannot send welcome SMS. Send the link manually from Stripe.');
        } else {
          try {
            const sent = await sendWelcomeSms(phone, tier, link, session.id);
            if (sent) {
              record.welcomeSmsSent = true;
              await members.setJSON(token, record);
            }
          } catch (e) {
            console.error('Welcome SMS failed (member still created - send link manually):', e.message);
          }
          try {
            await addMemberContact(phone, tier, link);
          } catch (e) {
            console.error('Could not add member to Mobile Message contacts/list:', e.message);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        // Subscription cancelled/ended - remove their access
        const sub = stripeEvent.data.object;
        const customerId = sub.customer;
        const map = await byCustomer.get(customerId, { type: 'json' });
        if (map?.token) {
          const record = await members.get(map.token, { type: 'json' }).catch(() => null);
          await members.delete(map.token);
          await byCustomer.delete(customerId);
          console.log(`Revoked access for customer ${customerId}`);
          // Best-effort: stop their weekly "tips are live" texts too
          if (mmConfigured() && record?.phone) {
            try { await removeMemberContact(record.phone); }
            catch (e) { console.error('Could not remove member from SMS list:', e.message); }
          }
        }
        break;
      }

      case 'invoice.paid': {
        // Referral credit: when a REFERRED member's trial converts to a paid week,
        // give their referrer +1. Fully guarded: never credits twice, never blocks anything.
        try {
          const invoice = stripeEvent.data.object;
          if (invoice.amount_paid && invoice.amount_paid > 0) {   // skip $0 trial invoices
            const customerId = invoice.customer;
            const map = customerId ? await byCustomer.get(customerId, { type: 'json' }).catch(() => null) : null;
            const rec = map?.token ? await members.get(map.token, { type: 'json' }).catch(() => null) : null;
            if (rec && !rec.referralCredited && rec.referredBy) {
              const refMap = await byRefcode.get(rec.referredBy, { type: 'json' }).catch(() => null);
              if (refMap?.token) {
                const referrer = await members.get(refMap.token, { type: 'json' }).catch(() => null);
                if (referrer) {
                  referrer.referrals = referrer.referrals || { allTime: 0, season: 0 };
                  referrer.referrals.allTime += 1;
                  referrer.referrals.season += 1;
                  await members.setJSON(refMap.token, referrer);
                  console.log(`Referral credited to ${rec.referredBy}: ${referrer.referrals.allTime} all-time`);
                }
              }
              rec.referralCredited = true;            // never double-credit this member
              await members.setJSON(map.token, rec);
            }
          }
        } catch (e) {
          console.error('Referral credit failed (non-blocking):', e.message);
        }
        break;
      }

      default:
        // ignore other events
        break;
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error('Webhook handler error:', err);
    return { statusCode: 500, body: 'Webhook handler failed' };
  }
};
