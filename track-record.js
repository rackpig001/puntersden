/* ════════════════════════════════════════════════════════════════
   THE PUNTERS DEN — TRACK RECORD  (single source of truth)
   Read by results.html (the Scoreboard) and index.html (landing stats).

   Add each tip as you grade it after a round. NEWEST AT THE TOP.
   Staking is FLAT — 1 unit per tip. Win = (odds − 1), loss = −1, push = 0.

   ── ROW FORMAT ──────────────────────────────────────────────────
   {
     rd:     "Round 14",                // round label (NRL & AFL differ!)
     code:   "NRL" | "AFL" | "CROSS",   // CROSS = cross-sport multi
     match:  "Wests Tigers v Penrith",  // the fixture
     type:   "H2H" | "SGM",             // H2H = single, SGM = multi
     sel:    "short selection text",
     odds:   8.00,                      // price tipped (SGM = low end of range)
     result: "win" | "loss" | "push",
     day:    "Sunday 7 June",           // group header on the Scoreboard
     date:   "Sun 7 Jun",               // shown on the card
     tag:    "STRONG" | "VALUE",        // SINGLES ONLY (optional)
     note:   "plain-English result",    // SINGLES use this in the dropdown
     legs:   [ {n,ok,sc}, ... ]         // MULTIS use this (ticked breakdown)
   }
   For multis, each leg: { n:"leg name", ok:true|false, sc:"what happened" }
   ════════════════════════════════════════════════════════════════ */

window.DEMO_DATA = false;

window.TRACK_RECORD = [
  { rd:"Round 14", code:"NRL", match:"Wests Tigers v Penrith", type:"SGM", sel:"Penrith Win + To'o + Yeo", odds:8.00, result:"win", day:"Sunday 7 June", date:"Sun 7 Jun",
    legs:[ {n:"Penrith Panthers to Win",ok:true,sc:"won 68–0"}, {n:"Brian To'o — Anytime Try",ok:true,sc:"scored 2 tries"}, {n:"Isaah Yeo — Anytime Try",ok:true,sc:"scored"} ] },

  { rd:"Round 14", code:"NRL", match:"Cronulla v St George Illawarra", type:"SGM", sel:"Sharks Win + Kennedy + Nikora", odds:8.00, result:"win", day:"Sunday 7 June", date:"Sun 7 Jun",
    legs:[ {n:"Cronulla Sharks to Win",ok:true,sc:"won 34–12"}, {n:"William Kennedy — Anytime Try",ok:true,sc:"scored"}, {n:"Briton Nikora — Anytime Try",ok:true,sc:"scored"} ] },

  { rd:"Round 13", code:"AFL", match:"Essendon v Carlton", type:"SGM", sel:"Carlton Win + McKay 2+ + Over", odds:3.00, result:"loss", day:"Sunday 7 June", date:"Sun 7 Jun",
    legs:[ {n:"Carlton Blues to Win",ok:true,sc:"won 72–67"}, {n:"Harry McKay 2+ Goals",ok:true,sc:"kicked 3 — cleared 2+"}, {n:"Over 177 Total Points",ok:false,sc:"only 139 — went under"} ] },

  { rd:"NRL R14 + AFL R13", code:"CROSS", match:"4-leg cross-sport multi", type:"SGM", sel:"4-Leg Cross-Sport Multi", odds:3.55, result:"loss", day:"Sunday 7 June", date:"Sat–Sun 6–7 Jun",
    legs:[ {n:"Dolphins to Win",ok:true,sc:"won 40–14"}, {n:"Gold Coast Suns to Win",ok:false,sc:"lost — Brisbane by 31"}, {n:"Fremantle to Win",ok:true,sc:"won by 124"}, {n:"Carlton to Win",ok:true,sc:"won 72–67"} ] },

  { rd:"Round 14", code:"NRL", match:"Cowboys v Dolphins", type:"H2H", sel:"Dolphins", odds:1.55, result:"win", day:"Saturday 6 June", date:"Sat 6 Jun", tag:"STRONG",
    note:"Comfortable in Townsville, 40–14 — a full-strength Dolphins were too good." },

  { rd:"Round 13", code:"AFL", match:"North Melbourne v Fremantle", type:"SGM", sel:"Fremantle Win + Amiss 3+ + Under", odds:3.50, result:"loss", day:"Saturday 6 June", date:"Sat 6 Jun",
    legs:[ {n:"Fremantle Dockers to Win",ok:true,sc:"won by 124"}, {n:"Jye Amiss 3+ Goals",ok:false,sc:"kicked 2 — needed 3"}, {n:"Under 178.5 Total Points",ok:false,sc:"186 scored — went over"} ] },

  { rd:"Round 13", code:"AFL", match:"Gold Coast v Brisbane", type:"H2H", sel:"Gold Coast Suns", odds:1.54, result:"loss", day:"Saturday 6 June", date:"Sat 6 Jun", tag:"STRONG",
    note:"QClash boilover — Brisbane ran out 106–75 on the road." },

  { rd:"Round 13", code:"AFL", match:"Adelaide v Geelong", type:"H2H", sel:"Geelong Cats", odds:1.54, result:"loss", day:"Thursday 4 June", date:"Thu 4 Jun", tag:"STRONG",
    note:"Heartbreaker — Adelaide by a single point, 75–74." }
];

window.HERO_RECORD = [
  { rd:"NRL R14 + AFL R13", code:"CROSS", match:"5-leg hero multi", type:"SGM", sel:"5-Leg Hero Multi 🚀", odds:30.00, result:"loss", day:"Sunday 7 June", date:"Sat–Sun 6–7 Jun",
    note:"Four of five landed — only Amiss's third goal got away. So close.",
    legs:[ {n:"Dolphins to Win",ok:true,sc:"won 40–14"}, {n:"Brian To'o — Try",ok:true,sc:"scored 2 tries"}, {n:"William Kennedy — Try",ok:true,sc:"scored"}, {n:"Jake Waterman — 3+ Goals",ok:true,sc:"kicked 3 — cleared"}, {n:"Jye Amiss — 3+ Goals",ok:false,sc:"kicked 2 — needed 3"} ] }
];
