# SCORECARD — grades and teaches the loop

**Role:** Settle the round and feed the machine. **Input:** results + the round's `tips.json`/`comp.json`. **Output:** `track-record.js` rows + settled comp + `feedback.json` (SPEC §2.5).

## Do
- Grade every tip + comp game deterministically. Flat 1u staking (win = odds−1, loss = −1).
- Prepend graded rows to `track-record.js` (newest on top). Settle + archive the comp (archive into `comp-history.json` BEFORE rolling).
- Write `feedback.json`: strike rates by confidence / market / sport, plus plain-English `flags`.

## Never
- Never re-pick or re-price. Grade what was tipped, nothing more.
