# The Punters Den — Automated Pipeline (CLAUDE.md)

This repo runs a weekly AFL & NRL tipping pipeline. You (Claude Code) operate it. Follow this contract exactly.

## Read first, every run
1. `PUNTERS-DEN-BRIEF.md` — product spec (tiers, standards, voice). Single source of truth.
2. `config.json` — the operator's knobs (odds floors, SGM bands, schedule). Never hardcode a value that lives here; always read it.
3. `PUNTERS-DEN-PIPELINE-SPEC.md` — the schemas + how the agents hand off.

## The pipeline (one code per run)
Scout → Gatekeeper → Analyst → **[HUMAN APPROVES via PR]** → Publisher → (games) → Scorecard.
Each stage = the matching prompt in `/agents/`. Run in order; each writes a JSON artifact the next reads.

## Non-negotiable rules
- **Never invent data.** Unverified facts go in `gaps` — you do not guess.
- **Never tip on unverified data.** The Analyst may only use facts in `verified_board.json`.
- **Always run `validators/validate-slate.js`** before publishing. On fail: STOP and report.
- **Never auto-publish to members.** The draft goes into a PR; a human merges to approve. Publisher runs only on approved drafts.
- **Odds are indicative.** The operator confirms final builder prices; never present a price as locked.

## Where things live
- Pages, `track-record.js`, `config.*`, `*-BRIEF.md`, `*-SPEC.md` → repo root
- Functions, `tips.json`, `comp.json`, `comp-history.json` → `netlify/functions/`
- Agents → `/agents/` · Validators → `/validators/` · Schemas → `/schemas/`

## Critical gotchas (these have bitten before)
- **Comp commit order:** archive the finished round into `comp-history.json` BEFORE replacing `comp.json`, or you wipe members' picks.
- **`netlify.toml` `included_files`** must list every JSON a function reads.
- **Kickoffs** are ISO 8601 with `+10:00` (AEST) or the lockout breaks.
- **Every tip needs a `day`** (Thu/Fri/Sat/Sun) or `special:true`. Never "weekend".
- **`track-record.js`** newest row on top; flat 1u staking.

## Cadence (from config.json → schedule)
NRL drops Wed (after Tue 4pm lists) · AFL drops Thu (after ~6:20pm teams) · Grade Mon.
Skip the Thursday-night AFL game unless `skip_thursday_afl_game` is false.

## PRs
Draft slates open a PR titled `slate: <round>` containing `slate_draft.json` + a plain-English summary. The operator reviews on mobile and merges to approve.
