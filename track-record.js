// track-record.js — THE single source of truth for our tipping record.
// Both the Scoreboard (results.html) and the landing page (index.html) read from this,
// so you only update it in ONE place and both pages stay in sync.
//
// Add newest tips at the TOP. One object per tip:
//   { rd: "R14 · Jun 6", code: "NRL", match: "Storm v Knights", type: "H2H", sel: "Storm", odds: 1.70, result: "win" }
//   result: "win" | "loss" | "push"   ·   type: "H2H" | "Line" | "SGM" | "Prop"
//   code: "NRL" | "AFL" | "CROSS"
//
// (Started fresh for a clean, verified live record — Jun 2026.)

window.TRACK_RECORD = [

];
