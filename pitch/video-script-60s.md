# 60-second video script

Constraints: English, judge-facing, no claim we cannot defend, one idea per shot.
Everything on screen is real engine output from `apps/crew-tablet/prototype/three-lens.html`
(seed 0, synthetic crew). Record at 1280×720, dark theme, no cursor hunting.

| Time | Visual | Voice-over |
|---|---|---|
| 0:00–0:08 | Black. Text: "Mars is 20 light-minutes away." | "Mars is twenty light-minutes away. When the crew doctor is the one who's sick — who decides?" |
| 0:08–0:18 | Three-lens screen, day 10. All three lenses read normal. | "TETHER learns each astronaut's own normal. Not the average of four people — one person's baseline, with an honest confidence band." |
| 0:18–0:30 | Drag the day slider to 15 → 16. Earth lens still "Normal 68.5 bpm"; personal lens flips to "Unusual for you". Pattern banner: `hidden_in_range`. | "Day sixteen. His heart rate is perfectly normal for the population. It is not normal for him. A fixed range stays silent exactly here." |
| 0:30–0:40 | Syndrome chart crosses the 2.33 line while no single indicator leaves its band. Card appears: level `act`, three "do now" steps. | "No single signal crossed a line. Four weak signals moved together — that is the early warning." |
| 0:40–0:50 | Split screen: validation table (71% vs 18%, 27% vs 100%) and model card line "21.6% → 93.4%, defect found and fixed". | "Seventy-one percent detection on mild changes where a population rule finds eighteen. And when real data broke our own intervals, we published the defect and the fix." |
| 0:50–0:60 | Card with ground message and countdown "Mars, ~11 min one-way"; then logo + repo URL. | "Action on board first, a self-contained message to Earth second. TETHER — decision support for crews that cannot wait." |

## Shot list / exact actions
1. Open `apps/crew-tablet/prototype/three-lens.html` in a clean window (no other tabs, hidden bookmarks bar).
2. Default state is day 16 — that is the money shot. For the "before", set the slider to 10 first.
3. Move the slider slowly from 14 → 16; do not jump, the change should be visible.
4. Hover nothing; the card is already on screen. Do not scroll — everything fits at 1280×720.
5. If the validation table is needed on screen, use a still image of `docs/validation.md`, not a live scroll.

## Plan B (record this version too)
If the laptop or the browser misbehaves: use the still screenshots, keep the same voice-over.
No network is required at any point, so there is no "live data" risk in this script.

## Claims you may say (and may not)
- ✅ "normal for the population, unusual for him" (matches `lens.pattern = hidden_in_range`).
- ✅ "71% vs 18% on mild changes at the same false-alarm budget" (`docs/validation.md`).
- ✅ "our 95% interval covered 21.6% of real minutes before the fix; the shipped model reads
  93.4%" (`ml/proxy/README.md`).
- ❌ "detects illness", "clinically validated", "medical grade", any percentage of diagnostic accuracy.
