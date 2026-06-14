// netlify/functions/save-pick.js
// Members page POSTs { key, gameId, team }. Validates the token, confirms the game is in
// the current comp round and its kickoff HASN'T passed (server-side lockout), then saves the pick.
//
// Picks live in the 'comp-picks' Blobs store, keyed by token, in a MULTI-ROUND shape:
//   { rounds: { [roundId]: { picks: { gameId: team } } } }
// Old rounds are NEVER overwritten — every round's picks are kept so the weekly winner and
// the season raffle can always be settled. Legacy single-round records { round, picks } are
// migrated forward on first write (see normalizePicks).

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
    return null;
  }
}

function kickoffMs(s) {
  if (!s) return NaN;
  let t = new Date(s).getTime();
  if (isNaN(t)) t = new Date(String(s).replace(' ', 'T')).getTime();
  return t;
}

// Migrate a legacy single-round record { round, picks } into the multi-round shape
// { rounds: { [roundId]: { picks } } }. New-shape records pass through untouched. This is
// what guarantees old rounds survive when a new round goes live.
function normalizePicks(rec) {
  if (!rec) return { rounds: {} };
  if (rec.rounds && typeof rec.rounds === 'object') return rec;
  if (rec.round) return { rounds: { [rec.round]: { picks: rec.picks || {} } } };
  return { rounds: {} };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { body = {}; }
  const token = body.key, gameId = body.gameId, team = body.team;
  if (!token || !gameId || !team) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Missing fields.' }) };
  }

  try {
    const members = store('members');
    const rec = await members.get(token, { type: 'json' });
    if (!rec) return { statusCode: 403, body: JSON.stringify({ ok: false, error: "Your membership link isn't active." }) };

    const round = loadRound();
    if (!round) return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'No comp running right now.' }) };

    const game = round.games.find(g => g.id === gameId);
    if (!game) return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'Unknown game.' }) };
    if (team !== game.home && team !== game.away) {
      return { statusCode: 200, body: JSON.stringify({ ok: false, error: "That team isn't in this game." }) };
    }
    const ms = kickoffMs(game.kickoff);
    if (isNaN(ms) || ms <= Date.now()) {
      return { statusCode: 200, body: JSON.stringify({ ok: false, error: "This game's locked — picks are closed." }) };
    }

    const picksStore = store('comp-picks');
    const mine = normalizePicks(await picksStore.get(token, { type: 'json' }).catch(() => null));
    if (!mine.rounds[round.id]) mine.rounds[round.id] = { picks: {} };
    mine.rounds[round.id].picks[gameId] = team;
    await picksStore.setJSON(token, mine);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, picks: mine.rounds[round.id].picks }),
    };
  } catch (err) {
    console.error('save-pick error:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Something went wrong — try again.' }) };
  }
};
