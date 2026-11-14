---
name: nasa-hrp-risk-mapping
description: Maps astronaut health indicators to NASA Human Research Program risks and the five spaceflight hazards (radiation, isolation/confinement, distance from Earth, altered gravity, hostile/closed environment). Use whenever you add or change an indicator, alert, scenario, or KB entry, write clinical-sounding copy, or must justify "why do we measure this?" to a NASA judge. Trigger on any mention of immune, bone, cardiovascular, SANS, behavioral health, radiation, CO2, sleep, or HRP.
---
# Indicator <-> HRP risk mapping

Sources checked 2026-11-13: nasa.gov/hrp/risks, nasa.gov/human-system-risks, Patel et al. 2020 "Red risks for a journey to the red planet" (npj Microgravity, PMC7645687). NASA lists 30+ risks; "red" priority for Mars: space radiation (cancer, cardiovascular, cognitive), SANS, behavioral health/performance, inadequate food/nutrition.

| HRP risk | Hazard driver | Indicators we can plausibly gather | Engine treatment |
|---|---|---|---|
| Altered immune response | radiation, stress, isolation, gravity | resting temp, rash/symptom log, sleep, point-of-care WBC/lymphocytes (if available) | N-of-1 + CUSUM; symptom bundle |
| Cardiovascular adaptations | gravity, radiation | resting HR, HRV, orthostatic BP/HR, post-EVA recovery HR | N-of-1 per context (rest/exercise) |
| Bone fracture / renal stone | gravity | exercise load adherence, back pain, hydration, urine-calcium if available | adherence trend + risk flags |
| SANS (neuro-ocular) | gravity/fluid shift | near-vision self test, headache log, CO2 exposure | self-test deltas vs own baseline |
| Behavioral health / team | isolation, distance | sleep, mood check-in, PVT-B lapses, interaction log | N-of-1 on PVT + check-in |
| Radiation (cancer, CV, cognitive) | radiation | dose rate, cumulative dose, SEP events | cumulative budget + event context |
| Hostile/closed environment | closed environment | cabin CO2, temp, humidity | threshold + exposure-time |
| Core body temperature (HRP RFI, closed 2026-10-14) | gravity, exercise, EVA | core/skin temp 24h | circadian+exercise-aware baseline |

## Rules
- Every indicator row in code must carry `hrp_risk` and `hazard` fields. No orphan indicators.
- Correlation is not causation: radiation/hazard context *modulates priors and wording*, it never "causes" an alert on its own.
- Behavioral indicators are exploratory: label confidence low, never pathologize.
- Reference ranges: use NASA-STD-3001 (Vol. 1/2) where cited; otherwise mark `unverified` in `kb/evidence.yaml`.
- Mission context changes the story: ISS (no delay), Moon (~1.3 s), Mars (3–22 min one-way). Put it in config, not hard-coded.
