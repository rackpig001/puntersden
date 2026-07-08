# Turning the pipeline on

The pipeline is built. It runs on **GitHub Actions** (in GitHub's cloud — nothing on your computer). Here's how to switch it on, and how it behaves once it is.

## One-time setup (do these once)

1. **Add your Anthropic API key.** GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**. Name it `ANTHROPIC_API_KEY`, paste your key. (Get one at the Claude Platform / console.)
2. **Install the Claude GitHub App** on the repo (the workflows need it to open PRs and commit). Easiest: in Claude Code run `/install-github-app`, or install `anthropics/claude-code-action` from the GitHub Marketplace.
3. **(For reliable data) add feed keys** as secrets too — an odds API and a results API. Until these are in, the Scout step leans on web search, which works but is less reliable.

## How it runs (once on)

| Workflow | When | What it does | You |
|---|---|---|---|
| `nrl-draft` | Wed 08:00 AEST | drafts the NRL slate → opens a PR | review + **merge to approve** |
| `afl-draft` | Thu 19:00 AEST | drafts the AFL slate → opens a PR | review + **merge to approve** |
| `publish` | when you merge a slate PR | builds tips.json + comp patch + sms.txt + posts | **send the SMS** (sms.txt) |
| `grade` | Mon 10:00 AEST | grades, settles the comp, writes feedback → PR | review + merge |

Your whole week = read two PRs on your phone, merge, send an SMS. Everything else is automatic. You can also fire any workflow manually from the **Actions** tab (`workflow_dispatch`).

## The gates that protect you (built in)
- The validator blocks any non-compliant slate before it can publish.
- Nothing reaches members without you merging the PR.
- SMS is never sent automatically — sms.txt waits for your tap.

## Honest status
The scaffold is complete and internally tested (JSON, workflows and validator all pass). It goes **live** the moment `ANTHROPIC_API_KEY` is set and the GitHub App is installed — then do **one supervised run** (`workflow_dispatch` the NRL draft, watch the PR appear) before trusting the schedule. It becomes **reliable** once the odds/results feeds are wired; until then treat the drafts as web-sourced (good, not bulletproof).
