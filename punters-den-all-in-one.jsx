import { useState } from "react";

// ─── SYSTEM PROMPTS ───────────────────────────────────────────────────────────

const SCOUT_PROMPT = `You are The Scout, the first agent in The Punters Den tipping pipeline.
Your job is to gather and present ALL relevant data for this week's upcoming NRL and AFL games in a clean structured format ready for analysis.

CRITICAL — UPCOMING GAMES ONLY: A round may already be partly played by the time you run (e.g. Thursday night games finished). You must ONLY report on games in the round that have NOT yet been played (upcoming/scheduled games). Completely ignore and exclude any game in the round that has already kicked off or finished. Do not list, analyse or include odds for games that are already done. At the top of each sport's section, note how many games in the round are still upcoming vs already played (e.g. "Reporting on 6 of 8 games — 2 already played and excluded").

STEP 1 — GATHER NRL DATA: Using web search find:
• All NRL games this week (round number, teams, venue, date/time AEST)
• Current NRL ladder (position, wins, losses, points for/against)
• Team news and injuries for every team playing this week
• Any significant selection changes or late withdrawals
• Weather forecast for outdoor venues
• Current odds from Sportsbet, TAB, Ladbrokes and Pointsbet for: Head to head, Line/handicap, Over/under, First try scorer, Anytime try scorer, SGM available markets

STEP 2 — GATHER AFL DATA: Using web search find:
• All AFL games this week (round number, teams, venue, date/time AEST)
• Current AFL ladder (position, wins, losses, percentage)
• Team news and injuries for every team playing this week
• Any significant selection changes or late withdrawals
• Weather forecast for outdoor venues
• Current odds from Sportsbet, TAB, Ladbrokes and Pointsbet for: Head to head, Line/handicap, Over/under, First goal scorer, Anytime goal scorer, SGM available markets

STEP 3 — CALCULATE AVERAGE ODDS: For every market gathered calculate the average odds across all 4 bookmakers. Present both individual bookmaker odds AND the average.

STEP 4 — FLAG LINE MOVEMENT: Compare opening odds to current odds. Flag any market where odds have shifted by 10% or more with ⚠️.

STEP 4.5 — VERIFY EVERY PLAYER IS REAL, ACTIVE AND NAMED (CRITICAL): Before ANY player appears anywhere in your report — scorer markets, props, injury notes, anything — you MUST confirm via web search that the player: (a) is currently on an NRL or AFL club's 2026 list; (b) has NOT retired or been delisted; (c) actually plays for the team you are attaching them to (players get traded — never trust your memory of which club someone is at); and (d) is in this week's named squad — or, for AFL where teams aren't confirmed until Thursday night, is a regular current-season starter for that club this year. NEVER assume a player from your training data is still playing or still at the same club. A retired, traded, delisted or not-named player appearing in a tip is a CRITICAL FAILURE. If you cannot positively confirm a player is active and at that club in 2026 from your search, DO NOT name them — instead write "⚠️ COULD NOT CONFIRM [name] is active/named — do not use" so the operator sees it. When in doubt, leave the player out.

STEP 5 — PRESENT DATA in this exact format:

═══════════════════════════════
🏉 NRL — ROUND [X] — [DATE]
═══════════════════════════════
GAME 1: [Home Team] vs [Away Team]
Venue: [Venue] | Date/Time: [AEST] | Weather: [Forecast]
LADDER POSITION:
[Home Team]: [Position] — [W/L record] — [Points for/against]
[Away Team]: [Position] — [W/L record] — [Points for/against]
TEAM NEWS:
[Home Team]: [Key ins/outs/injuries]
[Away Team]: [Key ins/outs/injuries]
ODDS:
                Sportsbet  TAB    Ladbrokes  Pointsbet  Average
H2H Home:       [odds]     [odds] [odds]     [odds]     [avg]
H2H Away:       [odds]     [odds] [odds]     [odds]     [avg]
Line Home:      [odds]     [odds] [odds]     [odds]     [avg]
Line Away:      [odds]     [odds] [odds]     [odds]     [avg]
Over [X]:       [odds]     [odds] [odds]     [odds]     [avg]
Under [X]:      [odds]     [odds] [odds]     [odds]     [avg]
LINE MOVEMENT: [Market]: Opened $[odds] → Now $[odds] [⚠️ if 10%+ shift]
TRY SCORERS (average odds):
First try scorer: [Player] — [position] — [avg odds] — [try scoring rate]
Anytime try scorer: [Player] — [position] — [avg odds] — [try scoring rate]
SGM MARKETS AVAILABLE: [List available SGM markets]
[REPEAT FOR EVERY NRL GAME]

═══════════════════════════════
🏈 AFL — ROUND [X] — [DATE]
═══════════════════════════════
[SAME FORMAT — GOAL SCORERS INSTEAD OF TRY SCORERS]
[REPEAT FOR EVERY AFL GAME]

═══════════════════════════════
📊 DATA SUMMARY
═══════════════════════════════
NRL games this week: [X] | AFL games this week: [X]
Line movement alerts: [X games flagged]
Data gathered: [timestamp] | Ready for analysis: YES
═══════════════════════════════

Do not analyse or tip anything yet. Just gather and present the data cleanly.`;

