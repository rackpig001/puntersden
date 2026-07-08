# THE PUNTERS DEN — PIPELINE OPTIMISATION SPEC
**Foundation for the automated (Claude Code) build.**
Every agent reads `PUNTERS-DEN-BRIEF.md` as the single source of truth — no agent embeds its own copy of the brief.

---

## 0. The six principles

1. **Structured handoffs** — agents pass JSON, never prose. Every stage is testable.
2. **Verify before you tip** — nothing reaches the Analyst unverified (the Gatekeeper).
3. **Rules as validators, not vibes** — standards are enforced in code, not "remembered".
4. **Deterministic where deterministic** — Publisher & Scorecard use templates + code; the model is reserved for the two jobs that need judgment (Scout synthesis, Analyst picks).
5. **Closed feedback loop** — the Scorecard teaches the Analyst; the pipeline gets better, not just repeats.
6. **Narrow agents** — each does one job and won't bleed into the next.

---

## 1. Pipeline & data flow

```
Scout ──scout_board.json──▶ Gatekeeper ──verified_board.json──▶ Analyst ──slate_draft.json──▶ [ YOU APPROVE ]
                                                                                                     │
        feedback.json ◀── Scorecard ◀── (games play) ◀── publish ◀── Publisher ◀────────────────────┘
              │
              └────────────────────────────▶ (feeds back into Analyst next round)
```

- **Trigger cadence:** NRL cycle fires Tue (after 4pm lists); AFL cycle fires Thu (after ~6:20pm teams). One code per run — the schemas carry a `code_cycle` so a run only touches its own code.
- **The single human gate** is between Analyst and Publisher: you approve `slate_draft.json` (merge the PR). Everything else runs unattended.

---

## 2. Handoff schemas

### 2.1 `scout_board.json` — Scout output (the fact table)
```json
{
  "round": { "id": "r19-afl18", "label": "NRL R19 · AFL R18", "code_cycle": "NRL" },
  "generated_at": "2026-07-07T16:35:00+10:00",
  "games": [
    {
      "game_id": "n1",
      "code": "NRL",
      "day": "Fri",
      "kickoff": "2026-07-10T20:00:00+10:00",
      "home": "Wests Tigers",
      "away": "Warriors",
      "venue": "Campbelltown Stadium",
      "lineup_confirmed": true,
      "lineup_source": "NRL.com team lists — Tue 4:00pm",
      "odds": {
        "home_win": { "best": 1.52, "bookie": "Sportsbet", "all": { "Sportsbet": 1.52, "TAB": 1.50, "Ladbrokes": 1.53 } },
        "away_win": { "best": 2.55, "bookie": "Ladbrokes" },
        "opened": { "home_win": 1.60 }
      },
      "model_prob": { "home": 0.63, "away": 0.37 },
      "players": [
        { "name": "Jason Saab", "team": "away", "position": "wing", "market": "anytime_try", "prob": 0.486, "confirmed": true, "source": "statsinsider" }
      ],
      "form_notes": ["Warriors 3 wins on the bounce", "Tigers pushed the Knights last week"],
      "injuries_outs": ["Api Koroisau (Tigers) — out"],
      "sources": ["url1", "url2"],
      "gaps": []
    }
  ],
  "unresolved_gaps": []
}
```
**Rules for Scout output:** `kickoff` is ISO 8601 with `+10:00`. Every player leg candidate carries `confirmed` + `source`. Anything Scout could not verify goes in `gaps` (per game) / `unresolved_gaps` (round) — **Scout never fills a gap with a guess.**

### 2.2 `verified_board.json` — Gatekeeper output
Same shape as `scout_board.json`, plus a `verification` block per game and a round-level verdict. Facts that fail are flagged; games that can't pass are dropped from the Analyst's view.
```json
{
  "round": { "...": "..." },
  "verified_at": "2026-07-07T16:50:00+10:00",
  "round_status": "pass",
  "games": [
    {
      "game_id": "n1",
      "...": "(all scout fields)",
      "verification": {
        "status": "pass",
        "checks": {
          "two_source_agreement": true,
          "kickoff_in_future": true,
          "all_named_players_confirmed": true,
          "freshness_minutes": 12
        },
        "rejected": []
      }
    }
  ],
  "dropped_games": [],
  "dropped_reasons": []
}
```

