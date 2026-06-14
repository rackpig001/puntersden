// netlify/functions/get-comp.js
// Members page calls ?key=TOKEN. Validates the token + a live Stripe subscription
// (same gate as get-tips), then returns the current comp round's games, THIS member's
// saved picks, their points, and the weekly ladder (handle + points only).
//
// Fixtures live in comp.json (committed to GitHub, bundled with the function).
// Picks live in the 'comp-picks' Blobs store, keyed by token, in the MULTI-ROUND shape
//   { rounds: { [roundId]: { picks: { gameId: team } } } }
// so past rounds are preserved (legacy { round, picks } records are read transparently).
// Scoring: 1pt per correct winner, x2 on games flagged "double", +3 per code clean-swept.

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

function loadRound() {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'comp.json'), 'utf8'));
    return (raw && raw.round && Array.isArray(raw.round.games)) ? raw.round : null;
  } catch (e) {
    console.error('Could not read comp.json:', e.message);
    return null;
  }
}

function kickoffMs(s) {
  if (!s) return NaN;
  let t = new Date(s).getTime();
  if (isNaN(t)) t = new Date(String(s).replace(' ', 'T')).getTime();
  return t;
}

// Read picks for ONE round out of either the multi-round shape or a legacy single-round record.
function picksForRound(rec, roundId) {
  if (!rec) return null;
  if (rec.rounds && typeof rec.rounds === 'object') {
    return (rec.rounds[roundId] && rec.rounds[roundId].picks) ? rec.rounds[roundId].picks : null;
  }
  if (rec.round === roundId && rec.picks) return rec.picks;   // legacy
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

    const round = loadRound();
    if (!round) {
      return {
        statusCode: 200, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ round: null, games: [], picks: {}, myPoints: 0, ladder: [], handle: record.handle || null }),
      };
    }

    const now = Date.now();
    const games = round.games.map(g => {
      const ms = kickoffMs(g.kickoff);
      return {
        id: g.id, code: g.code, day: g.day, home: g.home, away: g.away,
        kickoff: g.kickoff, double: !!g.double, result: g.result || null,
        locked: isNaN(ms) ? true : ms <= now,
      };
    });

    const picksStore = store('comp-picks');
    const myPicks = picksForRound(await picksStore.get(token, { type: 'json' }).catch(() => null), round.id) || {};

    const ladder = [];
    try {
      const listed = await picksStore.list();
      const keys = (listed && listed.blobs ? listed.blobs : []).map(b => b.key);
      for (const k of keys) {
        const rp = picksForRound(await picksStore.get(k, { type: 'json' }).catch(() => null), round.id);
        if (!rp) continue;
        const m = await members.get(k, { type: 'json' }).catch(() => null);
        if (!m || !m.handle) continue;
        ladder.push({ handle: m.handle, points: scorePicks(round.games, rp) });
      }
    } catch (e) {
      console.error('comp ladder build failed (non-blocking):', e.message);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        round: { id: round.id, label: round.label },
        games,
        picks: myPicks,
        myPoints: scorePicks(round.games, myPicks),
        ladder,
        handle: record.handle || null,
      }),
    };
  } catch (err) {
    console.error('get-comp error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'server_error' }) };
  }
};
