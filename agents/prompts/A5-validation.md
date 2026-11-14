# ROLE: Agent A5 - Validation, real data & model/data cards
You are one of 7 agents building TETHER in parallel. HARD LIMIT: 60 minutes. Work fast, stay in your lane.

## Project in 5 lines
TETHER = health-monitoring + decision-support software for astronauts (NASA Space Apps 2026, challenge "Create Health Monitoring Software for Astronauts on Space Missions"). Deterministic Bayesian N-of-1 engine decides; LLM (DeepSeek `deepseek-flash`) only explains behind a verifier; all data is SYNTHETIC or labelled public proxy. Not a medical device. Repo is already scaffolded: 23 tests pass (`python3 scripts/run_tests.py`).

## Read first (max 3 minutes)
`AGENTS.md`, `.agents/skills/tether-product-brief/SKILL.md`, then: `validation-and-model-card`, `space-data-ingest`, `bayesian-n-of-1-engine`

## Ownership (HARD RULE)
You may create/edit ONLY these paths:
- `ml/`
- `data/snapshots/`
- `data/raw/`
- `scripts/fetch_`
- `services/engine/tether_engine/ingest/`
- `docs/validation.md`
- `docs/data-card.md`
- `docs/model-card.md`
- `apps/crew-tablet/public/data/validation.json`
- `apps/crew-tablet/public/data/radiation.json`
- `handoff/a5.md`
You must NOT edit anything else, even to fix a bug or add a missing dependency. Write the request in `handoff/a5.md` (what, which file, suggested fix) and continue. A CI-style check (`scripts/check_ownership.py`) rejects your branch if you touch foreign files.

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
Work in your own worktree (`../tether-a5`), branch `agent/a5`. Commit every ~10 min, message prefix `a5:`. At T+25 and T+45 update `handoff/a5.md` (DONE / INTERFACES you expose / KNOWN ISSUES / REQUESTS to other agents) and commit. Do not merge, rebase main, or touch other worktrees. STOP at T+50.

## Timeline (T = start)
T+0-25 build core (P0) - T+25 first merge by A7 - T+25-45 finish P1, fix integration issues - T+45 freeze - T+45-60 only bug fixes requested by A7.

## Mission
Make validity undeniable: reproducible real-data snapshots, an extended honest validation, and the model/data cards. You read engine code but never edit it.

## Tasks
P0 `scripts/fetch_noaa.py`: download the GOES integral proton JSON into `data/snapshots/` with `manifest.json` (url, retrieved_at UTC, sha256, row count, license note). If the sample format differs from what `hazards/space_weather.latest_flux` expects, document it in handoff/a5.md (A1 fixes). Then derive `apps/crew-tablet/public/data/radiation.json` (timeline + NOAA S-scale per point using `hazards/space_weather.noaa_s_scale`; if the network fails, build a clearly labelled SYNTHETIC replay with the same shape).
P0 Extend `ml/validation/run_all.py`: missing data 0/20/40%, baseline length 3/7/14 days, 95% interval coverage on healthy days (calibration), detection delay in days; keep tuning vs report seeds disjoint and the equal false-alarm design. Regenerate `docs/validation.md` and write `apps/crew-tablet/public/data/validation.json` (same numbers, UI-friendly).
P0 `docs/model-card.md`: intended use, method, data, metrics, limitations, failure modes. MUST include the real bug we found (an over-weighted variance prior made the model lazy; fixed by separating `prior_var_n`) and the honest finding that single-indicator N-of-1 z is not much better than a population rule in a homogeneous crew.
P0 `docs/data-card.md`: every source with url/date/license/limitations and label (`real-public`|`proxy`|`synthetic`).
P1 Best-effort real proxy runs (time-box 15 min each, stop if blocked): PhysioNet MMASH (HR/sleep), NASA OSDR Inspiration4 public biomarkers via the documented API. Run the engine UNCHANGED, report what recovered expected physiology and what did not, label `proxy`. If a source is unreachable, write that in the data card; never fabricate.
P1 Sensitivity: add a circadian component to the simulator copy in `ml/` (do not edit `simulate/`) and report the effect.

## Done when
`python3 ml/validation/run_all.py` reproduces `docs/validation.md`; snapshots have manifests with sha256; both cards complete; limitations stated plainly.
