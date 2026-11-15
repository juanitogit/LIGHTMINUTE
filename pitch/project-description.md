# Project description (Space Apps project page)

## Summary

LIGHTMINUTE is an experimental health-monitoring prototype for long missions.
It compares synthetic crew readings with individual baselines, presents
uncertainty and explains the reasoning behind demonstration actions. Its
deterministic engine can run on the device; an LLM is optional.

**Synthetic demonstration. Not a medical device or a diagnostic system.**

## Problem and approach

Long missions can limit access to timely advice from Earth. LIGHTMINUTE explores
how a crew might inspect changes in health indicators and prepare a report while
communications are delayed. The engine calculates the numbers and urgency;
an optional language model can explain them only through a verifier, with a
template fallback. The prototype also provides a simulated ground link and
historical public space-weather context.

## Evidence: separate datasets and claims

| Evidence | Result | Meaning and limitation |
|---|---|---|
| MMASH, real terrestrial wearable data | **66% → 93%** | The earlier guard and a timestamp-aware exploratory repetition, respectively. The same data had already been examined; this is not an independent evaluation or evidence of clinical detection. |
| Synthetic simulator | **95%** | Pooled interval coverage in the project's own simulation; it does not establish performance on real crews. |
| Adaptive conformal experiment | Synthetic research | Separate experiment; it does not feed the product's decisions and has no claimed clinical guarantee. |
| NASA OSD-575 | **n=4** | Exploratory postflight comparisons; no demonstrated causality, clinical sensitivity or literature-direction concordance. |

The autonomy analysis is exploratory, based on the earlier engine revision
`6deea70`. Its conservative time-resolution rule did not demonstrate an
advantage over the simulated Earth response. We do not claim a proven autonomy
benefit. Details: [autonomy results](../docs/autonomy/RESULTS.md),
[public-data results](../ml/proxy/RESULTS.md), and
[timestamp-aware check](../ml/proxy/CADENCE-CHECK.md).

## Limitations and disclosures

| Source | How accessed | Used for | Does not show |
|---|---|---|---|
| [NASA OSD-575](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575) | Public research file, retrieved 2026-11-14 | Exploratory postflight comparisons | Clinical validation or live crew data |
| [NASA DONKI](https://ccmc.gsfc.nasa.gov/DONKI/api/) | Build-time snapshots, retrieved 2026-11-14 | Historical space-weather context | Individual radiation dose or a forecast |
| [NOAA GOES](https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json) | Build-time snapshot, retrieved 2026-11-14 | Historical solar proton context | Individual radiation dose |

### NASA Data field (proposed)

LIGHTMINUTE uses public NASA OSDR study OSD-575 for exploratory comparisons of Inspiration4 serum chemistry and historical NASA DONKI event snapshots for space-weather context. The crew scenarios are synthetic. These sources do not establish clinical performance or individual radiation dose. No LSAH or restricted LSDA astronaut medical records were used; applicable LSAH/LSDA records are available by request. OSD-575 itself contains public biomedical research data from private astronauts. Data are courtesy of the NASA Open Science Data Repository (https://osdr.nasa.gov/bio/repo). AI-assisted development is disclosed below.

All crew-facing scenarios are synthetic. NOAA space-weather data are historical,
not a personal radiation dose. The ground link is a local simulation, and the
public static website does not supply the Python backend. The prototype has not
been validated for real patients or real crews. AI tools assisted development;
the project team remains responsible for reviewing its claims and outputs.
