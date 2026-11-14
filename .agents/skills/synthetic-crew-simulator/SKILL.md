---
name: synthetic-crew-simulator
description: Build and extend the synthetic 4-person crew generator and scripted scenarios (SEP radiation event with sleep loss, CO2 creep, early infection, post-EVA cardiovascular strain, behavioral drift, crew medical officer incapacitated). Use whenever you need demo data, ground-truth labels for validation, a new scenario, or deterministic test fixtures. Trigger on "simulate", "fake data", "scenario", "demo data", "crew".
---
# Synthetic crew simulator

Location: `services/engine/tether_engine/simulate/`.

## Requirements
- Deterministic: every generator takes `seed`. Same seed => identical CSV/JSON.
- 4 crew with distinct baselines (resting HR, temp, sleep duration, HRV, PVT RT), circadian rhythm, measurement noise, sensor dropouts, and realistic missing data.
- Mission phases: pre-launch baseline (>= 10 days), transit, EVA days, mission "quiet" days. Context column on every row (rest/exercise/sleep/EVA).
- **Ground truth sidecar**: each scenario writes `labels.json` (onset day, affected indicators, expected level). Validation compares engine output to labels; the engine must never read labels.
- Mark everything `source: synthetic`.

## Demo scenarios (build in this order)
1. `sep_sleep_loss` — solar particle event (replayed from real GOES shape) + cabin disruption -> sleep down, HR up, PVT lapses up in one crew member.
2. `co2_creep` — slow cabin CO2 rise -> headaches, PVT slowing, vision self-test drift (SANS-adjacent hook); shows hostile-environment coupling.
3. `cmo_fever` — the crew medical officer develops fever/infection pattern; any crew member must run the protocol; shows delay-aware ground messaging.
4. (stretch) `post_eva_cv` — orthostatic intolerance after EVA.

## Effect sizes
Keep them modest and parameterized (`effect_sd`, `onset_day`, `duration`). Include a **mild** variant per scenario; honest recall on mild changes beats a perfect score on cartoonish ones. Do not copy numbers from the scenarios into engine thresholds.

## Output
`data/synthetic/<scenario>/<seed>/{readings.parquet|csv, events.json, labels.json}` + a manifest line. Add a pytest that regenerates with the same seed and compares hashes.
