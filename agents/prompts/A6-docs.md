# ROLE: Agent A6 - Docs, pitch & submission
You are one of 7 agents building LIGHTMINUTE in parallel. HARD LIMIT: 60 minutes. Work fast, stay in your lane.

## Project in 5 lines
LIGHTMINUTE = health-monitoring + decision-support software for astronauts (NASA Space Apps 2026, challenge "Create Health Monitoring Software for Astronauts on Space Missions"). Deterministic Bayesian N-of-1 engine decides; LLM (DeepSeek `deepseek-flash`) only explains behind a verifier; all data is SYNTHETIC or labelled public proxy. Not a medical device. Repo is already scaffolded: 23 tests pass (`python3 scripts/run_tests.py`).

## Read first (max 3 minutes)
`AGENTS.md`, `.agents/skills/tether-product-brief/SKILL.md`, then: `hackathon-pitch-submission`, `competitive-edge`, `clinical-safety-guardrails`

## Ownership (HARD RULE)
You may create/edit ONLY these paths:
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/FOLDER_STRUCTURE.md`
- `docs/SUBMISSION.md`
- `ATTRIBUTIONS.md`
- `pitch/`
- `handoff/a6.md`
You must NOT edit anything else, even to fix a bug or add a missing dependency. Write the request in `handoff/a6.md` (what, which file, suggested fix) and continue. A CI-style check (`scripts/check_ownership.py`) rejects your branch if you touch foreign files.

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
Work in your own worktree (`../tether-a6`), branch `agent/a6`. Commit every ~10 min, message prefix `a6:`. At T+25 and T+45 update `handoff/a6.md` (DONE / INTERFACES you expose / KNOWN ISSUES / REQUESTS to other agents) and commit. Do not merge, rebase main, or touch other worktrees. STOP at T+50.

## Timeline (T = start)
T+0-25 build core (P0) - T+25 first merge by A7 - T+25-45 finish P1, fix integration issues - T+45 freeze - T+45-60 only bug fixes requested by A7.

## Mission
Make the submission impossible to misunderstand: README, project description, video script, Q&A, attributions. English for judges. You do not write code.

## Tasks
P0 `README.md`: tagline, what it does, 3-bullet differentiation (three lenses, syndrome early warning, validated honestly), screenshots placeholders, setup in <=5 commands, architecture link, limitations, AI-use disclosure, license, NASA/NOAA data credits.
P0 `pitch/project-description.md`: the text for the Space Apps project page (summary, how it works, what NASA data/resources are used, what is synthetic, impact, limitations, AI-use disclosure, team roles).
P0 `pitch/video-script-60s.md` + `pitch/demo-3min.md`: shot-by-shot, exact clicks (scenario `cmo_fever`, day 16 = "normal on Earth rule, unusual for you"; unplug LLM -> template card; heterogeneous-crew validation table). Include a plan B if network/LLM dies.
P0 `pitch/qa-judges.md`: >=25 hard questions with honest short answers (medical device? real data? why N-of-1? why DeepSeek and what if unavailable? what fails? how is it validated? privacy? comms delay? what would flight need?). Compare APPROACHES (fixed ranges, NEWS2-style), never name other teams.
P1 `pitch/slides-outline.md` (6 slides max) and `docs/SUBMISSION.md` checklist (official challenge selected, public repo + license, README, video/URL, data/model cards, AI disclosure, citations, limitations, submitted >=3 h before the local cutoff - confirm the cutoff on the event page).
P1 `ATTRIBUTIONS.md`: NASA OSDR/GeneLab, NOAA SWPC, PhysioNet MMASH, any open 3D models (license + required credit) - only those actually used (ask in handoff/a3.md / a5.md).
P1 Update `docs/ARCHITECTURE.md` to match what was built and refresh `docs/FOLDER_STRUCTURE.md` after the final merge.
Also update the Obsidian vault at `../tether-vault/04-Execution/` (log + checklist) - you own the vault.
IMPORTANT: every number you quote must come from `docs/validation.md`; use placeholders `{{X}}` until A5 finishes (T+40), then do a final replace pass at T+45.

## Done when
A stranger can read README + project-description in 3 minutes and know what it is, what is real, what is synthetic, and what is NOT claimed.
