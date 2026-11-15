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

## Use of AI

AI was used in three separate ways. Evidence for each statement is collected in
[`docs/ai/INVENTORY.md`](../docs/ai/INVENTORY.md); gaps are listed in
[`docs/ai/OPEN-QUESTIONS.md`](../docs/ai/OPEN-QUESTIONS.md).

**Development assistance.** Development used coding agents and assistants:
OpenCode (`opencode/deepseek-v4.1-flash-free`),
Freebuff (`DeepSeek V4.1 Flash Slow`) and Antigravity (`Gemini 3.8 Flash
(Medium)`, `Claude Sonnet 4.6 (Thinking)`), as recorded in `docs/prompts/`.
Twenty-seven commits carry a `Co-Authored-By: Codebuff` trailer. The team
reviewed and owns every change.

**Optional explanation layer in the product.** The deterministic engine computes
every number and urgency level. A hosted model (`openai/gpt-oss-120b` through the
Groq API) may only rewrite those facts as a Decision Card. A deterministic
verifier rejects invented citations, changed numbers, lowered urgency, diagnosis
and dosing, and the product falls back to a template card. It runs with no model
at all (`LLM_PROVIDER=none`). The repository contains no recorded live model
call; the project audit states that none was made in that session, and the
template path is what the demo uses.

**An experimental small language model, not integrated.** A LoRA adapter on
`Qwen/Qwen2.5-0.5B-Instruct` was trained on synthetic cards written by free-tier
hosted models and evaluated offline. It did not meet its pre-set gates: 2,125
training rows against a 4,000-row bar, and no human review. It is not imported by
the product. See
[`docs/ai/MODEL-CARD.md`](../docs/ai/MODEL-CARD.md).

Not AI: the anatomical meshes are CC-licensed (NIH 3D, BodyParts3D, HRA), the
logo is owner-supplied, and the simulator is deterministic code. No shipped
image, video or audio is described as AI-generated anywhere in the repository;
that check was textual, not a visual review of every asset. The Bayesian
N-of-1 baseline and the conformal experiment are classical statistics, not model
training. Browser dictation uses the Web Speech API, so the browser vendor may
receive microphone audio; the interface states this and dictation is optional.

Limitations: the LLM layer is optional and has not been verified in live
operation; the trained model is a partial feasibility result, not a shipped
feature; no AI component is a medical device or provides diagnosis.
