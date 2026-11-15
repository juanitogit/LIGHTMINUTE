# 3-minute live demo

Everything below runs offline. No API, no key, no network. Rehearse twice; time yourself.

## 0:00–0:20 — Frame the problem
Say: the crew medical officer is the patient, Mars is 3–22 light-minutes away, and with four
people there is no meaningful average.
On screen: the three-lens page at day 10, all normal.

## 0:20–1:00 — Glance → Why
1. Slider to day 14: still `info`, all patterns `concordant_normal`.
2. Slider to day 16: Earth lens `Normal`, personal lens `Unusual for you`, banner
   *"Normal for the population, unusual for you."*
3. Point at the shaded band: "this is his own 95% interval, and it narrows as data arrives" —
   `n` days of data is printed under the lens.
4. Point at the syndrome chart: crosses the 2.33 alert line at day 15, while no single
   indicator leaves its own band.

## 1:00–1:40 — Act
1. Read the card's three `do_now` steps out loud (re-measure after 5 min rest, log temperature
   and sleep, ask a crew buddy to check).
2. Show `escalate_if`: "score stays above the alert line two more days" — a rule, not a vibe.
3. Show the ground message and the countdown: Mars ~11 min one-way, so the policy is
   on-board first, message second, and the message must stand alone.

## 1:40–2:20 — Unplug the LLM
Say: the card on screen is the deterministic template, `card_source: template`; the LLM only
writes prose and can never change a number or lower the level. The product is complete without it.
(If A2 has landed the API by then, do the same step with `LLM_PROVIDER=none` live.)

## 2:20–2:50 — Validity
Open `docs/validation.md` (still image is fine, do not scroll live):
- 71% vs 18% mild recall at the same false-alarm budget.
- Heterogeneous crew: population rule 27% on strong effects, personal methods 89–100%.
- For real wearable data, use the separate MMASH row in `project-description.md`: the
  timestamp-aware result is exploratory, reused known data and needs independent evaluation.
- The earlier synthetic autonomy analysis did not demonstrate a time advantage over the
  simulated Earth response; see `docs/autonomy/RESULTS.md` (revision `6deea70`).

## 2:50–3:00 — Close
"Three lenses, coordinated-shift warning, cited cards, and a validation page that admits what
it does not know. The repo link is on the submission page; thanks."

## Failure drills
| Problem | Do this |
|---|---|
| Laptop dies | Switch to the recorded 60-second video, then talk over the validation still |
| Slider misbehaves | Reload the HTML file; it is self-contained |
| Someone asks for live data | Say plainly: all crew data is synthetic; the NOAA snapshot is the only real feed |
| Someone asks "is it accurate?" | Give the table, the false-alarm budget, and the MMASH defect. Never a single "accuracy" number |

## Things to check before demoing
All of it now exists in the repo: tablet app (`apps/crew-tablet`, `npm run build` passes),
FastAPI service (`services/engine/tether_engine/api/main.py`), ground console
(`apps/ground-console`) and protocol runner (`packages/protocol-runner/demo.html`).
None of those screens has been clicked through by the docs owner, so rehearse them once on the
demo machine before judges see them — and keep the three-lens prototype as the fallback, since
it is the only screen verified end to end.
