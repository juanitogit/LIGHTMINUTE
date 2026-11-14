# ground-console

Static flight-surgeon view for TETHER. No build step, no dependencies, no external
network calls. Synthetic data only; not a medical device.

## Open it

```bash
# from the repo root
python -m http.server 8130
# http://localhost:8130/apps/ground-console/
```

Double-clicking `index.html` also works (`file://`): the pages use classic scripts and
`data/sample-scenario.json` is exposed as a global by `data/sample-scenario.js`, because
`file://` blocks both ES module imports and `fetch()` of local JSON.

## Where the data comes from

Tried in order, first success wins:

1. `data/scenario-<name>.json` (A1's export, once published)
2. `../../apps/crew-tablet/public/data/scenario-<name>.json`
3. `../../apps/crew-tablet/public/demo-data.json` (engine export)
4. `data/sample-scenario.json` (fixture)
5. `globalThis.__TETHER_SAMPLE__` (same fixture, for `file://`)
6. the “Load JSON” file picker

The source line always names what is being shown, and the SYNTHETIC badge never hides.

## What it shows

- Crew list with level (shape + text + colour), per-indicator sparkline against the
  personal 95% band, syndrome z, learning state, and which card source produced the text.
- Message queue: every crew whose card says `send_now`, with the card's `ground_message`,
  character budget, priority and expected reply time as exported by the engine.
- Consent tiers (vitals / symptoms / behavioural free text, the last one OFF by default)
  and a live “what ground receives” preview per message.
- Light-delay timeline for ISS (0 s), Moon (1.3 s) and Mars (3–22 min one-way), with the
  onboard-first decision from `ground/delay.py` demo policy (10 min ack, 15 min threshold).
- SHA-256 audit chain over the routed cards, with a tamper button that flags the first
  broken entry. Same canonical JSON as `tether_engine/audit.py`.

Routing numbers are shown exactly as exported (Mars profile). Only the timeline is
recomputed from the selected profile, and the caption says so.

## Fixture

`data/make-sample.py` regenerates `data/sample-scenario.{json,js}` from the engine export,
copying only the fields this page renders (no number is recomputed):

```bash
python apps/ground-console/data/make-sample.py
```

## Tests

```bash
cd apps/ground-console && node src/audit.test.mjs   # fixed vectors from audit.py
```

`src/audit.js` is the ES module entry point (used by the test); `src/audit-core.js` is the
classic-script twin that the page loads. Same file content, one implementation.
