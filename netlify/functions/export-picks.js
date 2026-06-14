// netlify/functions/export-picks.js
// ADMIN-ONLY data export. Call ?secret=YOUR_SECRET and it streams back a CSV of every member's
// tipping selections across every round — one row per member per round, with their picks (and
// win/loss vs the result), that round's points, and their running season total.
//
// Gate: requires the EXPORT_SECRET env var to be set, and ?secret= to match it. No secret set
// (or wrong secret) = 403, so this never leaks without the key.
//
// Reads comp.json (current round) + comp-history.json (settled rounds) for the fixtures/results,
// joins the 'comp-picks' Blobs store to the 'members' store on the token. Both JSON files must be
// listed in netlify.toml [functions] included_files.

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

function loadJSON(file) {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8')); }
  catch (e) { return null; }
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

function csvCell(v) {
  const s = (v === null || v === undefined) ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

exports.handler = async (event) => {
  const secret = event.queryStringParameters && event.queryStringParameters.secret;
  if (!process.env.EXPORT_SECRET || secret !== process.env.EXPORT_SECRET) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  try {
    // Build the round list: current (ungraded) + settled history (newest first).
    const rounds = [];
    const cur = loadJSON('comp.json');
    if (cur && cur.round && Array.isArray(cur.round.games)) {
      rounds.push({ id: cur.round.id, label: cur.round.label, games: cur.round.games, settled: false });
    }
    const hist = loadJSON('comp-history.json');
    if (hist && Array.isArray(hist.rounds)) {
      hist.rounds.forEach(r => rounds.push({ id: r.id, label: r.label, games: r.games || [], settled: true }));
    }

    const members = store('members');
    const picksStore = store('comp-picks');

    // Read everyone once.
    const people = [];
    const listed = await picksStore.list();
    const keys = (listed && listed.blobs ? listed.blobs : []).map(b => b.key);
    for (const k of keys) {
      const rec = await picksStore.get(k, { type: 'json' }).catch(() => null);
      const m = await members.get(k, { type: 'json' }).catch(() => null);
      if (!rec) continue;
      people.push({
        handle: (m && m.handle) || '(no name)',
        tier: (m && m.tier) || '',
        phone: (m && m.phone) || '',
        rec,
      });
    }

    const header = ['Handle', 'Tier', 'Phone', 'Round', 'Round Points', 'Season Total', 'Picks'];
    const lines = [header.map(csvCell).join(',')];

    for (const p of people) {
      // Season total = sum over SETTLED rounds only.
      let seasonTotal = 0;
      for (const r of rounds) {
        if (r.settled) seasonTotal += scorePicks(r.games, picksForRound(p.rec, r.id));
      }
      for (const r of rounds) {
        const picks = picksForRound(p.rec, r.id);
        if (!picks || !Object.keys(picks).length) continue;   // only rounds they actually picked
        const detail = r.games.map(g => {
          const pick = picks[g.id];
          if (!pick) return null;
          let mark = '';
          if (g.result) mark = (pick === g.result) ? ' \u2713' : ' \u2717';
          return g.home + ' v ' + g.away + ': ' + pick + mark;
        }).filter(Boolean).join(' | ');
        const roundPts = r.settled ? scorePicks(r.games, picks) : '';
        lines.push([p.handle, p.tier, p.phone, r.label || r.id, roundPts, seasonTotal, detail].map(csvCell).join(','));
      }
    }

    const stamp = new Date().toISOString().slice(0, 10);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="punters-den-picks-' + stamp + '.csv"',
      },
      body: lines.join('\n'),
    };
  } catch (err) {
    console.error('export-picks error:', err);
    return { statusCode: 500, body: 'Export failed: ' + err.message };
  }
};