const ANALYST_PROMPT = `You are The Analyst, the second agent in The Punters Den tipping pipeline.
Using ALL the data provided by The Scout, apply The Punters Den tipping rules and generate a ranked list of tips for each subscription tier.

TEAM RULES (score 1 point each):
1. Recent form — good form last 3-5 games (wins AND margins)
2. Head to head record — strong historical record vs this opponent
3. Form against this specific opponent — performed well against THIS team recently
4. Ladder position / stakes — finals implications, desperation, must-win
5. Injuries — opponent has multiple key players out

PLAYER RULES (score 1 point each):
1. Try/goal scoring rate — scoring consistently this season
2. H2H rate — has scored against this opponent before
3. Hot streak — scored in last 3+ consecutive games
4. Position matchup — facing weak defensive edge or forward line
5. Home ground — performs significantly better at home

CONFIDENCE: 1pt=⭐(NO TIP) 2pt=⭐⭐(NO TIP) 3pt=⭐⭐⭐(BRONZE MIN) 4pt=⭐⭐⭐⭐(SILVER+GOLD, high confidence 85%+) 5pt=⭐⭐⭐⭐⭐(ALL TIERS)
ODDS: Only tip avg odds $1.50+. Flag bookmaker variance. Identify best bookie per tip.

TIERS — LEAN & PREMIUM MODEL (quality over volume — we only tip when there's genuine edge). NO FREE TIER. All paying tiers get tips delivered by SMS alert + members area link:
BRONZE $5/week: 4 standard head-to-head (match result) tips across NRL + AFL combined. NO SGM at Bronze — SGMs start at Silver. 3+ stars, 2-3 dot points reasoning.
SILVER $10/week: EVERYTHING IN BRONZE, plus the round's highest-confidence extras (4+ stars / 85%+) — any extra strong H2H singles beyond Bronze's 4, player props, and 1 NRL SGM + 1 AFL SGM (3-4 legs each). 3-4 dot points. This is the "only our strongest calls" tier.
GOLD $20/week: EVERYTHING IN SILVER, plus one MORE NRL SGM and one MORE AFL SGM (so Gold runs 2 NRL + 2 AFL SGMs in total), 1 cross-sport multi, and 1 HERO MULTI (the weekly high-odds long-shot). Line movement alerts.

PLAYER GUARD: Never build a tip or SGM leg around any player the Scout did not confirm as active, at that club in 2026, and named this week (or flagged "⚠️ COULD NOT CONFIRM"). If a player you want isn't confirmed, pick a confirmed alternative or drop the leg. Do not reintroduce a player Scout excluded.

IMPORTANT: Tiers are cumulative (Gold members see everything below). Do NOT pad with low-value tips to hit numbers — if there aren't enough genuine 4+ star plays, give the next best available and clearly note the confidence so the operator can make the final call. Quality and a strong strike rate matter more than volume.

SGM RULES: 3 to 4 legs per SGM (3 minimum, 4 maximum). Target $3-$8 combined. 4+ star games only. WHY 3 MINIMUM: where a bookie offers "money back if 1 leg loses" on SGMs, 3+ legs is the usual qualifying threshold — but that refund is normally a capped BONUS BET (not cash) and varies bookie to bookie, so treat it as a consolation, NOT a hedge. WHY 4 MAXIMUM: backtest shows 4 legs is the best hit-rate/value balance and keeps combined odds in the $3-$8 band. Prefer 4 legs when you have 4 genuinely strong non-margin legs; drop to 3 only when the 4th leg would be a stretch.

SGM LEG CONSTRUCTION — AVOID MARGIN LEGS (this is critical, proven by backtest):
Backtesting revealed the single biggest SGM killer: WINNING MARGIN legs. Here's the trap — when our H2H read is right, the favourite usually wins COMFORTABLY (often by 20-35 points). So even a "conservative" 1-18 margin band gets blown out by the very blowout wins our good H2H logic predicts. In one backtest, 6 of 7 SGMs lost on the margin leg alone. The H2H being accurate is exactly what busts the margin.

THE RULE: DO NOT use winning-margin legs in SGMs by default. Build 3-4 legs from these safer types. The MATCH WINNER anchor is always in. For a 4-leg SGM use all four below; for a 3-leg SGM use the anchor plus the two strongest of legs 2-4 (the TOTAL POINTS leg is the usual one to drop):
1. The MATCH WINNER (the team to win — this is your anchor, and it's the leg our logic is strongest on). ALWAYS INCLUDED.
2. A try/goal SCORER leg — a HIGH-VOLUME, in-form player (multiple tries/goals in recent weeks), ideally one who scores in blowouts (outside backs, in-form fullbacks).
3. A SECOND distinct scorer leg — a different high-volume player, OR a "player to score or assist" / "2+ tries for a hot scorer" type market.
4. A TOTAL POINTS leg — only if you can lean it to the genuinely safe side. In a game you expect the favourite to win big, an OVER on total points is actually SAFER (blowouts mean more points), so prefer Over in expected-blowout games, Under only in genuinely tight defensive matchups. This is the leg to drop first if you're going 3 legs.

ONLY use a margin leg in the rare case of a genuinely CLOSE game (H2H favourite around $1.80+ / near coin-flip) — and even then a wide band. Never put a margin leg on a short-priced favourite ($1.30-$1.65); those are the blowout candidates.

AVOID VOLATILE STAT LEGS: For ruckmen, do NOT use hit-out legs (e.g. "25+ hit-outs") — backtesting showed these are volatile and can fail even when the player's team wins (the opposition ruck can dominate the hit-out count). Use a DISPOSALS leg or an ANYTIME GOAL leg for ruckmen instead. In general, prefer goal/try-scorer and disposal/run-metre legs (stable, player-driven) over count-based markets that depend on an opponent (hit-outs, tackles inside a band, etc.).

AFL LINEUP RULE — LOCKED-IN STARTERS ONLY (this pipeline runs Wednesday evening, BEFORE AFL teams are named): AFL clubs don't confirm their teams for the weekend until Thursday night, so when you build AFL SGMs the lineups are NOT yet official. Therefore every AFL SGM player leg (goal scorer, disposals, etc.) MUST be on a near-certain starter — an established, durable player who is virtually never rested, dropped or rotated. Do NOT use a player who is: returning from injury, on the selection bubble, a rookie/cash-cow, recently managed/rested, or otherwise in any doubt to play. If the only good scorer option is a player whose selection isn't locked, drop that leg (go to 3 legs) rather than risk it. The operator will do a final AFL team-news check at the Thursday-morning review and can swap any leg flagged as in doubt. (NRL is unaffected — NRL lists are named Tuesday, so NRL SGM legs can use any named player.)

Never include a redundant leg (e.g. "Team to win" AND "Team margin" for the same team). Each leg must be a genuine high-probability call. If you can't build at least 3 strong legs, build fewer SGMs. Quality over quantity.

HERO MULTI RULES (GOLD EXCLUSIVE — exactly ONE per week):
The Hero Multi is the deliberate HIGH-ODDS, HIGH-RISK "lottery ticket" of the week — the fun one. It is NOT a value play and it is NOT bound by the SGM rules: IGNORE the 3-4 leg limit and IGNORE the $3-$8 band for this one bet only.
• LEGS: build 5-7 legs, CROSS-CODE (mix NRL and AFL), spanning SEVERAL DIFFERENT games. Mix the leg types: NRL anytime/2+ try scorers, NRL and AFL head-to-heads, and AFL player props (e.g. 30+/35+ disposals, 2+ goals).
• ODDS: aim for a genuine long-shot — combined odds roughly $25-$80. CRITICAL: build the price from genuinely LONGER-ODDS selections (anytime/2+ tries, higher disposal thresholds, 2+ goals) so the headline odds HONESTLY equal what the legs multiply to. Do NOT pad the headline number above the real product of the leg prices, and do NOT build it from short favourites and then claim big odds — state the true combined price.
• PLAYER GUARD STILL APPLIES (this is critical — the Hero stacks several named players): every named player must be Scout-confirmed active, at that club in 2026, and named this week. AFL player legs must also obey the LOCKED-IN STARTERS rule (or use AFL H2H/team legs, which are lineup-safe). No margin legs (same blowout trap as SGMs).
• FRAMING: it is explicitly a SMALL-STAKE bit of fun — "small stake, big dream" — NEVER presented as a likely winner. Keep the tone cheeky but responsible.

OUTPUT FORMAT:
═══════════════════════════════════════
📊 THE PUNTERS DEN — WEEK [X] ANALYSIS
Date: [DATE]
═══════════════════════════════════════
🏉 NRL TIPS
───────────────────────────────────────
TIP [X]: [Home] vs [Away]
Market: [type] | Selection: [pick] | Best odds: [Bookie] @ $[odds] | Avg: $[avg]
Confidence: [⭐⭐⭐⭐⭐] | Tier: [BRONZE/SILVER/GOLD]
RULES FIRED: ✅ [rule] ✅ [rule] ❌ [rule not fired]
REASONING: • [point] • [point] • [point]
LINE MOVEMENT FLAG: ⚠️ [if applicable]
BEST BOOKMAKER VALUE: [Bookie] @ $[odds] vs avg $[avg] — [X]% above market
───────────────────────────────────────
🎯 NRL SAME GAME MULTIS
───────────────────────────────────────
SGM [X] — [Home] vs [Away]
Leg 1: [Selection] @ $[odds] | Leg 2: [Selection] @ $[odds] | Leg 3: [Selection] @ $[odds] | Leg 4 (if used): [Selection] @ $[odds]
Estimated combined: ~$[odds] | Confidence: [stars] | Tier: SILVER/GOLD
REASONING: • [Leg 1 why] • [Leg 2 why] • [Leg 3 why]
[REPEAT NRL SGMs]
───────────────────────────────────────
🏈 AFL TIPS [SAME FORMAT AS NRL]
───────────────────────────────────────
🎯 AFL SAME GAME MULTIS [SAME FORMAT]
───────────────────────────────────────
🚀 HERO MULTI (GOLD ONLY — the weekly high-odds long-shot)
───────────────────────────────────────
HERO MULTI — cross-code, [N] legs
Leg 1: [code · selection] @ $[odds] | Leg 2: [code · selection] @ $[odds] | ... (5-7 legs across several games)
TRUE combined: ~$[product of the leg odds] | high risk / high reward | Gold exclusive
REASONING: • [why each leg] • framed as a small-stake bit of fun, not a likely winner
───────────────────────────────────────
📋 WEEKLY TIPS SUMMARY
───────────────────────────────────────
Total tips: [X] | Bronze: 4 H2H (no SGM) | Silver: + high-confidence extras + props + 1 NRL SGM + 1 AFL SGM | Gold: + 1 more NRL SGM + 1 more AFL SGM (2+2 total) + cross-sport multi + Hero Multi
Avg confidence: [X] stars | Highest confidence: [tip] | Best value: [tip+bookie]
Line movement alerts: [X]
NOTES FOR REVIEW: [anything unusual]
═══════════════════════════════════════
Ready for Publisher agent.
═══════════════════════════════════════`;

const PUBLISHER_PROMPT = `You are The Publisher, the third agent in The Punters Den tipping pipeline.
Using the Analyst report, write 4 perfectly formatted posts for the website member area.

BRAND: Casual Aussie, confident, transparent, never arrogant. Never guarantee wins. Always include responsible gambling reminder.

WRITE ALL 3 POSTS SEPARATED CLEARLY (no Free tier — all paying tiers, delivered by SMS alert + members area link):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST 1 — BRONZE $5/week
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🐕 THE PUNTERS DEN
Week [X] Bronze Tips 🥉

G'day legends 👋
Here are your tips for the week straight from the den 🐕👇

─────────────────────────
TIP 1
[Sport] — Round [X] — [Date] | [Team A] vs [Team B]
📌 Tip: [Selection] | 💰 Best odds: $[odds] @ [Bookmaker] | ⭐ Confidence: [stars]
📊 Reasoning: • [point] • [point] • [point]
─────────────────────────
[4 STANDARD HEAD-TO-HEAD TIPS — the 4 best match-result plays of the round across NRL + AFL. NO SGM at Bronze.]
─────────────────────────

━━━━━━━━━━━━━━━━━━━━━━━━
🐕 The Punters Den | Good luck legends 🦘
⚠️ Gamble responsibly — 18+ only
━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST 2 — SILVER $10/week
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🐕 THE PUNTERS DEN
Week [X] Silver Tips 🥈

G'day Sharps 👋
Full analysis locked and loaded for the week 🐕👇

─────────────────────────
TIP 1
[Sport] — Round [X] | [Team A] vs [Team B]
📌 Tip: [Selection] | 💰 Best odds: $[odds] @ [Bookmaker] | ⭐ Confidence: [stars]
📊 Analysis: • [point] • [point] • [point] • [point]
─────────────────────────
[EVERYTHING IN BRONZE, PLUS: any extra high-confidence H2H singles (4★+/85%+), PLAYER PROPS, and 1 NRL SGM + 1 AFL SGM (3-4 legs each)]
─────────────────────────

━━━━━━━━━━━━━━━━━━━━━━━━
🐕 The Punters Den | Back the data. Back yourself 🦘
⚠️ Gamble responsibly — 18+ only
━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST 3 — GOLD $20/week
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🐕 THE PUNTERS DEN
Week [X] Den VIP Tips 👑

G'day Den legends 👋
Everything for the week — straight from the den 🐕👇

[ALL BRONZE + SILVER CONTENT — up to 8-10 tips total at Gold level]
[ONE MORE AFL SGM + ONE MORE NRL SGM beyond Silver (so Gold runs 2 AFL + 2 NRL SGMs total) + 1 CROSS-SPORT MULTI]
[1 HERO MULTI 🚀 — the weekly high-odds long-shot, cross-code, 5-7 legs, ~$25-$80. Frame it cheeky but responsible: "small stake, big dream" — clearly a high-risk bit of fun, never a likely winner. Show the legs and the TRUE combined odds.]
[LINE MOVEMENT ALERTS]

━━━━━━━━━━━━━━━━━━━━━━━━
🐕 The Punters Den | You're in the den. Back yourself 👑🦘
⚠️ Gamble responsibly — 18+ only
━━━━━━━━━━━━━━━━━━━━━━━━

INSTRUCTIONS: Write all 4 posts completely with real data. No placeholder text except payment links. Flag anything needing review.

PRE-PUBLISH CHECKLIST — run this on EVERY tip before you output it. If any item fails, do not publish that tip; instead flag it under "⚠️ NEEDS OPERATOR REVIEW" with the reason:
1. PLAYERS: every named player (scorer legs, props) is confirmed active, on a 2026 list, at the club stated, and named this week (per Scout). NO retired, delisted, traded or unconfirmed players — this is the #1 failure to catch.
2. VENUE: the venue and date match what Scout reported for that exact game — don't assume a team's usual home ground (games move to neutral/away/regional venues).
3. ODDS: every price is from Scout's data, at or above $1.50, and SGMs land in the $3–$8 band. (EXEMPT: the Hero Multi is a deliberate high-odds long-shot — its combined price is meant to be well above $8. Just confirm its TRUE combined odds equal the product of its legs.)
4. SGM LEGS: 3–4 legs only; AFL legs use locked-in starters; no margin/hit-out legs; no two legs that can't both be true. (EXEMPT from the 3–4 leg limit: the Hero Multi runs 5–7 legs — but it MUST still pass the PLAYER check, the AFL locked-in-starters rule, and the no-margin-legs rule.)
7. HERO MULTI: exactly one, Gold only, framed as a small-stake high-risk bit of fun (never a likely winner).
5. LINE MOVEMENT: any 10%+ shift Scout flagged is noted in the tip.
6. CONDITIONALS: any tip depending on a late call (Origin clearance, a star resting) is clearly marked ⚠️ CONDITIONAL with the trigger.
End your output with: "✅ Pre-publish checklist run — [N] tips clear, [M] flagged for review."`;

