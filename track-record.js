// track-record.js — THE single source of truth for our tipping record.
// Both the Scoreboard (results.html) and the landing page (index.html) read from this,
// so you only update it in ONE place and both pages stay in sync.
//
// Add newest tips at the TOP. One object per tip:
//   { rd: "R14 · Jun 6", code: "NRL", match: "Storm v Knights", type: "H2H", sel: "Storm", odds: 1.70, result: "win", tag: "STRONG" }
//   result: "win" | "loss" | "push" | "void"   (push/void = refunded, 0 units, not counted as win or loss)
//   type:   "H2H" | "Line" | "SGM" | "Prop"      ·   code: "NRL" | "AFL" | "CROSS"
//   tag:    "STRONG" | "VALUE"  — SINGLES only (H2H/Line/Prop). Omit on multis (SGM/CROSS).
//   odds:   SINGLES = the published average we tipped. MULTIS = the LOW END of the published range (conservative).
//   note:   OPTIONAL short result detail shown under the tip (e.g. "Amiss 2 goals, needed 3 — one short"). Keep it honest.
//
// (Started fresh for a clean, verified live record — Jun 2026.)

// Preview switch: set to true ONLY when filling the arrays with sample data to
// test layout. It shows a red "PREVIEW MODE" banner on the Scoreboard. LIVE = false.
window.DEMO_DATA = false;

window.TRACK_RECORD = [
  { rd: "R14 · Jun 8", code: "NRL", match: "Wests Tigers v Penrith", type: "SGM", sel: "Penrith Win + To'o Try + Yeo Try", odds: 8.00, note: "Panthers 68–0. To'o crossed twice, Yeo in the 26th — all three legs home.", result: "win" },
  { rd: "R14 · Jun 8", code: "AFL", match: "Essendon v Carlton", type: "SGM", sel: "Carlton Win + McKay 2+ + Over ~177", odds: 3.00, note: "Carlton won and McKay kicked 3 ✓, but a low-scoring game (139 total) fell short of the Over ~177.", result: "loss" },
  { rd: "R14 · Jun 8", code: "CROSS", match: "NRL + AFL · 4 legs", type: "SGM", sel: "Dolphins + Gold Coast + Fremantle + Carlton", odds: 3.55, note: "Three of four home — Dolphins, Fremantle and Carlton all won. Gold Coast was the only leg to fall.", result: "loss" },
  { rd: "R14 · Jun 7", code: "NRL", match: "Cronulla v St George Illawarra", type: "SGM", sel: "Sharks Win + Kennedy Try + Nikora Try", odds: 8.00, note: "Sharks 34–12. Kennedy and Nikora both crossed — clean sweep.", result: "win" },
  { rd: "R14 · Jun 7", code: "AFL", match: "North Melbourne v Fremantle", type: "SGM", sel: "Fremantle Win + Amiss 3+ + Under 178.5", odds: 3.50, note: "Freo won by 124, but two legs missed — Amiss kicked 2 (needed 3), and the points blew past the Under 178.5 (186 total).", result: "loss" },
  { rd: "R14 · Jun 7", code: "AFL", match: "Gold Coast v Brisbane", type: "H2H", sel: "Gold Coast Suns", odds: 1.54, note: "QClash boilover — Brisbane ran out 106–75.", result: "loss", tag: "STRONG" },
  { rd: "R14 · Jun 6", code: "NRL", match: "Cowboys v Dolphins", type: "H2H", sel: "Dolphins", odds: 1.55, note: "Comfortable in Townsville, 40–14.", result: "win", tag: "STRONG" },
  { rd: "R14 · Jun 4", code: "AFL", match: "Adelaide v Geelong", type: "H2H", sel: "Geelong Cats", odds: 1.54, note: "Heartbreaker — Adelaide by a single point, 75–74.", result: "loss", tag: "STRONG" },

];

// HERO_RECORD — the weekly Hero Multi results, kept SEPARATE from the official record.
// The Hero is a deliberate small-stake long-shot, so it is shown only as a fun line and is
// NEVER mixed into the win-rate or ROI. Same row shape (result: "win" | "loss" | "void").
window.HERO_RECORD = [
  { rd: "R14 · Jun 8", code: "CROSS", match: "NRL + AFL · 5 legs", type: "SGM", sel: "Dolphins + To'o + Kennedy + Amiss 3+ + Waterman 3+", odds: 30.00, note: "Four of five landed — only Amiss's 3rd goal missed. So close.", result: "loss" },

];
