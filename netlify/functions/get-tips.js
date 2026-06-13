// netlify/functions/get-tips.js
// The members page calls this with ?key=TOKEN.
// It looks up the token, checks with STRIPE that the subscription is still active,
// then returns the member's tips for their tier — for the current round AND recent past rounds.
// Cancelled members' links stop working automatically.
//
// WEEKLY TIPS are published by editing tips.json in the repo (committed to GitHub).
// Each week: PREPEND a new round object to tips.json "rounds" (newest first), set the
// previous round live:false and give it a "summary". This function serves the most recent
// MAX_ROUNDS rounds, each filtered to the member's tier. Member tokens live in Netlify Blobs.

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { getStore } = require('@netlify/blobs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_ROUNDS = 8;                       // how many recent rounds the member page can browse
const TIER_ORDER = ['bronze', 'silver', 'gold'];

// Same DEN-XXXX code generator as the webhook, so a member who predates the
// referral system gets the SAME code generated here (deterministic from customer id).
const REFCODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
function genRefCode(seed) {
  const h = crypto.createHash('sha256').update(String(seed)).digest();
  let code = '';
  for (let i = 0; i < 4; i++) code += REFCODE_ALPHABET[h[i] % REFCODE_ALPHABET.length];
  return 'DEN-' + code;
}

function store(name) {
  return getStore({
    name,
    siteID: process.env.NETLIFY_SITE_ID || process.env.SITE_ID,
    token: process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_API_TOKEN,
  });
}

// Read tips.json (bundled with the function at deploy time).
// New shape: { rounds: [ { id, label, week, live, summary?, bronze, silver, gold }, ... ] }
// Falls back to the old single-week shape { week, bronze, silver, gold } if found.
function loadData() {
  try {
    const p = path.join(__dirname, 'tips.json');
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (raw && Array.isArray(raw.rounds)) return raw;
    if (raw && (raw.bronze || raw.silver || raw.gold)) {
      return { rounds: [{ id: 'current', label: raw.week || 'This week', week: raw.week || 'This week', live: true, bronze: raw.bronze, silver: raw.silver, gold: raw.gold }] };
    }
    return { rounds: [] };
  } catch (e) {
    console.error('Could not read tips.json:', e.message);
    return { rounds: [] };
  }
}

// Build a round's tips for a member's tier (cumulative: gold also gets silver + bronze).
function tipsForTier(round, tier) {
  const allowed = TIER_ORDER.indexOf(tier);
  let tips = [];
  for (let i = 0; i <= allowed; i++) {
    const arr = round[TIER_ORDER[i]];
    if (Array.isArray(arr)) tips = tips.concat(arr.map(t => ({ ...t, tier: TIER_ORDER[i] })));
  }
  return tips;
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

    // Backfill: members created before the referral system have no code yet.
    // Generate it on the fly (deterministic), save it, and index it - once.
    if (!record.referralCode) {
      try {
        record.referralCode = genRefCode(record.customerId || token);
        if (record.referrals == null) record.referrals = { allTime: 0, season: 0 };
        if (record.points == null) record.points = 0;
        await members.setJSON(token, record);
        await store('by-refcode').setJSON(record.referralCode, { token });
      } catch (e) {
        console.error('Referral-code backfill failed (non-blocking):', e.message);
      }
    }

    const data = loadData();

    // Most recent rounds, each filtered to the member's tier.
    const rounds = (data.rounds || []).slice(0, MAX_ROUNDS).map(r => ({
      id: r.id,
      label: r.label || r.week || 'Round',
      week: r.week || '',
      summary: r.summary || null,
      live: !!r.live,
      tips: tipsForTier(r, tier),
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier,
        rounds,
        referralCode: record.referralCode || null,
        referrals: record.referrals || { allTime: 0, season: 0 },
        handle: record.handle || null,
        memberSince: record.createdAt || null,
      }),
    };
  } catch (err) {
    console.error('get-tips error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'server_error' }) };
  }
};
