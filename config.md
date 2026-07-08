# Your control panel — `config.json`

These are the knobs **you** control. Change a value in `config.json` via the GitHub web UI and the whole pipeline follows — no code, no me. Edit the **values only** (the numbers and words after the colon); never rename fields or remove brackets/commas.

## The rules

| Knob | What it does | Default | Safe to change to |
|---|---|---|---|
| `min_h2h_odds` | Lowest odds allowed for a standalone head-to-head single | `1.50` | anything ≥ 1.20 |
| `sgm_min_legs` / `sgm_max_legs` | Legs allowed in a Same Game Multi | `3` / `4` | keep 3–4 unless you rethink the strategy |
| `sgm_odds_min` / `sgm_odds_max` | Target price band for an SGM | `3.00` / `8.00` | any sensible band |
| `cross_sport_odds_min` / `max` | Price band for the cross-sport multi | `3.00` / `6.00` | any sensible band |
| `line_move_flag_pct` | Flag a tip if the line has moved this much | `10` | 5–20 |
| `bronze_min_stars` | Minimum confidence for a Bronze tip | `3` | 3–5 |
| `silver_gold_min_stars` | Minimum confidence for Silver/Gold | `4` | 4–5 |
| `high_confidence_pct` | What "high confidence" means | `85` | 80–90 |
| `valid_days` | Allowed day tags | Thu–Sun | leave as is |
| `min_sources` | How many sources a fact needs to be trusted | `2` | 2–3 |
| `freshness_max_minutes` | How old data can be before it's rejected | `60` | 30–120 |

## Tiers, schedule, brand

- **Tiers** — prices and what each includes. Change a price here and it's the source of truth.
- **Schedule** — which day each code drops (`nrl_drop_day`, `afl_drop_day`), grading day, and `skip_thursday_afl_game` (set `false` if you ever want to tip the Thursday AFL game).
- **Brand** — the responsible-gambling line, and which file holds the brief.

## What you *don't* touch

Anything starting with `_`, the field names, and the file structure. If a value looks like `1.50`, keep it a number (no quotes). If it looks like `"Wed"`, keep the quotes. When in doubt, change one thing, commit, and check it still loads.
