// netlify/functions/get-member-link.js
// After payment, the success page calls this with ?session_id=cs_...
// We look up the Stripe checkout session, find the customer's token in Blobs, and return the tips URL.

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

exports.handler = async (event) => {
  const sessionId = event.queryStringParameters?.session_id;
  if (!sessionId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing session_id' }) };
  }

  try {
    // Get the checkout session to find the customer
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const customerId = session.customer;
    const tier = session.metadata?.tier || 'unknown';

    if (!customerId) {
      return { statusCode: 404, body: JSON.stringify({ error: 'customer_not_found' }) };
    }

    // Look up the token for this customer (set by the webhook).
    // The webhook may be a moment behind — if no token yet, ask the page to retry.
    const byCustomer = store('by-customer');
    const map = await byCustomer.get(customerId, { type: 'json' });

    if (!map?.token) {
      return {
        statusCode: 202,    // not ready yet — retry
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending', tier }),
      };
    }

    const siteUrl = process.env.URL || 'https://thepuntersden.com';
    const tipsUrl = `${siteUrl}/tips?key=${map.token}`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ready', tier, tipsUrl }),
    };
  } catch (err) {
    console.error('get-member-link error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'server_error' }) };
  }
};
