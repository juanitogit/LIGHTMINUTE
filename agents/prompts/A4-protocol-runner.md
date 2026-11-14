# ROLE: Agent A4 - Protocol runner & Ground console
You are one of 7 agents building TETHER in parallel. HARD LIMIT: 60 minutes. Work fast, stay in your lane.

## Project in 5 lines
TETHER = health-monitoring + decision-support software for astronauts (NASA Space Apps 2026, challenge "Create Health Monitoring Software for Astronauts on Space Missions"). Deterministic Bayesian N-of-1 engine decides; LLM (DeepSeek `deepseek-flash`) only explains behind a verifier; all data is SYNTHETIC or labelled public proxy. Not a medical device. Repo is already scaffolded: 23 tests pass (`python3 scripts/run_tests.py`).

## Read first (max 3 minutes)
`AGENTS.md`, `.agents/skills/tether-product-brief/SKILL.md`, then: `protocol-runner`, `crew-ux-design`, `clinical-safety-guardrails`

## Ownership (HARD RULE)
You may create/edit ONLY these paths:
- `apps/ground-console/`
- `packages/protocol-runner/`
- `kb/protocols/`
- `handoff/a4.md`
You must NOT edit anything else, even to fix a bug or add a missing dependency. Write the request in `handoff/a4.md` (what, which file, suggested fix) and continue. A CI-style check (`scripts/check_ownership.py`) rejects your branch if you touch foreign files.

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
Work in your own worktree (`../tether-a4`), branch `agent/a4`. Commit every ~10 min, message prefix `a4:`. At T+25 and T+45 update `handoff/a4.md` (DONE / INTERFACES you expose / KNOWN ISSUES / REQUESTS to other agents) and commit. Do not merge, rebase main, or touch other worktrees. STOP at T+50.

## Timeline (T = start)
T+0-25 build core (P0) - T+25 first merge by A7 - T+25-45 finish P1, fix integration issues - T+45 freeze - T+45-60 only bug fixes requested by A7.

## Mission
Build two independent deliverables that plug into the rest through files only: the Protocol Runner and the Ground Console.

## Tasks
P0 `kb/protocols/*.json`: 3 protocols (`fever_like_syndrome`, `co2_headache_cluster`, `post_eva_orthostatic`) with `{id,title,trigger_patterns[],steps[{text,source_status:"published"|"demo-wording",source}]}`. No drug doses; point to the onboard medical protocol. Mark every step that lacks a real source `demo-wording`. Steps must be executable by a non-physician.
P0 `packages/protocol-runner/index.js` (+`style.css`, framework-free): `mountProtocolRunner(el,{protocolId,onStep,onDone})`; one step per screen, >=64px targets, per-step timer, "cannot do this" branch, undo, keyboard + ARIA; visibly shows `demo-wording` badge. `onStep` payload = `{protocolId, stepIndex, status, tsMs}` so the host can audit it. Include `README.md` with a 10-line usage example and a `demo.html` that works from file://.
P0 `apps/ground-console/` (static `index.html` + `src/main.js`, no build step): reads `/data/scenario-<name>.json` (and a file picker fallback). Shows crew list with levels, sparkline trends per indicator, message queue built from each card's `ground_message` + `routing`, a mission-profile selector (ISS 0 s / Moon 1.3 s / Mars 3-22 min one-way) that animates the light-delay timeline, consent-tier toggles (vitals summary / symptoms / behavioral text - behavioral text OFF by default), SYNTHETIC badge.
P1 `src/audit.js`: browser SubtleCrypto SHA-256 hash chain mirroring `tether_engine/audit.py` (same canonical JSON: sorted keys, compact separators), plus a viewer that flags the first tampered entry. Test it in Node with a fixed vector.

## Done when
Protocol runner works in `demo.html`; ground console opens from file:// with the sample JSON; no external network calls; handoff/a4.md documents props/events.
