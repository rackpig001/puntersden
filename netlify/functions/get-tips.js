// netlify/functions/get-tips.js
// The members page calls this with ?key=TOKEN.
// It looks up the token, checks with STRIPE that the subscription is still active,
// then returns the tips for that member's tier. Cancelled members' links stop working automatically.
//
// WEEKLY TIPS are published by editing tips.json in the repo (committed to GitHub).
// Member tokens still live in Netlify Blobs.

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { getStore } = require('@netlify/blobs');
const fs = require('fs');
const path = require('path');

function store(name) {
  return getStore({
    name,
    siteID: process.env.NETLIFY_SITE_ID || process.env.SITE_ID,
    token: process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_API_TOKEN,
  });
}

// Read this week's tips from tips.json (bundled with the function at deploy time)
function loadTips() {
  try {
    const p = path.join(__dirname, 'tips.json');
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error('Could not read tips.json:', e.message);
    return null;
  }
}

exports.handler = async (event) => {
  const token = event.queryStringParameters?.key;
  if (!token) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing access key' }) };
  }

  try {
    const members = store('members');
    const record = await members.get(token, { type: 'json' });

    if (!record) {
      return { statusCode: 403, body: JSON.stringify({ error: 'invalid_or_expired' }) };
    }

    // Confirm with Stripe that this customer still has an active (or trialing) subscription.
    // Trialing = free-week trial member, also valid. Cancelled/past_due = invalid.
    const subs = await stripe.subscriptions.list({
      customer: record.customerId,
      status: 'all',
      limit: 10,
    });

    const validStatuses = ['active', 'trialing'];
    const valid = subs.data.find(s => validStatuses.includes(s.status));

    if (!valid) {
      return { statusCode: 403, body: JSON.stringify({ error: 'subscription_inactive' }) };
    }

    const tier = record.tier;

    // Load this week's tips from tips.json
    // Shape: { week: "Round 13", bronze:[...], silver:[...], gold:[...] }
    // Higher tiers include everything lower tiers get.
    const current = loadTips();

    const tierOrder = ['bronze', 'silver', 'gold'];
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
      body: JSON.stringify({
        tier,
        week: current?.week || 'This week',
        tips,
      }),
    };
  } catch (err) {
    console.error('get-tips error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'server_error' }) };
  }
};
