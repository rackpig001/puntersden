// netlify/functions/get-comp-history.js
// Members page calls ?key=TOKEN. Same gate as get-comp. Returns SETTLED past comp rounds
// (from comp-history.json), each with its final ladder (computed live from preserved picks)
// and THIS member's own picks + score. Powers the "Past rounds" history at the bottom of the
// Tipping Comp tab. Nothing is recomputed off comp.json (which has rolled to the new round) —
// each archived round carries its own games + results.

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

function loadHistory() {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'comp-history.json'), 'utf8'));
    return (raw && Array.isArray(raw.rounds)) ? raw.rounds : [];
  } catch (e) {
    return [];
  }
}

function picksForRound(rec, roundId) {
  if (!rec) return null;
  if (rec.rounds && typeof rec.rounds === 'object') {
    return (rec.rounds[roundId] && rec.rounds[roundId].picks) ? rec.rounds[roundId].picks : null;
  }
  if (rec.round === roundId && rec.picks) return rec.picks;
  return null;
}

function scorePicks(games, picks) {
  picks = picks || {};
  let pts = 0;
  const byCode = {};
  for (const g of games) {
    (byCode[g.code] = byCode[g.code] || []).push(g);
    if (g.result && picks[g.id] === g.result) pts += (g.double ? 2 : 1);
  }
  for (const code of Object.keys(byCode)) {
    const cg = byCode[code];
    const allGraded = cg.length > 0 && cg.every(g => g.result);
    const allRight = allGraded && cg.every(g => picks[g.id] === g.result);
    if (allRight) pts += 3;
  }
  return pts;
}

exports.handler = async (event) => {
  const token = event.queryStringParameters && event.queryStringParameters.key;
  if (!token) return { statusCode: 400, body: JSON.stringify({ error: 'Missing access key' }) };

  try {
    const members = store('members');
    const record = await members.get(token, { type: 'json' });
    if (!record) return { statusCode: 403, body: JSON.stringify({ error: 'invalid_or_expired' }) };

    const subs = await stripe.subscriptions.list({ customer: record.customerId, status: 'all', limit: 10 });
    const valid = subs.data.find(s => ['active', 'trialing'].includes(s.status));
    if (!valid) return { statusCode: 403, body: JSON.stringify({ error: 'subscription_inactive' }) };

    const history = loadHistory();
    if (!history.length) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rounds: [] }) };
    }

    const picksStore = store('comp-picks');
    const mineRec = await picksStore.get(token, { type: 'json' }).catch(() => null);

    // Read everyone's picks once, then build each archived round's ladder in memory.
    const everyone = [];
    try {
      const listed = await picksStore.list();
      const keys = (listed && listed.blobs ? listed.blobs : []).map(b => b.key);
      for (const k of keys) {
        const rec = await picksStore.get(k, { type: 'json' }).catch(() => null);
        const m = await members.get(k, { type: 'json' }).catch(() => null);
        if (!m || !m.handle) continue;
        everyone.push({ handle: m.handle, rec });
      }
    } catch (e) {
      console.error('history ladder build failed (non-blocking):', e.message);
    }

    const rounds = history.map(r => {
      const games = Array.isArray(r.games) ? r.games : [];
      const ladder = everyone
        .map(m => {
          const rp = picksForRound(m.rec, r.id);
          return rp ? { handle: m.handle, points: scorePicks(games, rp) } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.points - a.points);
      const myPicks = picksForRound(mineRec, r.id) || {};
      return { id: r.id, label: r.label, games, ladder, myPicks, myPoints: scorePicks(games, myPicks) };
    });

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rounds }) };
  } catch (err) {
    console.error('get-comp-history error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'server_error' }) };
  }
};
