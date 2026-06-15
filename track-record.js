/* ════════════════════════════════════════════════════════════════
   THE PUNTERS DEN — TRACK RECORD  (single source of truth)
   Read by results.html (the Scoreboard) and index.html (landing stats).

   Add each tip as you grade it after a round. NEWEST AT THE TOP.
   Staking is FLAT — 1 unit per tip. Win = (odds − 1), loss = −1, push = 0.

   ── ROW FORMAT ──────────────────────────────────────────────────
   {
     rd:     "Round 14",                // round label (NRL & AFL differ!)
//     wk:     "NRL R14 · AFL R13",      // weekly slate label — SAME for every row in a weekend (used by the Scoreboard round filter)
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
  { rd:"Round 14", wk:"NRL R15 · AFL R14", code:"AFL", match:"North Melbourne v West Coast", type:"H2H", sel:"North Melbourne", odds:1.59, result:"win", day:"Saturday 13 June", date:"Sat 13 Jun", tag:"VALUE",
    note:"Nailbiter at Optus — North held on 74–73, by a point." },

  { rd:"Round 15", wk:"NRL R15 · AFL R14", code:"NRL", match:"Eels v Raiders", type:"H2H", sel:"Canberra Raiders", odds:1.65, result:"loss", day:"Saturday 13 June", date:"Sat 13 Jun", tag:"STRONG",
    note:"Eels pinched it 15–12 — Parramatta's patched-up spine held on." },

  { rd:"NRL R15 + AFL R14", wk:"NRL R15 · AFL R14", code:"CROSS", match:"3-leg cross-sport multi", type:"SGM", sel:"3-Leg Cross-Sport Multi", odds:4.50, result:"loss", day:"Saturday 13 June", date:"Fri–Sun 12–14 Jun",
    legs:[ {n:"Dolphins to Win",ok:true,sc:"won 48–10"}, {n:"Canberra Raiders to Win",ok:false,sc:"lost — Eels 15–12"}, {n:"GWS Giants to Win",ok:false,sc:"lost — St Kilda by 8"} ] },

  { rd:"Round 14", wk:"NRL R15 · AFL R14", code:"AFL", match:"Geelong v Gold Coast", type:"SGM", sel:"Geelong Win + Martin + Mannagh", odds:3.50, result:"loss", day:"Friday 12 June", date:"Fri 12 Jun",
    legs:[ {n:"Geelong Cats to Win",ok:true,sc:"won 105–60"}, {n:"Jack Martin — Anytime Goal",ok:false,sc:"didn't goal"}, {n:"Shaun Mannagh — Anytime Goal",ok:false,sc:"didn't goal"} ] },

  { rd:"Round 15", wk:"NRL R15 · AFL R14", code:"NRL", match:"Dolphins v Roosters", type:"SGM", sel:"Dolphins Win + Isaako + Farnworth", odds:3.50, result:"loss", day:"Friday 12 June", date:"Fri 12 Jun",
    legs:[ {n:"Dolphins to Win",ok:true,sc:"won 48–10"}, {n:"Jamayne Isaako — Anytime Try",ok:false,sc:"no try — kicked 7 goals"}, {n:"Herbie Farnworth — Anytime Try",ok:true,sc:"scored"} ] },

  { rd:"Round 15", wk:"NRL R15 · AFL R14", code:"NRL", match:"Rabbitohs v Broncos", type:"SGM", sel:"Rabbitohs Win + Johnston + Fifita", odds:4.00, result:"win", day:"Thursday 11 June", date:"Thu 11 Jun",
    legs:[ {n:"Rabbitohs to Win",ok:true,sc:"won 48–6"}, {n:"Alex Johnston — Anytime Try",ok:true,sc:"scored 4"}, {n:"David Fifita — Anytime Try",ok:true,sc:"scored"} ] },

  { rd:"Round 14", wk:"NRL R14 · AFL R13", code:"NRL", match:"Wests Tigers v Penrith", type:"SGM", sel:"Penrith Win + To'o + Yeo", odds:8.00, result:"win", day:"Sunday 7 June", date:"Sun 7 Jun",
    legs:[ {n:"Penrith Panthers to Win",ok:true,sc:"won 68–0"}, {n:"Brian To'o — Anytime Try",ok:true,sc:"scored 2 tries"}, {n:"Isaah Yeo — Anytime Try",ok:true,sc:"scored"} ] },

  { rd:"Round 14", wk:"NRL R14 · AFL R13", code:"NRL", match:"Cronulla v St George Illawarra", type:"SGM", sel:"Sharks Win + Kennedy + Nikora", odds:8.00, result:"win", day:"Sunday 7 June", date:"Sun 7 Jun",
    legs:[ {n:"Cronulla Sharks to Win",ok:true,sc:"won 34–12"}, {n:"William Kennedy — Anytime Try",ok:true,sc:"scored"}, {n:"Briton Nikora — Anytime Try",ok:true,sc:"scored"} ] },

  { rd:"Round 13", wk:"NRL R14 · AFL R13", code:"AFL", match:"Essendon v Carlton", type:"SGM", sel:"Carlton Win + McKay 2+ + Over", odds:3.00, result:"loss", day:"Sunday 7 June", date:"Sun 7 Jun",
    legs:[ {n:"Carlton Blues to Win",ok:true,sc:"won 72–67"}, {n:"Harry McKay 2+ Goals",ok:true,sc:"kicked 3 — cleared 2+"}, {n:"Over 177 Total Points",ok:false,sc:"only 139 — went under"} ] },

  { rd:"NRL R14 + AFL R13", wk:"NRL R14 · AFL R13", code:"CROSS", match:"4-leg cross-sport multi", type:"SGM", sel:"4-Leg Cross-Sport Multi", odds:3.55, result:"loss", day:"Sunday 7 June", date:"Sat–Sun 6–7 Jun",
    legs:[ {n:"Dolphins to Win",ok:true,sc:"won 40–14"}, {n:"Gold Coast Suns to Win",ok:false,sc:"lost — Brisbane by 31"}, {n:"Fremantle to Win",ok:true,sc:"won by 124"}, {n:"Carlton to Win",ok:true,sc:"won 72–67"} ] },

  { rd:"Round 14", wk:"NRL R14 · AFL R13", code:"NRL", match:"Cowboys v Dolphins", type:"H2H", sel:"Dolphins", odds:1.55, result:"win", day:"Saturday 6 June", date:"Sat 6 Jun", tag:"STRONG",
    note:"Comfortable in Townsville, 40–14 — a full-strength Dolphins were too good." },

  { rd:"Round 13", wk:"NRL R14 · AFL R13", code:"AFL", match:"North Melbourne v Fremantle", type:"SGM", sel:"Fremantle Win + Amiss 3+ + Under", odds:3.50, result:"loss", day:"Saturday 6 June", date:"Sat 6 Jun",
    legs:[ {n:"Fremantle Dockers to Win",ok:true,sc:"won by 124"}, {n:"Jye Amiss 3+ Goals",ok:false,sc:"kicked 2 — needed 3"}, {n:"Under 178.5 Total Points",ok:false,sc:"186 scored — went over"} ] },

  { rd:"Round 13", wk:"NRL R14 · AFL R13", code:"AFL", match:"Gold Coast v Brisbane", type:"H2H", sel:"Gold Coast Suns", odds:1.54, result:"loss", day:"Saturday 6 June", date:"Sat 6 Jun", tag:"STRONG",
    note:"QClash boilover — Brisbane ran out 106–75 on the road." },

  { rd:"Round 13", wk:"NRL R14 · AFL R13", code:"AFL", match:"Adelaide v Geelong", type:"H2H", sel:"Geelong Cats", odds:1.54, result:"loss", day:"Thursday 4 June", date:"Thu 4 Jun", tag:"STRONG",
    note:"Heartbreaker — Adelaide by a single point, 75–74." }
];

window.HERO_RECORD = [
  { rd:"NRL R15", wk:"NRL R15 · AFL R14", code:"NRL", match:"3-leg hero multi", type:"SGM", sel:"3-Leg Hero Multi 🚀", odds:55.00, result:"loss", day:"Saturday 13 June", date:"Thu–Sat 11–13 Jun",
    note:"The Johnston-and-Fifita leg landed, but Khan-Pereira didn't bag two and the Isaako double missed. Long-shot, as billed.",
    legs:[ {n:"Khan-Pereira 2+ Tries",ok:false,sc:"0 tries — Warriors v Sharks"}, {n:"Isaako + Farnworth Try Double",ok:false,sc:"Isaako didn't score"}, {n:"Johnston 2+ Tries + Fifita Try",ok:true,sc:"Johnston 4, Fifita scored"} ] },

  { rd:"NRL R14 + AFL R13", wk:"NRL R14 · AFL R13", code:"CROSS", match:"5-leg hero multi", type:"SGM", sel:"5-Leg Hero Multi 🚀", odds:30.00, result:"loss", day:"Sunday 7 June", date:"Sat–Sun 6–7 Jun",
    note:"Four of five landed — only Amiss's third goal got away. So close.",
    legs:[ {n:"Dolphins to Win",ok:true,sc:"won 40–14"}, {n:"Brian To'o — Try",ok:true,sc:"scored 2 tries"}, {n:"William Kennedy — Try",ok:true,sc:"scored"}, {n:"Jake Waterman — 3+ Goals",ok:true,sc:"kicked 3 — cleared"}, {n:"Jye Amiss — 3+ Goals",ok:false,sc:"kicked 2 — needed 3"} ] }
];