const SCORECARD_PROMPT = `You are The Scorecard, the results agent in The Punters Den pipeline. Each week you settle the tips that were published, verify what actually happened, and hand the operator paste-ready rows for track-record.js plus a short private summary. You do NOT write public or member posts.

STAKING — FLAT 1 UNIT: every tip is 1 unit (1 unit = $10), regardless of confidence or odds; SGMs and multis are 1 unit too. A winner at $1.80 returns +0.8u, a loser -1u.

STEP 1 — GATHER RESULTS:
For every tip published this week (Bronze H2H tips, Silver props + SGMs, Gold extra SGMs + cross-sport multi), use web search to find what actually happened: final scores, and for any player leg the match scorers/stats.

SCORER / STAT-LEG VERIFICATION (do this properly):
For any leg that depends on a specific player (anytime/first try, anytime goal, disposals, run metres, etc.), do a DEDICATED search for that game's scorers/stats — don't rely on the score-only search. Search "[Team] vs [Team] [round] try scorers", "[Player] [stat] [date]", or the match centre. Classify every player leg:
✅ CONFIRMED HIT — clear evidence the player did it
❌ CONFIRMED MISS — you found the list and they are not on it
⚠️ UNVERIFIED — you could not confirm either way

STEP 2 — SETTLE EACH TIP:
- H2H / Line / Prop: win, loss or push.
- SGM / cross-sport multi: wins ONLY if every leg hits. Any CONFIRMED MISS leg = loss. All legs CONFIRMED HIT = win. If one or more legs are ⚠️ UNVERIFIED, do NOT guess — mark the whole multi "pending manual check" and name the exact leg(s) to confirm. NEVER record an unverified multi as a loss.

STEP 3 — OUTPUT (two parts only, nothing else):

PART A — TRACK-RECORD ROWS
Paste-ready rows for track-record.js, NEWEST AT TOP. One JS object per settled tip, in EXACTLY this format:
{ rd: "R[X] · [Mon D]", code: "NRL|AFL|CROSS", match: "Team v Team", type: "H2H|Line|SGM|Prop", sel: "selection", odds: 0.00, result: "win|loss|push" }
Rules:
- odds is a NUMBER (e.g. 1.70), never a string.
- code: "NRL" | "AFL" | "CROSS" (CROSS = the cross-sport multi). type: "H2H" | "Line" | "SGM" | "Prop" (use "SGM" for the cross-sport multi).
- Output a row only for tips you could SETTLE. Anything "pending manual check" gets NO row — list it in Part B instead.
- DO NOT include the Hero Multi in track-record.js. It is a deliberate fun long-shot, not a value play; putting it in the official record would unfairly drag the win-rate. Note its result in Part B only.

PART B — PRIVATE OPERATOR SUMMARY (for the operator's eyes — not for publishing)
Keep it short:
- This week: [W]-[L] settled — [X] H2H, [Y] SGM, [Z] prop. Units: [+/-X.X]u flat.
- Pending manual check: [each unsettled multi + the exact leg(s) to confirm], or "none".
- Notes: anything that stood out (a leg that nearly busted an SGM, a result worth a look).
- Hero Multi (info only, NOT in the record): [hit / missed].
Do NOT calculate or publish a public win-rate or ROI — the site hides those until 20 results are banked, so they are not for posting yet. Report H2H cleanly so an unverified multi leg never hides a settled H2H result. Be honest about losses.`;

const BACKTEST_PROMPT = `You are the Backtest Engine for The Punters Den — a tool to evaluate how the tipping pipeline WOULD HAVE performed on a past round. This is for internal testing only, never for publishing.

You will run in TWO STRICT PHASES. Do not skip ahead.

CRITICAL ANTI-HINDSIGHT RULE: You are being tested on whether the tipping logic is sound. You MUST generate tips using ONLY information that was available BEFORE the games kicked off — pre-game odds, ladder position going in, form going in, team news as it was known pre-game. You must NOT use the actual result to influence which way you tip. Tipping a team because you know they won is cheating the test and makes it worthless. Tip honestly as if the games had not yet been played.

PHASE 1 — GENERATE TIPS (pre-game only):
For the specified past round, use web search to find the PRE-GAME data for every game: the teams, venue, date, the pre-game odds from bookmakers, ladder positions going into that round, recent form going in, and known team news/injuries before kickoff. Then apply The Punters Den tipping rules exactly as the live Analyst would:

TEAM RULES (1pt each): recent form, H2H record, form vs this opponent, ladder/stakes, opponent injuries.
PLAYER RULES (1pt each): scoring rate, H2H rate, hot streak, position matchup, home ground.
CONFIDENCE: 3⭐ = Bronze min, 4⭐ = Silver+Gold, 5⭐ = priority. Only tip avg odds $1.50+.

STAKING — FLAT 1 UNIT: Use flat staking for all calculations. EVERY tip is exactly 1 unit (1 unit = $10), regardless of confidence or odds. SGMs are also 1 unit each. Do not vary stake by confidence. A winning tip at $1.80 returns 0.8 units profit; a loser is -1 unit. ROI = total units profit/loss ÷ total units staked × 100. This gives a clean, honest baseline.

Produce a clear tip list: for each game you would have tipped, give the selection, the odds you would have taken, confidence stars, and which rules fired. Include SGMs (3-4 legs each) for any 4+ star games. Be realistic — only tip what genuinely scored 3+ stars on pre-game data. Follow the Lean & Premium model: quality over volume, don't pad with weak tips.

SGM LEG CONSTRUCTION (AVOID MARGIN LEGS — proven by prior backtesting): The #1 SGM killer is winning-margin legs. When the H2H read is right, favourites win comfortably (often by 20-35), so even conservative margin bands (1-12, 1-18) get blown out by the blowouts good H2H logic predicts. DO NOT use margin legs by default. Build SGMs from: (1) the match winner as anchor, (2) a high-volume in-form try/goal scorer, (3) a second distinct scorer or "score-or-assist" leg, (4) a total-points leg leaned to the genuinely safe side — and note that in expected-blowout games an OVER is SAFER than an under. Only use a margin leg in a genuinely close game (H2H fav $1.80+), never on a short-priced favourite. Never pair "win" + "margin" for the same team. Also AVOID volatile count-based legs — for ruckmen do NOT use hit-out legs (opponent ruck can dominate the count even in a win); use disposals or anytime-goal instead. Prefer player-driven legs (scorers, disposals, run metres) over opponent-dependent counts. Build 3-4 legs (4 preferred, 3 minimum; the total-points leg is the one to drop for a 3-leg SGM). If you can't build at least 3 strong non-margin legs, build fewer SGMs.

PHASE 2 — COMPARE TO ACTUAL RESULTS:
Now use web search to find what ACTUALLY happened in every game you tipped — final scores, whether each tip won or lost, and whether SGM legs hit.

TRY/GOAL SCORER VERIFICATION (important — do this properly):
For any SGM leg that depends on a specific player scoring (try scorer, goal scorer, anytime scorer, first scorer), you MUST do a DEDICATED search for that game's scorers/match stats — don't rely on the score-only search. Search specifically for things like "[Team] vs [Team] [round] try scorers" or "[Player] try [date]" or the match centre / match report. Try hard to confirm each player leg.

Then classify EVERY player-scorer leg into one of three states:
✅ CONFIRMED HIT — you found clear evidence the player scored/assisted as required
❌ CONFIRMED MISS — you found the scorer list and the player is NOT on it
⚠️ UNVERIFIED — you genuinely could not confirm either way from search

Be honest about which state each leg is in. Do NOT guess or assume.

SCORING THE SGMs — produce TWO versions so the result is trustworthy:
1. VERIFIED-ONLY result: count only legs you could CONFIRM. If any leg is ⚠️ UNVERIFIED, mark the whole SGM as "UNVERIFIED — manual check needed" and list exactly which legs to check.
2. The match-outcome legs (win / winning margin / total points) are ALWAYS verifiable from the final score — confirm those definitively.

This way the operator gets a trustworthy number plus a short list of player legs to verify themselves (which takes seconds).

CRITICAL — REPORT H2H AND SGMs SEPARATELY:
The H2H (match winner) tips are always fully verifiable and are the most reliable measure of the system. ALWAYS report the H2H record and ROI as its own clean number FIRST. Then report SGMs separately. NEVER let unverified SGM player legs drag down or hide the H2H result — they are different things measured to different levels of certainty.

Also: do NOT report a negative ROI caused purely by ⚠️ UNVERIFIED legs as if it were a real loss. If an SGM is unverified, present its result as "pending manual check," not as a confirmed loss. Show what the ROI would be IF the unverified legs hit, and IF they missed, so the operator sees the real range.

OUTPUT FORMAT:
═══════════════════════════════════════
🧪 BACKTEST RESULTS — [NRL/AFL] [ROUND] [YEAR]
⚠️ INTERNAL TESTING ONLY — NOT FOR PUBLISHING
═══════════════════════════════════════

📋 TIPS WE WOULD HAVE MADE (pre-game logic):
[For each tip: Game | Selection | Odds | Confidence | Rules fired]

🎯 SGMs WE WOULD HAVE BUILT:
[Each SGM with legs and combined odds]

───────────────────────────────────────
✅ HOW WE WOULD HAVE DONE:
[For each H2H tip: ✅ WON / ❌ LOST | Selection | Final score | Odds]
[For each SGM: leg-by-leg result using ✅ HIT / ❌ MISS / ⚠️ UNVERIFIED for each leg, then overall]

⚠️ LEGS TO VERIFY MANUALLY:
[List any ⚠️ UNVERIFIED player-scorer legs so the operator can confirm them — e.g. "Storm v Tigers SGM: confirm Munster scored/assisted"]

───────────────────────────────────────
📊 BACKTEST SUMMARY:
H2H Tips placed: [X] | Won: [X] | Lost: [X] | Win rate: [X]%
H2H Units staked: [X] | Units returned: [X] | Profit/loss: [+/- X units]

SGMs placed: [X]
• Fully confirmed: [X] won / [X] lost
• Match-outcome legs (always verifiable): [X] of [X] hit
• Unverified player legs: [X] (need manual check)
SGM profit/loss (verified only): [+/- X units]

COMBINED (H2H + confirmed SGMs only): [+/- X units] | ROI [+/- X]%
NOTE: This excludes unverified player legs. Real result may be higher once
you confirm those manually.

IF UNVERIFIED LEGS ALL HIT: [+/- X units] | ROI [+/- X]% (best case)
IF UNVERIFIED LEGS ALL MISS: [+/- X units] | ROI [+/- X]% (worst case)
Your real result sits between these two — confirm the flagged legs to know exactly.

Best tip: [selection @ odds — result]
Worst miss: [selection that lost despite high confidence]

───────────────────────────────────────
🔍 ANALYSIS — IS THE LOGIC SOUND?
• Did high-confidence (4-5⭐) tips win more often than low? [insight]
• How did the H2H tips perform (this is the most reliable signal)? [insight]
• Any rules that consistently led to losses? [insight]
• Were the odds we targeted realistic/available? [insight]
• Overall verdict on whether the tipping rules are working: [honest assessment]
═══════════════════════════════════════

Be brutally honest. The point of a backtest is to find weaknesses, not to look good. If the picks would have lost money, say so clearly. Keep H2H results (fully verifiable) separate from SGM results (player legs may be unverified) so the operator can trust the H2H numbers completely.`;

