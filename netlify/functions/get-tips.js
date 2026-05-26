// netlify/functions/get-tips.js
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
  const token = event.queryStringParameters?.key;
  if (!token) return { statusCode: 400, body: JSON.stringify({ error: 'Missing access key' }) };

  try {
    const members = store('members');
    const record = await members.get(token, { type: 'json' });
    if (!record) return { statusCode: 403, body: JSON.stringify({ error: 'invalid_or_expired' }) };

    const subs = await stripe.subscriptions.list({ customer: record.customerId, status: 'active', limit: 1 });
    if (!subs.data.length) return { statusCode: 403, body: JSON.stringify({ error: 'subscription_inactive' }) };

    const tier = record.tier;
    const tipsStore = store('tips');
    const current = await tipsStore.get('current', { type: 'json' });
    const tierOrder = ['free', 'bronze', 'silver', 'gold'];
    const allowedIdx = tierOrder.indexOf(tier);
    let tips = [];
    if (current) {
      for (let i = 0; i <= allowedIdx; i++) {
        const t = current[tierOrder[i]];
        if (Array.isArray(t)) tips = tips.concat(t);
      }
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier, week: current?.week || 'This week', tips }),
    };
  } catch (err) {
    console.error('get-tips error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'server_error' }) };
  }
};