### 2.3 `slate_draft.json` — Analyst output (what you approve)
```json
{
  "round": { "id": "r19-afl18", "label": "NRL R19 · AFL R18", "code_cycle": "NRL" },
  "drafted_at": "2026-07-07T17:10:00+10:00",
  "tiers": {
    "bronze": [
      { "type": "h2h_single", "game_id": "n1", "day": "Fri", "selection": "Wests Tigers",
        "odds": 1.52, "bookie": "Sportsbet", "confidence_stars": 3, "flags": ["strong"],
        "rationale": "Warriors travel; Tigers' form + edge at Campbelltown." }
    ],
    "silver": [
      { "type": "sgm", "code": "NRL", "game_id": "n5", "day": "Sat", "confidence_stars": 4,
        "legs": [
          { "market": "team_win", "selection": "Sharks" },
          { "market": "anytime_try", "player": "Sione Katoa", "confirmed": true },
          { "market": "total_points", "selection": "Over 42.5" }
        ],
        "target_odds_band": [3.0, 8.0], "est_odds": 4.60,
        "rationale": "72% fav vs a depleted, out-of-form side." }
    ],
    "gold": [
      { "type": "cross_sport", "legs": ["..."], "target_odds_band": [3.0, 6.0] },
      { "type": "hero", "legs": ["..."], "note": "small-stake lottery" }
    ]
  },
  "line_moves": [ { "game_id": "n5", "market": "home_win", "open": 1.60, "now": 1.45, "pct": -9.4, "flagged": false } ],
  "applied_feedback": ["down-weighted anytime-try legs (last-4wk strike 41%)"],
  "validator_report": { "status": "pass", "failures": [] }
}
```

### 2.4 Publisher outputs (deterministic — generated from the approved slate)
- `tips.json` — live member format: grouped by day, standard before SGM, tier tags, `day` mandatory (or `special:true`), medal badges.
- `comp.json` doubles patch — flag the games the Den tipped as `double:true`.
- `sms.txt` — the member SMS (link, not the tips).
- `posts.md` — the five tier/social posts.

### 2.5 Scorecard outputs
- `track-record.js` rows (newest on top) — `{ rd, wk, code, match, type, sel, odds, result, day, date }`.
- `feedback.json`:
```json
{
  "round": "NRL R19 · AFL R18",
  "summary": "5W-3L +2.1u",
  "by_confidence": { "3star": { "w": 20, "l": 9, "strike": 0.69 }, "4star": { "w": 14, "l": 10, "strike": 0.58 } },
  "by_market":    { "h2h": { "strike": 0.71 }, "sgm": { "strike": 0.44 }, "anytime_try": { "strike": 0.41 } },
  "by_sport":     { "NRL": { "strike": 0.63 }, "AFL": { "strike": 0.60 } },
  "flags": ["4-star hitting 58% vs 85% claim — tighten the confidence bar", "anytime-try legs underperforming — down-weight"]
}
```

---

## 3. Agent prompts (sharpened)

### SCOUT — *gathers, never opines*
> You are Scout. Pull every fact for the round's games in `code_cycle` and emit `scout_board.json` exactly to schema. Sources: fixtures/kickoffs, confirmed team lists, best odds per bookie + opening line, model probabilities, key form and outs, and player anytime-scorer probabilities for likely SGM anchors. Cross-source every number. **You do not pick, rate, or recommend anything.** If a fact cannot be verified from a reputable source, DO NOT invent it — record it in `gaps` and move on. Every player you list must be marked `confirmed` against the named side. Stamp `generated_at` (AEST).

### GATEKEEPER — *verifies, rejects garbage*
> You are the Gatekeeper. Take `scout_board.json` and emit `verified_board.json`. For each game run four checks: (1) each fact agrees across ≥2 sources; (2) `kickoff` is still in the future; (3) **every player named for a potential leg is in the confirmed side**; (4) data freshness < 60 min. Mark each game `pass` or `reject` with reasons. Drop any game that can't pass so the Analyst never sees unverified data. If `unresolved_gaps` touches a game, that game cannot carry player-dependent legs. Set `round_status`.