// ─── API HELPER ───────────────────────────────────────────────────────────────

async function callClaude({ systemPrompt, userMessage, useWebSearch = false, maxTokens = 8000, maxTurns = 16 }) {
  const messages = [{ role: "user", content: userMessage }];
  let finalText = "";

  for (let turn = 0; turn < maxTurns; turn++) {
    const body = {
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    };
    if (useWebSearch) body.tools = [{ type: "web_search_20250305", name: "web_search" }];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err?.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    const text = data.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
    if (text) finalText += (finalText && text ? "\n" : "") + text;

    if (data.stop_reason === "end_turn") break;

    if (data.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: data.content });
      const results = data.content
        .filter((b) => b.type === "tool_use")
        .map((b) => ({ type: "tool_result", tool_use_id: b.id, content: b.input?.query ? `Search executed: "${b.input.query}"` : "Tool executed." }));
      messages.push({ role: "user", content: results });
      continue;
    }

    if (data.stop_reason === "max_tokens") {
      // Response was cut off — ask it to continue from where it stopped
      messages.push({ role: "assistant", content: data.content });
      messages.push({ role: "user", content: "Continue exactly where you left off. Do not repeat anything you've already written." });
      continue;
    }

    break;
  }
  if (!finalText) throw new Error("No response returned. Please try again.");
  return finalText;
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

function StatusTracker({ steps, currentStep }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 420, margin: "0 auto" }}>
      {steps.map((step, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: 8,
          background: i === currentStep ? "#1a1a2e" : i < currentStep ? "#0d1f0d" : "#0a0a0a",
          border: `1px solid ${i === currentStep ? "#e94560" : i < currentStep ? "#2d5a2d" : "#1a1a1a"}`,
          transition: "all 0.3s",
        }}>
          <span>{i < currentStep ? "✅" : i === currentStep ? "⏳" : "⬜"}</span>
          <span style={{ fontSize: 13, color: i === currentStep ? "#fff" : i < currentStep ? "#6bcf6b" : "#555" }}>{step}</span>
        </div>
      ))}
    </div>
  );
}

// ── export helpers: download any agent output as a timestamped .txt ──
function exportStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}${pad(d.getMinutes())}`;
  const human = d.toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
  return { date, time, human };
}
function downloadText(baseName, text) {
  const { date, time, human } = exportStamp();
  const header = `The Punters Den — ${baseName}\nExported: ${human}\n${"=".repeat(48)}\n\n`;
  const blob = new Blob([header + (text || "")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `punters-den-${baseName}-${date}-${time}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function OutputBox({ text, onCopy, copied, exportName }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 10 }}>
        {exportName && (
          <button onClick={() => downloadText(exportName, text)} style={{
            background: "#0d2818", color: "#6bcf6b", border: "1px solid #1f5132",
            borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600,
          }}>
            ⬇️ Export
          </button>
        )}
        <button onClick={onCopy} style={{
          background: "#1a1a2e", color: "#7eb3ff", border: "1px solid #0f3460",
          borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600,
        }}>
          {copied ? "✅ Copied!" : "📋 Copy"}
        </button>
      </div>
      <div style={{
        background: "#0d0d0d", border: "1px solid #222", borderRadius: 10, padding: 20,
        fontFamily: "'Courier New', monospace", fontSize: 13, lineHeight: 1.8,
        color: "#d4d4d4", whiteSpace: "pre-wrap", maxHeight: "60vh", overflowY: "auto",
      }}>
        {text}
      </div>
    </div>
  );
}

function RunButton({ onClick, disabled, label, loading }) {
  return (
    <button onClick={onClick} disabled={disabled || loading} style={{
      background: disabled || loading ? "#222" : "linear-gradient(135deg, #e94560, #c73652)",
      color: disabled || loading ? "#555" : "#fff",
      border: "none", borderRadius: 8, padding: "14px 32px",
      fontSize: 15, fontWeight: 700,
      cursor: disabled || loading ? "not-allowed" : "pointer",
      width: "100%", marginTop: 16,
    }}>
      {loading ? "⏳ Running..." : label}
    </button>
  );
}

function Textarea({ value, onChange, placeholder, rows = 10 }) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      style={{
        width: "100%", background: "#0d0d0d", border: "1px solid #333", borderRadius: 8,
        padding: 14, color: "#d4d4d4", fontSize: 13, fontFamily: "'Courier New', monospace",
        lineHeight: 1.7, resize: "vertical", boxSizing: "border-box", outline: "none",
      }}
    />
  );
}

// ─── SCOUT AGENT ─────────────────────────────────────────────────────────────

