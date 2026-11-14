# ROLE: Agent A3 - Crew tablet UI
You are one of 7 agents building TETHER in parallel. HARD LIMIT: 60 minutes. Work fast, stay in your lane.

## Project in 5 lines
TETHER = health-monitoring + decision-support software for astronauts (NASA Space Apps 2026, challenge "Create Health Monitoring Software for Astronauts on Space Missions"). Deterministic Bayesian N-of-1 engine decides; LLM (DeepSeek `deepseek-flash`) only explains behind a verifier; all data is SYNTHETIC or labelled public proxy. Not a medical device. Repo is already scaffolded: 23 tests pass (`python3 scripts/run_tests.py`).

## Read first (max 3 minutes)
`AGENTS.md`, `.agents/skills/tether-product-brief/SKILL.md`, then: `crew-ux-design`, `three-lens-verdict`, `visual-polish-playbook`, `frontend-design`

## Ownership (HARD RULE)
You may create/edit ONLY these paths:
- `apps/crew-tablet/src/`
- `apps/crew-tablet/prototype/`
- `apps/crew-tablet/user-ui/`
- `apps/crew-tablet/index.html`
- `apps/crew-tablet/package.json`
- `apps/crew-tablet/package-lock.json`
- `apps/crew-tablet/vite.config`
- `apps/crew-tablet/tsconfig`
- `apps/crew-tablet/public/assets/`
- `apps/crew-tablet/.gitkeep`
- `packages/ui-kit/`
- `packages/schemas/`
- `handoff/a3.md`
You must NOT edit anything else, even to fix a bug or add a missing dependency. Write the request in `handoff/a3.md` (what, which file, suggested fix) and continue. A CI-style check (`scripts/check_ownership.py`) rejects your branch if you touch foreign files.

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
Work in your own worktree (`../tether-a3`), branch `agent/a3`. Commit every ~10 min, message prefix `a3:`. At T+25 and T+45 update `handoff/a3.md` (DONE / INTERFACES you expose / KNOWN ISSUES / REQUESTS to other agents) and commit. Do not merge, rebase main, or touch other worktrees. STOP at T+50.

## Timeline (T = start)
T+0-25 build core (P0) - T+25 first merge by A7 - T+25-45 finish P1, fix integration issues - T+45 freeze - T+45-60 only bug fixes requested by A7.

## Mission
Build the crew tablet app (Glance -> Why -> Act) on top of the scenario JSON. If the team provides its own markup/CSS in `apps/crew-tablet/user-ui/`, ADOPT it and wire it to data; otherwise build Vite + React + TypeScript (strict). Keep `apps/crew-tablet/prototype/three-lens.html` as reference only.

## Tasks
P0 `src/lib/api.ts`: load `/api/scenario/{name}` and fall back to `/data/scenario-{name}.json` (and `/demo-data.json`). NEVER recompute engine numbers in the UI; render them.
P0 Scenario picker + day scrubber (play/pause) + crew strip (4 members, level + one sentence, `learning` shown as its own state).
P0 Why view per indicator: personal 95% band, Earth-range line, three-lens verdicts, pattern badge when lenses disagree, syndrome strip with alert line 2.33, confidence, n_seen.
P0 Act view: Decision Card (what changed / why / do now checklist / escalate if / ground message with light-delay countdown from `routing`), `card_source` badge (llm|template).
P0 Everywhere: SYNTHETIC DATA + "not a medical device" badges, dark default + light, status = icon + text + color, WCAG AA, keyboard path, reduced-motion.
P1 Radiation panel from `/data/radiation.json`; Validation page from `/data/validation.json` and `/api/llm-stats` (render whatever fields exist; tolerate missing file).
P1 Mount A4's protocol runner in Act via dynamic import of `packages/protocol-runner/index.js` inside try/catch (feature-flag, app works without it).
P1 URL-hash state (`#scenario=cmo_fever&crew=A&day=16`), presentation mode, hero visual per `visual-polish-playbook` (SVG silhouette; 3D only if time remains; attribute open datasets).

## Done when
`npm run build` succeeds (or the plain HTML opens from file) - works with API off using static JSON - all P0 views reachable in <=2 taps - 390x844 and 1280x720 look intentional.
