# ROLE: Agent A1 - Engine core & scenarios
You are one of 7 agents building LIGHTMINUTE in parallel. HARD LIMIT: 60 minutes. Work fast, stay in your lane.

## Project in 5 lines
LIGHTMINUTE = health-monitoring + decision-support software for astronauts (NASA Space Apps 2026, challenge "Create Health Monitoring Software for Astronauts on Space Missions"). Deterministic Bayesian N-of-1 engine decides; LLM (DeepSeek `deepseek-flash`) only explains behind a verifier; all data is SYNTHETIC or labelled public proxy. Not a medical device. Repo is already scaffolded: 23 tests pass (`python3 scripts/run_tests.py`).

## Read first (max 3 minutes)
`AGENTS.md`, `.agents/skills/tether-product-brief/SKILL.md`, then: `bayesian-n-of-1-engine`, `synthetic-crew-simulator`, `three-lens-verdict`, `nasa-hrp-risk-mapping`

## Ownership (HARD RULE)
You may create/edit ONLY these paths:
- `services/engine/tether_engine/__init__.py`
- `services/engine/tether_engine/bayes/`
- `services/engine/tether_engine/crew/`
- `services/engine/tether_engine/ground/`
- `services/engine/tether_engine/hazards/`
- `services/engine/tether_engine/protocols/`
- `services/engine/tether_engine/qc/`
- `services/engine/tether_engine/simulate/`
- `services/engine/tether_engine/lenses.py`
- `services/engine/tether_engine/audit.py`
- `services/engine/tether_engine/pipeline.py`
- `services/engine/tests/test_nof1.py`
- `services/engine/tests/test_syndrome.py`
- `services/engine/tests/test_crew_ground_space.py`
- `services/engine/tests/test_lenses_thresholds.py`
- `services/engine/tests/test_simulate`
- `services/engine/tests/test_pipeline`
- `services/engine/tests/test_qc`
- `scripts/export_demo_json.py`
- `kb/thresholds.json`
- `kb/syndromes.json`
- `data/synthetic/`
- `apps/crew-tablet/public/demo-data.json`
- `apps/crew-tablet/public/data/scenario-`
- `handoff/a1.md`
You must NOT edit anything else, even to fix a bug or add a missing dependency. Write the request in `handoff/a1.md` (what, which file, suggested fix) and continue. A CI-style check (`scripts/check_ownership.py`) rejects your branch if you touch foreign files.

## Frozen contracts (read-only for everyone)
`docs/DEMO_DATA_CONTRACT.md` (scenario JSON; additive optional fields only, owner A1 announces them in handoff/a1.md), `llm/schemas/decision_card.schema.json`, `agents/OWNERS.json`.
Interfaces between agents:
- `tether_engine.pipeline.run_scenario(name:str, seed:int=0, days:int=24) -> dict` (A1; matches the contract). Until it exists, read `apps/crew-tablet/public/demo-data.json`.
- Scenario files: `apps/crew-tablet/public/data/scenario-<name>.json` + `scenario-index.json` (A1). Names: `cmo_fever`, `sep_sleep_loss`, `co2_creep`.
- API (A2): `GET /api/health`, `GET /api/scenarios`, `GET /api/scenario/{name}`, `POST /api/card {scenario,crew,day}`, `GET /api/llm-stats`. Front ends must fall back to the static JSON when the API is down.
- Static data for UI: `public/data/validation.json`, `public/data/radiation.json` (A5).
- Protocol runner (A4): ES module `packages/protocol-runner/index.js` exporting `mountProtocolRunner(el, {protocolId, onStep, onDone})`.

## Invariants (never violate)
Engine decides numbers/urgency; LLM never lowers urgency, invents numbers or citations. No diagnosis language. Synthetic data only, always labelled. Never invent thresholds, sources, endpoints, or results: use `unverified`/`demo-parameter`. No secrets in git. Keep `python3 scripts/run_tests.py` green.

## Git protocol
Work in your own worktree (`../tether-a1`), branch `agent/a1`. Commit every ~10 min, message prefix `a1:`. At T+25 and T+45 update `handoff/a1.md` (DONE / INTERFACES you expose / KNOWN ISSUES / REQUESTS to other agents) and commit. Do not merge, rebase main, or touch other worktrees. STOP at T+50.

## Timeline (T = start)
T+0-25 build core (P0) - T+25 first merge by A7 - T+25-45 finish P1, fix integration issues - T+45 freeze - T+45-60 only bug fixes requested by A7.

## Mission
Make the engine produce the three demo scenarios end-to-end and expose ONE stable function for everyone else.

## Tasks
P0 (T+0-15) `tether_engine/pipeline.py`: `run_scenario(name, seed=0, days=24) -> dict` returning exactly the shape in `docs/DEMO_DATA_CONTRACT.md` (move the logic out of `scripts/export_demo_json.py`, keep that script as a thin wrapper). Announce in handoff/a1.md the moment it works.
P0 (T+0-30) `simulate/scenarios.py`: `cmo_fever` (crew medical officer develops fever-like syndrome), `sep_sleep_loss` (solar particle event + sleep loss), `co2_creep` (slow cabin CO2 rise affecting several crew -> exercises `crew/attribution.py` shared mode). Each: `mild` and `strong` variants, deterministic by seed, per-scenario `labels.json` sidecar in `data/synthetic/<name>/<seed>/` (engine NEVER reads labels). Add circadian rhythm, sensor dropouts, and context column.
P0 `qc/basic.py`: drop NaN/impossible values, log what was dropped, never crash on missing data. Wire into pipeline.
P0 Export: `apps/crew-tablet/public/data/scenario-<name>.json` (+`scenario-<name>-mild.json`) and `scenario-index.json` (name, title, description, crew, days, onset_day).
P1 Additive per-day field `hazards` (s_scale from `hazards/space_weather.py`, cabin_co2) and extra indicators `co2_ppm`, `headache_score` with entries in `kb/thresholds.json` (each with hrp_risk + hazard; unsourced values labelled `demo-parameter`).
P1 Require attribution persistence (2 consecutive days) in the pipeline's output; keep `crew/attribution.py` API stable.

## Tests (must add)
Determinism by seed (hash equality) - strong variants reach level `act` for the affected crew member within 5 days of onset with <=1 false `act` per crew-week before onset - `co2_creep` yields `attribution.mode == "shared"` at some point - QC handles 40% dropouts without exceptions.

## Done when
`python3 scripts/run_tests.py` green; 3 scenario files + index exist; contract validated by a test that loads each file.
