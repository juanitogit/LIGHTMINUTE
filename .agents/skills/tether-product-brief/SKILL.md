---
name: tether-product-brief
description: Core context for the LIGHTMINUTE astronaut health-monitoring project (NASA Space Apps 2026). Load this FIRST whenever you plan features, prioritize scope, write README/pitch text, or are unsure what the product is for. Use it any time someone asks "should we build X?", "what's in the MVP?", or "how do we differ from other teams?", even if they do not mention LIGHTMINUTE by name.
---
# LIGHTMINUTE — product brief

**Challenge (verbatim intent):** build health-monitoring software that gathers health indicators and lets astronauts *evaluate and act* on their own health on long missions (radiation, isolation, altered gravity, closed environment -> immune, bone, cardiovascular, behavioral risks).

**One-line thesis:** Don't build another vitals dashboard. Build the *autonomous medical reasoning layer* for Earth-independent crews: personal baselines (N-of-1 Bayesian), hazard-aware context, and cited, uncertainty-honest **Decision Cards** that say what to do now and what to send to Earth.

## Why this wins (map to judging: Impact, Creativity, Validity, Relevance, Presentation)
1. **Validity** — engine follows the small-sample N-of-1 Bayesian direction NASA HRP itself just rewarded (Artemis II Data Methodology Challenge). Validated on real public n=4 data + honest model card.
2. **Creativity** — LLM never decides; it explains, grounded in a cited KB, behind a deterministic verifier.
3. **Relevance** — covers all four named risk families (immune, bone, cardiovascular, behavioral) + radiation + closed-environment (CO2).
4. **Impact** — works with comms delay (3–22 min one-way at Mars) and when the crew medical officer is the patient.
5. **Presentation** — 3 scripted scenarios, 60-second video, one memorable "aha" (see hackathon-pitch-submission).

## MVP (must) / Should / Could
- MUST: synthetic 4-person crew, N-of-1 engine, 3 scenarios, Decision Cards (LLM + template fallback), crew tablet UI (Glance->Why->Act), radiation/space-weather panel, validation page.
- SHOULD: ground console with delay simulator, PVT-B vigilance test, daily check-in, DeepSeek vision/voice input.
- COULD: PWA offline, signed batches, ASR/TTS hands-free mode.
- NON-GOALS: real medical diagnosis, real patient data, custom hardware, auth systems, native mobile.

## Hard rules
- Engine decides numbers and urgency; LLM only explains. No LLM => product still fully works.
- Synthetic data is always labelled synthetic. Never claim clinical validation.
- Every threshold/claim cites a KB id. Unknown => say "unverified", never invent.

## v2 additions (from competitor study)
Differentiators now include: Three-Lens verdict (`three-lens-verdict`), syndrome early warning, crew-level attribution, delay-aware routing, hash-chained audit, comparative validation with limitations. Positioning and forbidden claims: `competitive-edge`. Protocol flow: `protocol-runner`.


## Owner design revision 2026-11-14

The owner explicitly requested no cards or pills and a pre-existing 3D human instead of the 2D silhouette.
Use Apple HIG content hierarchy, flat lists and inline status labels. A local CC0 GLB is now an adopted
visualization; it produces no health data. See vault/03-Architecture/ADR-006 Interfaz nativa y modelo humano 3D.md.
This owner request supersedes the former avoidance of a 3D body in the visual MVP.