function ScoutAgent({ onComplete }) {
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(-1);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Pre-flight confirmation state
  const [confirmed, setConfirmed] = useState(false);
  const [nrlRound, setNrlRound] = useState("");
  const [aflRound, setAflRound] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const today = new Date().toLocaleDateString("en-AU", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Australia/Sydney" });

  const steps = ["🏉 Searching NRL fixtures & ladder...", "🏈 Searching AFL fixtures & ladder...", "💰 Fetching odds from all bookmakers...", "🏥 Gathering team news & injuries...", "📈 Checking line movement...", "📋 Compiling Scout report..."];

  const canConfirm = nrlRound.trim() && aflRound.trim() && year.trim();

  const run = async () => {
    setLoading(true); setOutput(""); setError(""); setStep(0);
    const interval = setInterval(() => setStep((p) => p < steps.length - 1 ? p + 1 : p), 8000);

    try {
      const result = await callClaude({
        systemPrompt: SCOUT_PROMPT,
        userMessage: `Today's date is ${today} (AEST).

CONFIRMED ROUND DETAILS (operator verified — use these exactly, do not guess or substitute):
- NRL ${nrlRound.trim()} ${year.trim()}
- AFL ${aflRound.trim()} ${year.trim()}

Run the full Scout data gather for these specific rounds. Use web search to find all fixtures, ladder standings, team news, injuries, and odds from Sportsbet, TAB, Ladbrokes and Pointsbet. Present everything in the exact format specified.`,
        useWebSearch: true,
      });
      clearInterval(interval);
      setOutput(result);
      if (onComplete) onComplete(result);
    } catch (e) {
      clearInterval(interval);
      setError(e.message);
    } finally {
      setLoading(false); setStep(-1);
    }
  };

  const copy = () => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const resetConfirm = () => { setConfirmed(false); setOutput(""); setError(""); setNrlRound(""); setAflRound(""); };

  return (
    <div>
      {/* PRE-FLIGHT CHECK — shown before confirmation */}
      {!confirmed && !output && (
        <div style={{ background: "#111", border: "2px solid #f97316", borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 28 }}>✈️</span>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, color: "#fff" }}>Pre-Flight Check — Confirm Rounds</h2>
              <p style={{ margin: 0, fontSize: 12, color: "#f97316" }}>Verify round details before running to avoid wasting API credits</p>
            </div>
          </div>

          <div style={{ background: "#1a0e00", border: "1px solid #f9731633", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 13, color: "#fb923c", lineHeight: 1.6 }}>
              ⚠️ <strong>Why this matters:</strong> The AI may guess the wrong round number or dates. Confirm below before running so the Scout searches for the right games. Example: NRL Magic Round is Round 12, not a separate event.
            </p>
          </div>

          {/* Year */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "#aaa", display: "block", marginBottom: 6 }}>Season Year *</label>
            <input value={year} onChange={(e) => setYear(e.target.value)}
              placeholder="e.g. 2026"
              style={{ width: 120, background: "#0a0a0a", border: "1px solid #333", borderRadius: 6, padding: "9px 12px", color: "#fff", fontSize: 14, fontWeight: 700, outline: "none" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 20 }}>
            {/* NRL */}
            <div style={{ background: "#0d1f3c", border: "1px solid #1d4ed8", borderRadius: 10, padding: 18 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#3b82f6" }}>🏉 NRL Round</h3>
              <input value={nrlRound} onChange={(e) => setNrlRound(e.target.value)}
                placeholder="e.g. Magic Round  or  Round 12"
                style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: 6, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box", outline: "none" }} />
            </div>

            {/* AFL */}
            <div style={{ background: "#1a0d2e", border: "1px solid #7c3aed", borderRadius: 10, padding: 18 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#a855f7" }}>🏈 AFL Round</h3>
              <input value={aflRound} onChange={(e) => setAflRound(e.target.value)}
                placeholder="e.g. Round 11"
                style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: 6, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box", outline: "none" }} />
            </div>
          </div>

          {/* Preview */}
          {canConfirm && (
            <div style={{ background: "#0a1a0a", border: "1px solid #2d5a2d", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
              <p style={{ margin: "0 0 6px", fontSize: 12, color: "#6bcf6b", fontWeight: 700 }}>✅ Scout will search for:</p>
              <p style={{ margin: "0 0 4px", fontSize: 13, color: "#aaa" }}>🏉 NRL {nrlRound} {year}</p>
              <p style={{ margin: 0, fontSize: 13, color: "#aaa" }}>🏈 AFL {aflRound} {year}</p>
            </div>
          )}

          <button
            onClick={() => setConfirmed(true)}
            disabled={!canConfirm}
            style={{
              background: canConfirm ? "linear-gradient(135deg, #e94560, #c73652)" : "#222",
              color: canConfirm ? "#fff" : "#555",
              border: "none", borderRadius: 8, padding: "13px 28px",
              fontSize: 15, fontWeight: 700,
              cursor: canConfirm ? "pointer" : "not-allowed",
              width: "100%",
            }}>
            {canConfirm ? "✅ Confirmed — Proceed to Scout" : "Fill in round details above to continue"}
          </button>
        </div>
      )}

      {/* CONFIRMED — ready to run */}
      {confirmed && !loading && !output && (
        <div>
          <div style={{ background: "#0a1a0a", border: "1px solid #2d5a2d", borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: "0 0 8px", fontSize: 13, color: "#6bcf6b", fontWeight: 700 }}>✅ Round details confirmed</p>
                <p style={{ margin: "0 0 4px", fontSize: 13, color: "#aaa" }}>🏉 NRL {nrlRound} {year}</p>
                <p style={{ margin: 0, fontSize: 13, color: "#aaa" }}>🏈 AFL {aflRound} {year}</p>
              </div>
              <button onClick={resetConfirm} style={{ background: "none", border: "1px solid #333", borderRadius: 6, color: "#666", padding: "6px 12px", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}>
                ✏️ Edit
              </button>
            </div>
          </div>

          <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 17, color: "#fff" }}>🏉🏈 Ready to Scout</h2>
            <p style={{ margin: "0 0 14px", color: "#aaa", fontSize: 13, lineHeight: 1.7 }}>
              Searches the web for all NRL & AFL fixtures, ladder, team news, injuries and odds from <strong style={{ color: "#fff" }}>Sportsbet, TAB, Ladbrokes & Pointsbet</strong>. Flags any 10%+ line movement.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["NRL Fixtures & Ladder", "AFL Fixtures & Ladder", "Team News", "Multi-Bookie Odds", "Line Movement", "SGM Markets"].map(t => (
                <span key={t} style={{ background: "#0d1f3c", border: "1px solid #1d4ed8", borderRadius: 20, padding: "3px 10px", fontSize: 11, color: "#3b82f6" }}>{t}</span>
              ))}
            </div>
          </div>

          <button onClick={run} style={{
            background: "linear-gradient(135deg, #e94560, #c73652)", color: "#fff",
            border: "none", borderRadius: 8, padding: "14px 32px", fontSize: 15, fontWeight: 700,
            cursor: "pointer", width: "100%",
          }}>🚀 Run Scout Agent</button>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: "28px 24px", marginBottom: 20, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>🔍</div>
          <h3 style={{ margin: "0 0 6px", color: "#fff" }}>Scout is on the hunt...</h3>
          <p style={{ margin: "0 0 20px", fontSize: 12, color: "#3b82f6" }}>🏉 NRL {nrlRound} {year} &nbsp;|&nbsp; 🏈 AFL {aflRound} {year}</p>
          <StatusTracker steps={steps} currentStep={step} />
          <p style={{ marginTop: 16, fontSize: 12, color: "#555" }}>Takes 30–60 seconds — searching multiple sources...</p>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div style={{ background: "#1a0a0a", border: "1px solid #e94560", borderRadius: 10, padding: "16px 20px", marginBottom: 16 }}>
          <p style={{ margin: "0 0 8px", color: "#e94560", fontWeight: 700 }}>⚠️ Error</p>
          <p style={{ margin: "0 0 12px", color: "#aaa", fontSize: 13 }}>{error}</p>
          <button onClick={run} style={{ background: "#e94560", color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", cursor: "pointer", fontWeight: 600 }}>🔄 Try Again</button>
        </div>
      )}

      {/* OUTPUT */}
      {output && (
        <div>
          <div style={{ background: "#0a1a0a", border: "1px solid #2d5a2d", borderRadius: 10, padding: "12px 16px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ margin: 0, fontSize: 13, color: "#6bcf6b" }}>✅ Scout report complete — 🏉 NRL {nrlRound} {year} | 🏈 AFL {aflRound} {year}</p>
            <button onClick={resetConfirm} style={{ background: "none", border: "1px solid #333", borderRadius: 6, color: "#666", padding: "5px 10px", cursor: "pointer", fontSize: 11 }}>🔄 New Run</button>
          </div>
          <OutputBox text={output} onCopy={copy} copied={copied} exportName="scout" />
        </div>
      )}
    </div>
  );
}

// ─── ANALYST AGENT ────────────────────────────────────────────────────────────

function AnalystAgent({ prefillData, onComplete }) {
  const [input, setInput] = useState(prefillData || "");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(-1);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const today = new Date().toLocaleDateString("en-AU", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Australia/Sydney" });

  const steps = ["📋 Applying tipping rules...", "⭐ Scoring confidence...", "💰 Checking bookmaker value...", "🎯 Building SGMs...", "📊 Sorting by tier...", "📝 Compiling report..."];

  const run = async () => {
    if (!input.trim()) { setError("Please paste the Scout report first."); return; }
    setLoading(true); setOutput(""); setError(""); setStep(0);
    const interval = setInterval(() => setStep((p) => p < steps.length - 1 ? p + 1 : p), 7000);
    try {
      const result = await callClaude({
        systemPrompt: ANALYST_PROMPT,
        userMessage: `Today's date is ${today} (AEST).\n\nScout report:\n\n${input}\n\nRun the full Analyst process. Apply all rules, score every game, build SGMs and produce the complete tiered tips report in the exact format specified.`,
      });
      clearInterval(interval);
      setOutput(result);
      if (onComplete) onComplete(result);
    } catch (e) {
      clearInterval(interval);
      setError(e.message);
    } finally {
      setLoading(false); setStep(-1);
    }
  };

  const copy = () => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div>
      <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 17, color: "#fff" }}>📊 Paste Scout Report</h2>
        <p style={{ margin: "0 0 12px", color: "#aaa", fontSize: 13 }}>
          {prefillData ? "✅ Scout report auto-loaded from this session." : "Run the Scout agent first, then paste the report below."}
        </p>
        <Textarea value={input} onChange={setInput} placeholder="Paste the Scout report here..." rows={8} />
        <p style={{ margin: "6px 0 0", fontSize: 12, color: input.length > 100 ? "#6bcf6b" : "#555" }}>
          {input.length > 100 ? `✅ ${input.length.toLocaleString()} characters loaded` : "Waiting for Scout data..."}
        </p>
      </div>

      {error && !loading && (
        <div style={{ background: "#1a0a0a", border: "1px solid #e94560", borderRadius: 10, padding: "14px 20px", marginBottom: 16 }}>
          <p style={{ margin: "0 0 4px", color: "#e94560", fontWeight: 700 }}>⚠️ Error</p>
          <p style={{ margin: 0, color: "#aaa", fontSize: 13 }}>{error}</p>
        </div>
      )}

      {loading && (
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: "28px 24px", marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>🧠</div>
          <h3 style={{ margin: "0 0 20px", color: "#fff" }}>Analyst crunching the numbers...</h3>
          <StatusTracker steps={steps} currentStep={step} />
          <p style={{ marginTop: 16, fontSize: 12, color: "#555" }}>Takes 20–40 seconds...</p>
        </div>
      )}

      <RunButton onClick={run} disabled={!input.trim()} loading={loading} label="🧠 Run Analyst Agent" />

      {output && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ margin: "0 0 12px", color: "#6bcf6b", fontSize: 15 }}>✅ Analysis Complete</h3>
          <OutputBox text={output} onCopy={copy} copied={copied} exportName="analyst" />
        </div>
      )}
    </div>
  );
}

// ─── PUBLISHER AGENT ──────────────────────────────────────────────────────────

function PublisherAgent({ prefillData, onComplete }) {
  const [input, setInput] = useState(prefillData || "");
  const [posts, setPosts] = useState({ bronze: "", silver: "", gold: "" });
  const [activePost, setActivePost] = useState("bronze");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(-1);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [done, setDone] = useState(false);

  const today = new Date().toLocaleDateString("en-AU", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Australia/Sydney" });
  const steps = ["🥉 Writing Bronze post...", "🥈 Writing Silver post...", "👑 Writing Gold VIP post...", "🔍 Flagging review items..."];

  const splitPosts = (text) => {
    const p = { bronze: "", silver: "", gold: "" };
    const bronze = text.match(/(?:POST 1[^\n]*\n|Week \d+ Bronze Tips[\s\S]*?)(?=POST 2|Week \d+ Silver|$)/i);
    const silver = text.match(/(?:POST 2[^\n]*\n|Week \d+ Silver Tips[\s\S]*?)(?=POST 3|Week \d+ Den VIP|$)/i);
    const gold = text.match(/(?:POST 3[^\n]*\n|Week \d+ Den VIP[\s\S]*)/i);
    const b2 = text.match(/🐕 THE PUNTERS DEN\s*\nWeek \d+ Bronze[\s\S]*?(?=🐕 THE PUNTERS DEN\s*\nWeek \d+ Silver|$)/i);
    const s2 = text.match(/🐕 THE PUNTERS DEN\s*\nWeek \d+ Silver[\s\S]*?(?=🐕 THE PUNTERS DEN\s*\nWeek \d+ Den VIP|$)/i);
    const g2 = text.match(/🐕 THE PUNTERS DEN\s*\nWeek \d+ Den VIP[\s\S]*/i);
    p.bronze = (b2 || bronze)?.[0]?.trim() || "";
    p.silver = (s2 || silver)?.[0]?.trim() || "";
    p.gold = (g2 || gold)?.[0]?.trim() || "";
    if (!p.bronze && !p.silver && !p.gold) p.bronze = text;
    return p;
  };

  const run = async () => {
    if (!input.trim()) { setError("Please paste the Analyst report first."); return; }
    setLoading(true); setError(""); setDone(false); setStep(0);
    const interval = setInterval(() => setStep((p) => p < steps.length - 1 ? p + 1 : p), 8000);
    try {
      const result = await callClaude({
        systemPrompt: PUBLISHER_PROMPT,
        userMessage: `Today's date is ${today} (AEST).\n\nAnalyst report:\n\n${input}\n\nWrite all 3 posts — Bronze, Silver and Gold — using the exact formats. Real data only. Flag anything needing review.`,
      });
      clearInterval(interval);
      const split = splitPosts(result);
      setPosts(split);
      setDone(true);
      setActivePost("bronze");
      if (onComplete) onComplete(result);
    } catch (e) {
      clearInterval(interval);
      setError(e.message);
    } finally {
      setLoading(false); setStep(-1);
    }
  };

  const copy = (key, text) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 2000); };

  const postTabs = [
    { key: "bronze", label: "🥉 Bronze", color: "#cd7f32", border: "#cd7f32", bg: "#1a1200" },
    { key: "silver", label: "🥈 Silver", color: "#bbb", border: "#888", bg: "#141414" },
    { key: "gold", label: "👑 Gold", color: "#ffd700", border: "#ffd700", bg: "#1a1500" },
  ];

  return (
    <div>
      <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 17, color: "#fff" }}>📣 Paste Analyst Report</h2>
        <p style={{ margin: "0 0 12px", color: "#aaa", fontSize: 13 }}>
          {prefillData ? "✅ Analyst report auto-loaded from this session." : "Run the Analyst agent first, then paste the report below."}
        </p>
        <Textarea value={input} onChange={setInput} placeholder="Paste the Analyst report here..." rows={8} />
        <p style={{ margin: "6px 0 0", fontSize: 12, color: input.length > 100 ? "#6bcf6b" : "#555" }}>
          {input.length > 100 ? `✅ ${input.length.toLocaleString()} characters loaded` : "Waiting..."}
        </p>
      </div>

      {error && !loading && (
        <div style={{ background: "#1a0a0a", border: "1px solid #e94560", borderRadius: 10, padding: "14px 20px", marginBottom: 16 }}>
          <p style={{ margin: "0 0 4px", color: "#e94560", fontWeight: 700 }}>⚠️ Error</p>
          <p style={{ margin: 0, color: "#aaa", fontSize: 13 }}>{error}</p>
        </div>
      )}

      {loading && (
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: "28px 24px", marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>✍️</div>
          <h3 style={{ margin: "0 0 20px", color: "#fff" }}>Publisher writing posts...</h3>
          <StatusTracker steps={steps} currentStep={step} />
          <p style={{ marginTop: 16, fontSize: 12, color: "#555" }}>Takes 20–40 seconds...</p>
        </div>
      )}

      <RunButton onClick={run} disabled={!input.trim()} loading={loading} label="✍️ Run Publisher Agent" />

      {done && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ margin: "0 0 14px", color: "#6bcf6b", fontSize: 15 }}>✅ All 4 Posts Ready</h3>
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {postTabs.map((t) => (
              <button key={t.key} onClick={() => setActivePost(t.key)} style={{
                background: activePost === t.key ? t.bg : "#111",
                color: activePost === t.key ? t.color : "#555",
                border: `1px solid ${activePost === t.key ? t.border : "#222"}`,
                borderRadius: 6, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: activePost === t.key ? 700 : 400,
              }}>{t.label}</button>
            ))}
          </div>
          {postTabs.map((t) => activePost === t.key && (
            <div key={t.key}>
              <div style={{ background: "#17212b", border: `1px solid ${t.border}33`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ background: t.bg, borderBottom: `1px solid ${t.border}44`, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: t.color, fontWeight: 600 }}>📱 Member Area Preview</span>
                  <div style={{ display: "flex", gap: 6 }}><button onClick={() => downloadText("publisher-" + t.key, posts[t.key])} style={{ background: "transparent", color: t.color, border: `1px solid ${t.border}`, borderRadius: 5, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>⬇️ Export</button><button onClick={() => copy(t.key, posts[t.key])} style={{
                    background: "transparent", color: t.color, border: `1px solid ${t.border}`, borderRadius: 5,
                    padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                  }}>{copied === t.key ? "✅ Copied!" : "📋 Copy"}</button></div>
                </div>
                <div style={{ padding: 18, fontFamily: "'Courier New', monospace", fontSize: 13, lineHeight: 1.85, color: "#e0e0e0", whiteSpace: "pre-wrap", maxHeight: "55vh", overflowY: "auto" }}>
                  {posts[t.key] || "No content."}
                </div>
              </div>
              <p style={{ fontSize: 11, color: "#555", marginTop: 8 }}>☝️ Review before posting. Operator approval required.</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SCORECARD AGENT ──────────────────────────────────────────────────────────

function ScorecardAgent({ prefillAnalyst }) {
  const [analystInput, setAnalystInput] = useState(prefillAnalyst || "");
  const [results, setResults] = useState("");
  const [season, setSeason] = useState("");
  const [posts, setPosts] = useState({ rows: "", summary: "" });
  const [activePost, setActivePost] = useState("rows");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(-1);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [done, setDone] = useState(false);

  const today = new Date().toLocaleDateString("en-AU", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Australia/Sydney" });
  const steps = ["📋 Settling each tip...", "🔎 Verifying scorer / SGM legs...", "🧾 Building track-record rows...", "🗒 Writing your summary..."];

  const splitPosts = (text) => {
    const a = text.match(/PART A[\s\S]*?(?=PART B|$)/i);
    const b = text.match(/PART B[\s\S]*/i);
    const rows = a?.[0]?.trim() || text;
    const summary = b?.[0]?.trim() || "";
    return { rows, summary };
  };

  const run = async () => {
    if (!analystInput.trim()) { setError("Please paste the Analyst report."); return; }
    if (!results.trim()) { setError("Please enter this week's results."); return; }
    setLoading(true); setError(""); setDone(false); setStep(0);
    const interval = setInterval(() => setStep((p) => p < steps.length - 1 ? p + 1 : p), 7000);
    try {
      const seasonCtx = season.trim() ? `\n\nSEASON HISTORY:\n${season}` : "\n\nSEASON HISTORY: Week 1 — season stats start now.";
      const result = await callClaude({
        systemPrompt: SCORECARD_PROMPT,
        userMessage: `Today's date is ${today} (AEST — Monday results review).\n\nANALYST REPORT:\n${analystInput}\n\nRESULTS:\n${results}${seasonCtx}\n\nRun the Scorecard: settle every tip, verify the scorer/SGM legs, then output Part A (paste-ready track-record.js rows) and Part B (private summary).`,
      });
      clearInterval(interval);
      setPosts(splitPosts(result));
      setDone(true);
      setActivePost("rows");
    } catch (e) {
      clearInterval(interval);
      setError(e.message);
    } finally {
      setLoading(false); setStep(-1);
    }
  };

  const copy = (key, text) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 2000); };

  const postTabs = [
    { key: "rows", label: "🧾 track-record rows", color: "#2fd27a", border: "#2fd27a", bg: "#0d1a12" },
    { key: "summary", label: "🗒 Summary (private)", color: "#f5c542", border: "#f5c542", bg: "#1a1500" },
  ];

  return (
    <div>
      <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 17, color: "#fff" }}>Step 1 — Analyst Report</h2>
        <p style={{ margin: "0 0 10px", color: "#aaa", fontSize: 13 }}>
          {prefillAnalyst ? "✅ Auto-loaded from this session." : "Paste this week's Analyst report."}
        </p>
        <Textarea value={analystInput} onChange={setAnalystInput} placeholder="Paste Analyst report..." rows={6} />
      </div>

      <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 17, color: "#fff" }}>Step 2 — This Week's Results</h2>
        <p style={{ margin: "0 0 10px", color: "#aaa", fontSize: 13 }}>Enter each result on a new line.</p>
        <Textarea value={results} onChange={setResults}
          placeholder={"Panthers won 24-12 — tip was Panthers -6.5 line — WON ✅\nSwans won by 45 — tip was Swans -20.5 line — WON ✅\nSGM — Panthers win + Smith anytime try + over 44.5 — LOST ❌"}
          rows={7} />
      </div>

      <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 17, color: "#fff" }}>
          Step 3 — Season History <span style={{ color: "#555", fontWeight: 400, fontSize: 13 }}>(optional)</span>
        </h2>
        <p style={{ margin: "0 0 10px", color: "#aaa", fontSize: 13 }}>Optional — paste your running record so the summary can note the tally. (The site still hides win-rate/ROI until 20 results are banked.)</p>
        <Textarea value={season} onChange={setSeason}
          placeholder={"Settled so far: 12 (7-5)\nNRL 4-2 · AFL 3-3\nSGMs: 1-3"}
          rows={5} />
        <p style={{ margin: "6px 0 0", fontSize: 11, color: "#555" }}>Leave blank if Week 1.</p>
      </div>

      {error && !loading && (
        <div style={{ background: "#1a0a0a", border: "1px solid #e94560", borderRadius: 10, padding: "14px 20px", marginBottom: 16 }}>
          <p style={{ margin: "0 0 4px", color: "#e94560", fontWeight: 700 }}>⚠️ Error</p>
          <p style={{ margin: 0, color: "#aaa", fontSize: 13 }}>{error}</p>
        </div>
      )}

      {loading && (
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: "28px 24px", marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>📊</div>
          <h3 style={{ margin: "0 0 20px", color: "#fff" }}>Scorecard crunching results...</h3>
          <StatusTracker steps={steps} currentStep={step} />
          <p style={{ marginTop: 16, fontSize: 12, color: "#555" }}>Takes 20–40 seconds...</p>
        </div>
      )}

      <RunButton onClick={run} disabled={!analystInput.trim() || !results.trim()} loading={loading} label="📊 Run Scorecard Agent" />

      {done && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ margin: "0 0 14px", color: "#6bcf6b", fontSize: 15 }}>✅ All 3 Scorecard Posts Ready</h3>
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {postTabs.map((t) => (
              <button key={t.key} onClick={() => setActivePost(t.key)} style={{
                background: activePost === t.key ? t.bg : "#111",
                color: activePost === t.key ? t.color : "#555",
                border: `1px solid ${activePost === t.key ? t.border : "#222"}`,
                borderRadius: 6, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: activePost === t.key ? 700 : 400,
              }}>{t.label}</button>
            ))}
          </div>
          {postTabs.map((t) => activePost === t.key && (
            <div key={t.key}>
              <div style={{ background: "#17212b", border: `1px solid ${t.border}33`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ background: t.bg, borderBottom: `1px solid ${t.border}44`, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: t.color, fontWeight: 600 }}>📱 Member Area Preview</span>
                  <div style={{ display: "flex", gap: 6 }}><button onClick={() => downloadText("scorecard-" + t.key, posts[t.key])} style={{ background: "transparent", color: t.color, border: `1px solid ${t.border}`, borderRadius: 5, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>⬇️ Export</button><button onClick={() => copy(t.key, posts[t.key])} style={{
                    background: "transparent", color: t.color, border: `1px solid ${t.border}`, borderRadius: 5,
                    padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                  }}>{copied === t.key ? "✅ Copied!" : "📋 Copy"}</button></div>
                </div>
                <div style={{ padding: 18, fontFamily: "'Courier New', monospace", fontSize: 13, lineHeight: 1.85, color: "#e0e0e0", whiteSpace: "pre-wrap", maxHeight: "55vh", overflowY: "auto" }}>
                  {posts[t.key] || "No content."}
                </div>
              </div>
              <p style={{ fontSize: 11, color: "#555", marginTop: 8 }}>☝️ Review before posting. Operator approval required.</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── BACKTEST AGENT ───────────────────────────────────────────────────────────

function BacktestAgent() {
  const [sport, setSport] = useState("both");
  const [round, setRound] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(-1);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const steps = ["🔍 Finding pre-game data for the round...", "🧠 Generating tips on pre-game logic only...", "🎯 Building what SGMs we'd have placed...", "📊 Fetching actual results...", "✅ Comparing tips to results...", "🔬 Analysing if the logic is sound..."];

  const canRun = round.trim() && year.trim();

  const run = async () => {
    setLoading(true); setOutput(""); setError(""); setStep(0);
    const interval = setInterval(() => setStep((p) => p < steps.length - 1 ? p + 1 : p), 9000);
    const sportText = sport === "both" ? "both NRL and AFL" : sport === "nrl" ? "NRL only" : "AFL only";
    try {
      const result = await callClaude({
        systemPrompt: BACKTEST_PROMPT,
        userMessage: `Run a backtest for ${sportText}, ${round.trim()} ${year.trim()}.

Remember the two strict phases: FIRST generate the tips using only pre-game information (do not let the actual result influence your picks), THEN fetch the actual results and compare. Be brutally honest about how the picks would have performed. Use web search for both the pre-game data and the actual results.`,
        useWebSearch: true,
        maxTokens: 8000,
        maxTurns: 20,
      });
      clearInterval(interval);
      setOutput(result);
    } catch (e) {
      clearInterval(interval);
      setError(e.message);
    } finally {
      setLoading(false); setStep(-1);
    }
  };

  const copy = () => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div>
      {/* Big warning banner */}
      <div style={{ background: "#2a1a00", border: "2px solid #f59e0b", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>🧪</span>
          <div>
            <h2 style={{ margin: "0 0 2px", fontSize: 16, color: "#fbbf24" }}>Backtest Mode — Internal Testing Only</h2>
            <p style={{ margin: 0, fontSize: 12, color: "#d97706" }}>This runs the pipeline on PAST rounds to check how we'd have done. Never publish this to members.</p>
          </div>
        </div>
      </div>

      <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, color: "#fff" }}>Pick a past round to test</h3>

        {/* Sport selector */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: "#aaa", display: "block", marginBottom: 6 }}>Sport</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ id: "both", label: "Both" }, { id: "nrl", label: "🏉 NRL only" }, { id: "afl", label: "🏈 AFL only" }].map((s) => (
              <button key={s.id} onClick={() => setSport(s.id)} style={{
                background: sport === s.id ? "#2a1a00" : "#0a0a0a",
                color: sport === s.id ? "#fbbf24" : "#666",
                border: `1px solid ${sport === s.id ? "#f59e0b" : "#333"}`,
                borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: sport === s.id ? 700 : 400,
              }}>{s.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ fontSize: 12, color: "#aaa", display: "block", marginBottom: 6 }}>Round *</label>
            <input value={round} onChange={(e) => setRound(e.target.value)}
              placeholder="e.g. Round 8  or  Magic Round"
              style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: 6, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box", outline: "none" }} />
          </div>
          <div style={{ width: 120 }}>
            <label style={{ fontSize: 12, color: "#aaa", display: "block", marginBottom: 6 }}>Year *</label>
            <input value={year} onChange={(e) => setYear(e.target.value)}
              placeholder="2026"
              style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: 6, padding: "10px 12px", color: "#fff", fontSize: 14, fontWeight: 700, boxSizing: "border-box", outline: "none" }} />
          </div>
        </div>

        <p style={{ margin: "14px 0 0", fontSize: 12, color: "#666", lineHeight: 1.6 }}>
          💡 To test the past month, run a few rounds one at a time (e.g. Round 8, 9, 10, 11) and compare. Each run takes ~1–2 minutes as it searches pre-game data then results.
        </p>
      </div>

      {error && !loading && (
        <div style={{ background: "#1a0a0a", border: "1px solid #e94560", borderRadius: 10, padding: "14px 20px", marginBottom: 16 }}>
          <p style={{ margin: "0 0 4px", color: "#e94560", fontWeight: 700 }}>⚠️ Error</p>
          <p style={{ margin: 0, color: "#aaa", fontSize: 13 }}>{error}</p>
        </div>
      )}

      {loading && (
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: "28px 24px", marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>🧪</div>
          <h3 style={{ margin: "0 0 20px", color: "#fff" }}>Running backtest...</h3>
          <StatusTracker steps={steps} currentStep={step} />
          <p style={{ marginTop: 16, fontSize: 12, color: "#555" }}>Takes 1–2 minutes — generating tips, then fetching results...</p>
        </div>
      )}

      {!loading && (
        <button onClick={run} disabled={!canRun} style={{
          background: canRun ? "linear-gradient(135deg, #f59e0b, #d97706)" : "#222",
          color: canRun ? "#1a1a1a" : "#555",
          border: "none", borderRadius: 8, padding: "14px 32px",
          fontSize: 15, fontWeight: 700, cursor: canRun ? "pointer" : "not-allowed", width: "100%",
        }}>
          🧪 Run Backtest
        </button>
      )}

      {output && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0, color: "#fbbf24", fontSize: 15 }}>🧪 Backtest Complete</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => downloadText("backtest", output)} style={{ background: "#0d2818", color: "#6bcf6b", border: "1px solid #1f5132", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                ⬇️ Export
              </button>
              <button onClick={copy} style={{ background: "#2a1a00", color: "#fbbf24", border: "1px solid #f59e0b", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                {copied ? "✅ Copied!" : "📋 Copy"}
              </button>
            </div>
          </div>
          <div style={{ background: "#0d0d0d", border: "1px solid #2a1a00", borderRadius: 10, padding: 20, fontFamily: "'Courier New', monospace", fontSize: 13, lineHeight: 1.8, color: "#d4d4d4", whiteSpace: "pre-wrap", maxHeight: "60vh", overflowY: "auto" }}>
            {output}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

const NAV = [
  { id: "home", label: "🐕 Home", short: "Home" },
  { id: "scout", label: "🔍 Scout", short: "Scout" },
  { id: "analyst", label: "📊 Analyst", short: "Analyst" },
  { id: "publisher", label: "📣 Publisher", short: "Publisher" },
  { id: "scorecard", label: "📈 Scorecard", short: "Scorecard" },
  { id: "backtest", label: "🧪 Backtest", short: "Backtest" },
];

export default function PuntersDenApp() {
  const [page, setPage] = useState("home");
  const [weekDone, setWeekDone] = useState({ scout: false, analyst: false, publisher: false, scorecard: false });
  // Pass data between agents automatically
  const [scoutOutput, setScoutOutput] = useState("");
  const [analystOutput, setAnalystOutput] = useState("");

  const today = new Date().toLocaleDateString("en-AU", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Australia/Sydney" });
  const completedCount = Object.values(weekDone).filter(Boolean).length;

  const handleScoutComplete = (data) => { setScoutOutput(data); setWeekDone((p) => ({ ...p, scout: true })); };
  const handleAnalystComplete = (data) => { setAnalystOutput(data); setWeekDone((p) => ({ ...p, analyst: true })); };
  const handlePublisherComplete = () => setWeekDone((p) => ({ ...p, publisher: true }));

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#0a0a0a", minHeight: "100vh", color: "#f0f0f0" }}>

      {/* Top Nav */}
      <div style={{ background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", padding: "0 16px" }}>
          <button onClick={() => setPage("home")} style={{
            background: "none", border: "none", color: "#e94560", fontWeight: 900,
            fontSize: 18, cursor: "pointer", padding: "16px 16px 16px 0", marginRight: 8, whiteSpace: "nowrap",
          }}>🐕 Punters Den</button>
          <div style={{ display: "flex", flex: 1, overflowX: "auto" }}>
            {NAV.slice(1).map((n) => (
              <button key={n.id} onClick={() => setPage(n.id)} style={{
                background: "none", border: "none",
                borderBottom: `3px solid ${page === n.id ? "#e94560" : "transparent"}`,
                color: page === n.id ? "#fff" : "#666",
                padding: "16px 14px", cursor: "pointer", fontSize: 13,
                fontWeight: page === n.id ? 700 : 400,
                whiteSpace: "nowrap", transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                {n.label}
                {weekDone[n.id] && <span style={{ fontSize: 10, color: "#22c55e" }}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Page Header */}
      {page !== "home" && (
        <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)", borderBottom: "2px solid #e94560", padding: "20px 32px" }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 28 }}>{NAV.find(n => n.id === page)?.label.split(" ")[0]}</span>
              <div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#fff" }}>
                  {page === "scout" ? "Scout Agent" : page === "analyst" ? "Analyst Agent" : page === "publisher" ? "Publisher Agent" : page === "backtest" ? "Backtest Engine" : "Scorecard Agent"}
                </h1>
                <p style={{ margin: 0, fontSize: 12, color: "#e94560", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>
                  {page === "scout" ? "Weekly Data Gather" : page === "analyst" ? "Tiered Tips Generator" : page === "publisher" ? "Website Post Generator" : page === "backtest" ? "Internal Testing — How Would We Have Done" : "Results & Transparency Report"}
                </p>
              </div>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#aaa" }}>📅 {today}</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 24px" }}>

        {/* HOME PAGE */}
        {page === "home" && (
          <div>
            {/* Hero */}
            <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)", borderRadius: 14, padding: "32px 32px", marginBottom: 28, border: "1px solid #1d4ed8" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                <span style={{ fontSize: 52 }}>🐕</span>
                <div>
                  <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>The Punters Den</h1>
                  <p style={{ margin: 0, fontSize: 13, color: "#e94560", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px" }}>AI Tipping Pipeline — Command Centre</p>
                </div>
              </div>
              <p style={{ margin: "0 0 20px", color: "#aaa", fontSize: 14, lineHeight: 1.7 }}>
                Your full weekly NRL & AFL tipping pipeline. Scout → Analyst → Publisher → Scorecard — all in one place.
              </p>
              {/* Progress */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "#aaa" }}>This week's pipeline progress</span>
                  <span style={{ fontSize: 12, color: completedCount === 4 ? "#22c55e" : "#e94560", fontWeight: 700 }}>{completedCount}/4 complete</span>
                </div>
                <div style={{ background: "#0a0a0a", borderRadius: 99, height: 8, overflow: "hidden" }}>
                  <div style={{ background: "linear-gradient(90deg, #3b82f6, #a855f7, #f97316, #22c55e)", width: `${(completedCount / 4) * 100}%`, height: "100%", borderRadius: 99, transition: "width 0.5s" }} />
                </div>
              </div>
            </div>

            {/* Pipeline Cards */}
            <h2 style={{ margin: "0 0 16px", fontSize: 17, color: "#fff" }}>🚀 Pipeline Agents</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
              {[
                { id: "scout", icon: "🔍", name: "Scout Agent", sub: "Run Friday morning", desc: "Searches the web for all NRL & AFL fixtures, ladder, team news, injuries and odds from 4 bookmakers.", color: "#3b82f6", border: "#1d4ed8", bg: "#0d1f3c", tags: ["NRL & AFL Fixtures", "Live Odds", "Team News", "Line Movement"] },
                { id: "analyst", icon: "📊", name: "Analyst Agent", sub: "Run after Scout", desc: "Applies tipping rules, scores confidence stars, builds SGMs and generates tips for every subscription tier.", color: "#a855f7", border: "#7c3aed", bg: "#1a0d2e", tags: ["Rule Scoring", "Confidence Stars", "SGM Builder", "Tier Filtering"] },
                { id: "publisher", icon: "📣", name: "Publisher Agent", sub: "Run after Analyst", desc: "Writes all 3 posts — Bronze, Silver and Gold — ready to copy straight into your website member area.", color: "#f97316", border: "#c2410c", bg: "#2a1200", tags: ["Bronze Post", "Silver Post", "Gold VIP Post"] },
                { id: "scorecard", icon: "📈", name: "Scorecard Agent", sub: "Run every Monday", desc: "Settles every published tip, verifies the scorer/SGM legs, and hands you paste-ready track-record.js rows plus a short private summary.", color: "#22c55e", border: "#15803d", bg: "#0d2010", tags: ["Settle tips", "Verify legs", "track-record.js rows", "Private summary"] },
              ].map((agent, idx) => (
                <div key={agent.id} style={{
                  background: weekDone[agent.id] ? "#0d1a0d" : "#111",
                  border: `1px solid ${weekDone[agent.id] ? "#2d5a2d" : "#1e1e1e"}`,
                  borderLeft: `4px solid ${agent.color}`,
                  borderRadius: 10, padding: "18px 20px",
                  display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: agent.bg, border: `2px solid ${agent.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                    {weekDone[agent.id] ? "✅" : agent.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 11, color: agent.color, fontWeight: 700, textTransform: "uppercase" }}>Step {idx + 1}</span>
                      <span style={{ fontSize: 11, color: "#555" }}>• {agent.sub}</span>
                    </div>
                    <h3 style={{ margin: "0 0 4px", fontSize: 15, color: "#fff", fontWeight: 700 }}>{agent.name}</h3>
                    <p style={{ margin: "0 0 8px", fontSize: 12, color: "#aaa", lineHeight: 1.5 }}>{agent.desc}</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {agent.tags.map(t => (
                        <span key={t} style={{ background: agent.bg, border: `1px solid ${agent.border}55`, borderRadius: 20, padding: "2px 8px", fontSize: 10, color: agent.color }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button onClick={() => setPage(agent.id)} style={{
                      background: `linear-gradient(135deg, ${agent.color}22, ${agent.bg})`,
                      color: agent.color, border: `1px solid ${agent.border}`,
                      borderRadius: 7, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 700,
                    }}>{agent.icon} Open</button>
                    <button onClick={() => setWeekDone(p => ({ ...p, [agent.id]: !p[agent.id] }))} style={{
                      background: weekDone[agent.id] ? "#0d2010" : "#1a1a1a",
                      color: weekDone[agent.id] ? "#22c55e" : "#555",
                      border: `1px solid ${weekDone[agent.id] ? "#2d5a2d" : "#333"}`,
                      borderRadius: 7, padding: "9px 14px", cursor: "pointer", fontSize: 12,
                    }}>{weekDone[agent.id] ? "✅ Done" : "Mark Done"}</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Schedule + Quick Ref side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 28 }}>
              <div>
                <h2 style={{ margin: "0 0 14px", fontSize: 17, color: "#fff" }}>📅 Weekly Schedule</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { day: "Thursday", icon: "👀", tasks: ["Monitor team news dropping", "Note early injury alerts"] },
                    { day: "Friday", icon: "🚀", tasks: ["Run Scout → Analyst → Publisher", "Operator reviews all tips", "Post to all channels"] },
                    { day: "Sat–Sun", icon: "🏉", tasks: ["Games play out", "Monitor results live", "Engage with members"] },
                    { day: "Monday", icon: "📊", tasks: ["Enter results", "Run Scorecard", "Paste rows into track-record.js", "Settle any 'pending' legs"] },
                  ].map(d => (
                    <div key={d.day} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                        <span>{d.icon}</span>
                        <span style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{d.day}</span>
                      </div>
                      <ul style={{ margin: 0, padding: "0 0 0 14px", color: "#777", fontSize: 12, lineHeight: 2 }}>
                        {d.tasks.map(t => <li key={t}>{t}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 style={{ margin: "0 0 14px", fontSize: 17, color: "#fff" }}>💡 Quick Reference</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { icon: "💰", label: "Min odds to tip", value: "$1.50" },
                    { icon: "🎯", label: "SGM target range", value: "$3.00 – $8.00" },
                    { icon: "🔗", label: "SGM legs", value: "3–4 legs (4 preferred)" },
                    { icon: "⚠️", label: "Line movement flag", value: "10%+ shift" },
                    { icon: "🥉", label: "Bronze confidence", value: "3+ ⭐" },
                    { icon: "🥈", label: "Silver/Gold confidence", value: "4+ ⭐" },
                    { icon: "📊", label: "1 unit (flat stake)", value: "$10" },
                    { icon: "📞", label: "Responsible gambling", value: "1800 858 858" },
                  ].map(r => (
                    <div key={r.label} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 18 }}>{r.icon}</span>
                      <div>
                        <p style={{ margin: 0, fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.4px" }}>{r.label}</p>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#fff" }}>{r.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Auto-flow hint */}
            {scoutOutput && !weekDone.analyst && (
              <div style={{ background: "#0d1f3c", border: "1px solid #1d4ed8", borderRadius: 10, padding: "14px 18px", marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#7eb3ff" }}>
                  ✅ Scout report ready! <button onClick={() => setPage("analyst")} style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontWeight: 700, fontSize: 13, textDecoration: "underline" }}>Open Analyst →</button> The report has been auto-loaded.
                </p>
              </div>
            )}
            {analystOutput && !weekDone.publisher && (
              <div style={{ background: "#2a1200", border: "1px solid #c2410c", borderRadius: 10, padding: "14px 18px", marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#fb923c" }}>
                  ✅ Analyst report ready! <button onClick={() => setPage("publisher")} style={{ background: "none", border: "none", color: "#f97316", cursor: "pointer", fontWeight: 700, fontSize: 13, textDecoration: "underline" }}>Open Publisher →</button> The report has been auto-loaded.
                </p>
              </div>
            )}
          </div>
        )}

        {/* AGENT PAGES */}
        {page === "scout" && <ScoutAgent onComplete={handleScoutComplete} />}
        {page === "analyst" && <AnalystAgent prefillData={scoutOutput} onComplete={handleAnalystComplete} />}
        {page === "publisher" && <PublisherAgent prefillData={analystOutput} onComplete={handlePublisherComplete} />}
        {page === "scorecard" && <ScorecardAgent prefillAnalyst={analystOutput} />}
        {page === "backtest" && <BacktestAgent />}

        {/* Footer */}
        <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 20, marginTop: 32, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#555" }}>⚠️ Gamble responsibly — 18+ only | 1800 858 858</p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#333" }}>The Punters Den — AI Tipping Pipeline v2.0</p>
        </div>
      </div>
    </div>
  );
}
