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

## Visor voice assistant and Earth link without the API

The Luna and EVA visors include a voice assistant. It answers only with the values the page is
already showing (day, crew, telemetry, space weather); it never diagnoses, never estimates and
never invents a threshold. Speech is synthesized locally with MMS TTS (`Xenova/mms-tts-spa`
and `Xenova/mms-tts-eng`), downloaded on first play; the language is chosen automatically
from the text. The browser voice is only a last resort when the model cannot load. It is a
simulated voice, not a crew recording. Kokoro was removed: its WebAssembly session froze the
page on some browsers.

Groq is configured per environment, never in the bundle:

- Local: `GROQ_API_KEY` in `.env`, served by `POST /api/visor/answer` in the engine.
- Pages: `npx wrangler pages secret put GROQ_API_KEY --project-name lightminute`, plus the
  non-secret `GROQ_MODEL` / `GROQ_BASE_URL` in `wrangler.toml` under `[vars]`. The Pages
  Function `functions/api/visor/answer.ts` proxies the call. Pages only runs a Function
  for paths listed in `public/_routes.json`, so `/api/visor/*` must stay in its `include`
  list; otherwise the host answers `405` and the visor silently falls back to the
  deterministic sentence.

Without a key the visor still answers from the page's fields with a deterministic sentence and
says so. Earth link now works with no API at all: the login, the delay and the consent filter
run in that browser against a local queue, and the panel labels it as such. The Python API keeps
being the only server-enforced version.

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
