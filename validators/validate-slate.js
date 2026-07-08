#!/usr/bin/env node
// validators/validate-slate.js
// Enforces The Punters Den tip standards BEFORE a slate can be published.
// Usage: node validate-slate.js <slate_draft.json> [config.json]
// Exit 0 = PASS, 1 = REJECT (prints reasons), 2 = bad input. Dependency-free.

const fs = require('fs');
const [slatePath = 'slate_draft.json', configPath = 'config.json'] = process.argv.slice(2);
const load = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { console.error('Cannot read ' + p + ': ' + e.message); process.exit(2); } };

const cfg = load(configPath);
const R = cfg.rules || {};
const slate = load(slatePath);
const fails = [];
const fail = (where, msg) => fails.push(where + ' → ' + msg);
const label = t => (t.type || 'tip') + (t.selection ? ' · ' + t.selection : '') + (t.game_id ? ' [' + t.game_id + ']' : '');
const validDays = R.valid_days || ['Thu', 'Fri', 'Sat', 'Sun'];

for (const [tier, tips] of Object.entries(slate.tiers || {})) {
  for (const t of tips || []) {
    const L = tier.toUpperCase() + ': ' + label(t);
    const isHero = t.type === 'hero';

    // day tag (multi-day tips use special:true)
    if (!t.special && !validDays.includes(t.day)) fail(L, 'missing/invalid day (need ' + validDays.join('/') + ' or special:true)');

    // confidence floor by tier (Hero is a lottery — exempt)
    if (!isHero) {
      const stars = t.confidence_stars || 0;
      const floor = (tier === 'bronze') ? (R.bronze_min_stars || 3) : (R.silver_gold_min_stars || 4);
      if (stars < floor) fail(L, 'confidence ' + stars + '\u2605 below ' + tier + ' minimum ' + floor + '\u2605');
    }

    // H2H single: odds floor + best bookie named
    if (t.type === 'h2h_single') {
      if (!(t.odds >= (R.min_h2h_odds || 1.5))) fail(L, 'H2H odds $' + t.odds + ' below min $' + (R.min_h2h_odds || 1.5));
      if (!t.bookie) fail(L, 'no best bookie named');
    }

    // Multi types: leg count, confirmed players, odds band
    if (t.type === 'sgm' || t.type === 'cross_sport' || isHero) {
      const legs = t.legs || [];
      const minL = R.sgm_min_legs || 3, maxL = R.sgm_max_legs || 4;
      if (!isHero && (legs.length < minL || legs.length > maxL)) fail(L, legs.length + ' legs (need ' + minL + '\u2013' + maxL + ')');
      for (const leg of legs) {
        if (leg.player && leg.confirmed !== true) fail(L, 'leg player "' + leg.player + '" NOT confirmed in the named side');
      }
      if (!isHero) {
        const band = t.type === 'cross_sport'
          ? [R.cross_sport_odds_min || 3, R.cross_sport_odds_max || 6]
          : [R.sgm_odds_min || 3, R.sgm_odds_max || 8];
        if (t.est_odds == null) fail(L, 'no est_odds to band-check');
        else if (t.est_odds < band[0] || t.est_odds > band[1]) fail(L, 'est odds $' + t.est_odds + ' outside $' + band[0] + '\u2013$' + band[1] + ' band');
      }
    }
  }
}

// line moves must be flagged
for (const m of slate.line_moves || []) {
  const thr = R.line_move_flag_pct || 10;
  if (Math.abs(m.pct) >= thr && !m.flagged) fail('LINE MOVE [' + m.game_id + ']', Math.abs(m.pct) + '% move not flagged (\u2265 ' + thr + '%)');
}

if (fails.length === 0) {
  console.log('\u2705 PASS \u2014 slate meets every standard.');
  process.exit(0);
}
console.log('\u274C REJECT \u2014 ' + fails.length + ' issue(s), will not publish:');
fails.forEach(f => console.log('   \u2022 ' + f));
process.exit(1);
