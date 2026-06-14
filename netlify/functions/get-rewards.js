// netlify/functions/get-rewards.js
// Members page calls ?key=TOKEN. Same gate as get-comp. Returns the rewards standings:
//   - lastRound: the most recent SETTLED round's top 3 (by comp points that round)
//   - season:    every member ranked by CUMULATIVE comp points across all settled rounds (top 10)
//   - me:        this member's season total + overall rank (for the dashboard line + to show
//                them even if they're outside the top 10)
// Points = the comp scoring (1 per correct winner, x2 on "double" games, +3 per code clean-swept),
// summed across settled rounds. Data: comp-history.json (settled games+results) + preserved picks.

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
    const myHandle = record.handle || null;
    const empty = { lastRound: null, season: [], me: { handle: myHandle, seasonPoints: 0, seasonRank: null } };
    if (!history.length) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(empty) };
    }

    // Read everyone's picks + handle once.
    const picksStore = store('comp-picks');
    const people = [];
    try {
      const listed = await picksStore.list();
      const keys = (listed && listed.blobs ? listed.blobs : []).map(b => b.key);
      for (const k of keys) {
        const rec = await picksStore.get(k, { type: 'json' }).catch(() => null);
        const m = await members.get(k, { type: 'json' }).catch(() => null);
        if (!m || !m.handle) continue;
        people.push({ handle: m.handle, rec });
      }
    } catch (e) {
      console.error('rewards build failed (non-blocking):', e.message);
    }

    // The most recent settled round is the first entry (history is newest-first).
    const last = history[0];

    // Per person: season total (sum over all settled rounds) + last-round score.
    const totals = people.map(p => {
      let season = 0;
      for (const r of history) season += scorePicks(r.games || [], picksForRound(p.rec, r.id));
      const lastPts = scorePicks(last.games || [], picksForRound(p.rec, last.id));
      return { handle: p.handle, season, lastPts };
    });

    const seasonSorted = totals.slice().filter(t => t.season > 0).sort((a, b) => b.season - a.season);
    const season = seasonSorted.slice(0, 10).map(t => ({ handle: t.handle, points: t.season }));

    const lastWinners = totals.slice().filter(t => t.lastPts > 0).sort((a, b) => b.lastPts - a.lastPts)
      .slice(0, 3).map(t => ({ handle: t.handle, points: t.lastPts }));

    // This member's own season standing (rank over the full sorted field).
    let me = { handle: myHandle, seasonPoints: 0, seasonRank: null };
    if (myHandle) {
      const idx = seasonSorted.findIndex(t => t.handle && t.handle.toLowerCase() === myHandle.toLowerCase());
      const mine = totals.find(t => t.handle && t.handle.toLowerCase() === myHandle.toLowerCase());
      me = { handle: myHandle, seasonPoints: mine ? mine.season : 0, seasonRank: idx >= 0 ? idx + 1 : null };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lastRound: { id: last.id, label: last.label, winners: lastWinners },
        season,
        me,
      }),
    };
  } catch (err) {
    console.error('get-rewards error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'server_error' }) };
  }
};
