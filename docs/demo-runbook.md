# LIGHTMINUTE demo runbook

1. Start the local API with `LLM_PROVIDER=none` and `PYTHONPATH=services/engine`:
   `python -m uvicorn tether_engine.api.main:app --port 8000`.
2. In `apps/crew-tablet`, run `npm ci` and `npm run dev`. Open the displayed local URL.
3. Use `#scenario=cmo_fever&crew=A&day=16`: select resting heart rate. The Earth lens is normal;
   the personal lens is unusual. Open Decision card and complete its checklist.
4. Choose the fever-like protocol explicitly. Demonstrate Can't do this, skip and Undo.
   The protocol wording is a demo, not a NASA procedure. The simulated ground send transmits nothing.
5. Show Space weather: NOAA archived snapshot, retrieval time and flux plot. Show Evidence:
   matched false-alarm comparison, interval coverage and limitations.
6. Select the CO₂ scenario and compare the shared crew pattern. Changes of day/crew reset
   the current ground simulation and selected protocol.

Fallback: stop the API and reload. Scenario JSON, all views and the protocol runner still work
when a local static server serves the build. `prototype/three-lens.html` is the standalone backup;
the ground console and `packages/protocol-runner/demo.html` also work by double-click.
The tablet build requires HTTP serving; this is not an installed offline PWA.

Reproduce the browser rehearsal: build the tablet, run `npx playwright install chromium` once,
then `npm run test:e2e`. It starts its own local static server and template-only API, tests
responsive layouts and writes `docs/qa/browser-results.json` and `docs/screenshots/`.
Python dependencies are required for its API check; frontend CI sets `LIGHTMINUTE_SKIP_API=1`
because the separate engine job checks the API. No DeepSeek key or external services are used.

Do not claim a live LLM call, clinical validation, real crew observations or a real transmission.
