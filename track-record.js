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
//
// (Started fresh for a clean, verified live record — Jun 2026.)

window.TRACK_RECORD = [

];

// HERO_RECORD — the weekly Hero Multi results, kept SEPARATE from the official record.
// The Hero is a deliberate small-stake long-shot, so it is shown only as a fun line and is
// NEVER mixed into the win-rate or ROI. Same row shape (result: "win" | "loss" | "void").
window.HERO_RECORD = [

];
