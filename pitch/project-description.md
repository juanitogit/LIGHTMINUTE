# Project description (Space Apps project page)

## Summary (short version)
TETHER is health-monitoring and decision-support software for astronauts on long missions.
Instead of comparing a crew member to a population average, it learns that person's own
baseline, reads coordinated changes across indicators, and turns them into a short, cited
**Decision Card**: what changed, how confident we are, what to do on board right now, when to
escalate, and what to send to Earth when the answer will take twenty minutes to arrive.
It runs without a network and without an LLM.

**Prototype, synthetic crew data. Not a medical device.**

## The problem
The challenge brief is explicit: long missions expose crews to radiation, isolation, altered
gravity and a closed environment, and astronauts carry much of the responsibility for noticing
their own changes. On Mars, the crew is the first responder by physics, not by choice: one-way
light time is 3–22 minutes. Two things follow. First, "normal" cannot mean "average of the
population" — a four-person crew is four individuals, and population rules mis-fire on the
athlete and stay silent on the person who is drifting. Second, a dashboard that shows numbers
is not enough; the crew needs a recommendation they can act on, with its uncertainty attached.

## How it works
1. **Ingest and QC** — vital signs, wearable signals, cabin environment, space weather and
   manual check-ins; dropouts are dropped and logged, never imputed silently.
2. **Per-person baseline (N-of-1)** — a Normal-Inverse-Gamma conjugate model per indicator with
   a weak population prior, a forgetting factor, and a Student-t predictive interval. Every
   reading is scored *before* it updates the baseline, so a value never judges itself.
3. **Change detection** — CUSUM for small sustained shifts, plus a directional syndrome score
   that combines several weak movements (heart rate up, temperature up, sleep down, reaction
   time slower) into one interpretable number.
4. **Crew attribution** — if several crew members shift in the same window, the system says
   "check the cabin first" instead of blaming a person.
5. **Three-lens verdict** — Earth rule, space-adapted rule and the personal baseline, with the
   disagreement named (`hidden_in_range`, `expected_for_you`, …).
6. **Decision Card** — a deterministic engine sets the level and every number. The LLM only
   writes; a verifier rejects invented numbers, fake citations, any changed urgency and diagnostic
   language, and falls back to a template. Unplug the LLM and the product still works.
7. **Ground link** — routing aware of light delay, consent tiers per data type, and a
   hash-chained audit log of what was seen and done.

## What NASA data and resources are used
- **NOAA SWPC GOES** integral proton flux — a real, checksummed snapshot (2026-11-14) drives the
  space-weather context and the radiation panel; the NOAA S-scale is applied to the ≥10 MeV channel.
- **NASA HRP** risk framing, the HRP core-temperature RFI and the HRP *Artemis II Data
  Methodology Challenge* results inform the small-sample, individual-level method.
- **PhysioNet MMASH** (22 healthy adults, wearable HR) is used as a *proxy* to test whether our
  confidence intervals are honest on real noise.
- **NASA OSDR / Inspiration4** is cited as the reason n=4 methods matter; the dataset was **not**
  downloaded during the event (the API endpoints we tried returned 404), and no number from it
  is quoted.

## What is synthetic
All crew members, all scenarios, and every recall, delay and calibration figure come from our
own simulator. MMASH is real public data but is labelled `proxy`; NOAA is `real-public`. There is
no real astronaut health data anywhere in this project.

## Validation (and where it loses)
At an equal false-alarm budget of about 0.1 per crew-week, on 500 simulated crew members per
effect size: the syndrome score detects a mild coordinated change 71% of the time versus 18%
for a population threshold, and 96% versus 38% for a moderate change. In a heterogeneous crew
the population rule collapses to 27% on strong effects while the personal methods hold at 89–100%.
Our 95% intervals cover 95% of healthy days. Missing readings degrade recall from 93% to 76%.

The honest part: on real wearable data our interval covered only **21.6%** of minutes. We traced
it to a forgetting-factor defect in our own model, fixed it in the engine, re-ran every
experiment and published the diagnostic: the shipped model covers **93.4%** of those minutes and
95% at 2,000 updates instead of 16%. It also showed us that single-indicator N-of-1 is
*not* dramatically better than a population rule in a homogeneous crew — the gains come from the
syndrome score, CUSUM and heterogeneity, and that is what we claim.

## Impact
A crew that can recognise a change, understand how sure the system is, and act before Earth
replies. The scenario we designed the product around is the uncomfortable one: the crew medical
officer is the patient, and someone else has to run the protocol.

## Limitations
Not a medical device, no diagnosis, no medication doses, synthetic data only, no clinical
validation. The syndrome score uses a clinical direction as a prior and is blind to other
directions. Behavioural indicators are exploratory. The forgetting-factor defect we found on real data is fixed
and guarded by a regression test: minute-level streaming was its weak spot and no longer is a
known-failing path, though it is still not clinically validated. See `docs/model-card.md` and `docs/data-card.md`.

## AI use disclosure
DeepSeek V4.1 Flash and coding agents assisted with implementation, analysis and drafting. The
team reviewed and owns all modelling decisions, thresholds, claims and text. The product's LLM
is optional, replaceable, and constrained by a deterministic verifier.

## Evento y equipo

**Evento:** Space Apps Challenge Neiva 2026. **Cierre:** 15 de noviembre de 2026, 23:59, America/Bogota (UTC−5). Datos confirmados por el usuario; no se presentan como verificación externa de las bases.

Plan previo al cierre: congelación el 15 de noviembre a las **19:59** y envío previsto a las **20:59**, en la misma zona horaria. Son hitos planificados, no acciones completadas. El propietario conserva la autorización exclusiva del push.

| Integrante | Rol |
|---|---|
| Abel Orlando Ramírez Amaya | Backend & Tester |
| Pablo Trujillo Artunduaga | Backend & Tester |
| Juan Sebastián Tafurth Cortes | DevOps & Documentación |
| Simón Santiago Puentes Peña | Documentación & Base de Datos |
| Juan Esteban Bustos Chilatra | Frontend & Backend & Chatbot |
| José David Correa Núñez | Frontend & DevOps & CI/CD |


## Explanation policy

The LLM must preserve `level` and `confidence` exactly and copy `what_changed`, `do_now`,
`monitor`, `escalate_if` and `ground_message` verbatim from the deterministic
template. It may vary the headline and explanation (`why_it_matters`) without
numbers, subject to verification. Wording filters are defense in depth, not a
semantic clinical guarantee. The product remains a nonclinical prototype.