### ANALYST — *decides on verified facts only*
> You are the Analyst. Input: `verified_board.json` + `feedback.json` + `PUNTERS-DEN-BRIEF.md`. Emit `slate_draft.json`. Build the tiered slate to the brief: Bronze H2H singles (≥$1.50), Silver +1 SGM/code, Gold +2nd SGM/code + cross-sport + Hero. **Confidence is tied to the model edge (model prob vs market), never invented** — 4 stars only where the verified edge supports 85%. SGMs: 3–4 legs, $3–8 (cross-sport $3–6); every leg on a `confirmed` player. Quality over volume — never pad. Apply `feedback.json` (recalibrate where a market/confidence band is underperforming) and record what you applied. Flag any line move ≥10%. **You may only use facts present in `verified_board.json`** — if it's not there, you can't tip it.

### PUBLISHER — *formats and validates, never decides*
> You are the Publisher. Input: the APPROVED `slate_draft.json`. Generate `tips.json`, the `comp.json` doubles patch, `sms.txt`, and `posts.md` from templates — deterministically. Run the validator checklist first; if any check fails, STOP and report — do not publish. You make no selection decisions and change no odds. Append the responsible-gambling line to every member-facing output.

### SCORECARD — *grades and teaches the loop*
> You are the Scorecard. Input: results + the round's `tips.json`/`comp.json`. Grade every tip and comp game deterministically. Emit `track-record.js` rows (newest on top, flat 1u staking), settle + archive the comp, and emit `feedback.json` with strike rates by confidence / market / sport and plain-English `flags`. You do not re-pick or re-price anything.

---

## 4. Validator checklist (hard rejects — run before anything reaches you, and again before publish)

A tip/slate is REJECTED if any of these fail:

- [ ] **H2H single** odds **≥ $1.50** (singles only; not SGM/multi legs)
- [ ] **SGM** has **3–4 legs**
- [ ] **SGM combined odds** within **$3.00–$8.00** (cross-sport **$3.00–$6.00**)
- [ ] **Every SGM leg player** is `confirmed:true` in `verified_board.json`
- [ ] **Every tip** has a `day` (Thu/Fri/Sat/Sun) **or** `special:true` — never "weekend"
- [ ] **Tiers are cumulative** (Silver ⊇ Bronze content; Gold ⊇ Silver)
- [ ] **Silver/Gold tips** are 4-star (high-confidence) only
- [ ] **No tip** on a game whose `kickoff` has passed
- [ ] **Best bookie named** for every priced tip
- [ ] **Line move ≥10%** is flagged
- [ ] **Responsible-gambling line present** on every member-facing output
- [ ] **No fact used** that isn't in `verified_board.json`

Validators live as a small script the Publisher (and the Analyst self-check) call. Prompts guide; validators enforce.

---

## 5. The feedback loop (what makes it improve)

Each round the Scorecard writes `feedback.json`. The Analyst reads it next round and **recalibrates**:
- If a **confidence band** underperforms its claim (e.g. 4-star < 85% over a rolling window), raise the bar for that band.
- If a **market** underperforms (e.g. anytime-try legs), down-weight or drop it from SGMs.
- If a **sport** is running cold, tighten selection there.
The Analyst records `applied_feedback` so every adjustment is auditable. Without this, the pipeline is frozen; with it, it learns.

---

## 6. How this maps to the Claude Code build

- **`CLAUDE.md`** (repo root) = the operating contract: the six principles, the schemas, "read `PUNTERS-DEN-BRIEF.md`", and "run the validators".
- **`/agents/`** = the five prompts above, one file each.
- **`/schemas/`** = the JSON schemas (2.1–2.5) for validation.
- **`/validators/`** = the checklist (section 4) as code.
- **GitHub Actions workflows** = the triggers (Tue NRL / Thu AFL / Mon grade), each running Claude Code headlessly to produce the next artifact and open a PR at the approval gate.

**Build order:** schemas → validators → agent prompts → CLAUDE.md → Phase-1 workflow (Scout+Gatekeeper+Analyst → PR).
