# Fix log — NASA DONKI integration

Date: 2026-11-14 (UTC). Scope: NASA DONKI space-weather snapshot + radiation panel.
No new product features. No API key used, stored, or transmitted.

## 1. Security gate (run before any code change)

```text
$ if (Test-Path .env) { 'ENV_EXISTS' } else { 'ENV_MISSING' }
ENV_MISSING

$ Get-Content .gitignore
.env
node_modules/
__pycache__/
.venv/
.dsh/
.claude/
data/raw/
*.parquet
dist/
# 24 MB public archive ...
data/snapshots/MMASH.zip
*.egg-info/

$ git ls-files --error-unmatch .env
error: pathspec '.env' did not match any file(s) known to git

$ git check-ignore -v .env
.gitignore:1:.env	.env

$ if ($env:NASA_API_KEY) { 'present' } else { 'NASA_API_KEY_ABSENT' }
NASA_API_KEY_ABSENT
```

Conclusion: `.env` is ignored and untracked. `NASA_API_KEY` is absent from this
workspace. The key pasted into the chat was **not** used and was never written to disk.
DONKI needs no key, so the task proceeds without one.

## 2. Official endpoint check (not guessed)

Docs read: <https://ccmc.gsfc.nasa.gov/DONKI/api/> and
<https://ccmc.gsfc.nasa.gov/tools/DONKI/>

```text
$ GET https://ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR?startDate=2026-11-10&endDate=2026-11-14
STATUS=200 BYTES=448
[{"flrID":"2026-11-11T21:06:00-FLR-001", ... "classType":"M1.7" ...}]

$ GET https://ccmc.gsfc.nasa.gov/DONKI/WS/get/SEP?... (same window)
STATUS=200 BYTES=2
[]

$ GET https://ccmc.gsfc.nasa.gov/DONKI/WS/get/GST?... (same window)
STATUS=200 BYTES=2
[]
```

No `api_key` parameter was sent. The service does not use the api.nasa.gov key.

### 60-day limit (found by testing, stated by the service)

```text
$ GET .../FLR?startDate=2026-08-16&endDate=2026-11-14
HTTP 400 body: API Error: Date range cannot exceed 60 days. You requested 90 days.
```

The fetch script therefore splits the window into 60-day chunks.

## 3. Snapshot run

Window: `2026-08-16..2026-11-14` UTC (90-day difference, 91 calendar days inclusive).

```text
$ python scripts/fetch_nasa.py
NASA_API_KEY: absent (DONKI is keyless)
window: 2026-08-16..2026-11-14 (UTC, 90-day difference)
SEP:
  GET https://ccmc.gsfc.nasa.gov/DONKI/WS/get/SEP?startDate=2026-08-16&endDate=2026-10-14
    HTTP 200, 11 rows
  GET https://ccmc.gsfc.nasa.gov/DONKI/WS/get/SEP?startDate=2026-10-15&endDate=2026-11-14
    HTTP 200, 0 rows
  snapshot data\snapshots\nasa-donki-sep.json (6581 bytes, 11 rows)
FLR:
  GET https://ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR?startDate=2026-08-16&endDate=2026-10-14
    HTTP 200, 42 rows
  GET https://ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR?startDate=2026-10-15&endDate=2026-11-14
    HTTP 200, 13 rows
  snapshot data\snapshots\nasa-donki-flr.json (34095 bytes, 55 rows)
CME:
  GET https://ccmc.gsfc.nasa.gov/DONKI/WS/get/CME?startDate=2026-08-16&endDate=2026-10-14
    HTTP 200, 233 rows
  GET https://ccmc.gsfc.nasa.gov/DONKI/WS/get/CME?startDate=2026-10-15&endDate=2026-11-14
    HTTP 200, 89 rows
  snapshot data\snapshots\nasa-donki-cme.json (744274 bytes, 322 rows)
GST:
  GET https://ccmc.gsfc.nasa.gov/DONKI/WS/get/GST?startDate=2026-08-16&endDate=2026-10-14
    HTTP 200, 2 rows
  GET https://ccmc.gsfc.nasa.gov/DONKI/WS/get/GST?startDate=2026-10-15&endDate=2026-11-14
    HTTP 200, 1 rows
  snapshot data\snapshots\nasa-donki-gst.json (2502 bytes, 3 rows)
panel: apps/crew-tablet/public/data/space-weather.json | label=real-public | status=ok | events=391 | bytes=91121 | counts={'SEP': 11, 'FLR': 55, 'CME': 322, 'GST': 3}
```

Manifest checksums and row counts match all four snapshots:

```text
nasa-donki-sep SEP  real 11  data/snapshots/nasa-donki-sep.json   sha256 match: True
nasa-donki-flr FLR  real 55  data/snapshots/nasa-donki-flr.json   sha256 match: True
nasa-donki-cme CME  real 322 data/snapshots/nasa-donki-cme.json   sha256 match: True
nasa-donki-gst GST  real 3   data/snapshots/nasa-donki-gst.json   sha256 match: True
```

Manifest URLs contain no `api_key`; entries record `api_key_sent: false`. No
`X-RateLimit-*` headers were returned by DONKI.

Offline re-derivation from the committed snapshots:

```text
$ python scripts/fetch_nasa.py --offline
NASA_API_KEY: absent (DONKI is keyless)
window: 2026-08-16..2026-11-14 (UTC, 90-day difference)
SEP: offline snapshot loaded
FLR: offline snapshot loaded
CME: offline snapshot loaded
GST: offline snapshot loaded
panel: apps/crew-tablet/public/data/space-weather.json | label=real-public | status=ok | events=391 | bytes=91121 | counts={'SEP': 11, 'FLR': 55, 'CME': 322, 'GST': 3}
```

## 4. Tests

```text
$ python scripts/run_tests.py
PASS test_space_weather_snapshot test_donki_sources_are_provenanced_and_manifest_checksums_match
PASS test_space_weather_snapshot test_failed_donki_sources_are_explicit_not_substituted
PASS test_space_weather_snapshot test_space_weather_panel_is_real_public_compact_and_keyless
...
85/85 passed
```

Baseline was 82/82; the integration adds 3 tests (85/85).
`services/engine/tests/test_space_weather_snapshot.py` verifies compactness
(< 200 KiB), keylessness, real-public labelling, newest-first ordering, checksum
matches and explicit failures.

## 5. Production build

```text
$ npm run build
vite v7.3.8 building client environment for production...
✓ 73 modules transformed.
dist/assets/index-*.js        351.09 kB │ gzip: 109.62 kB
dist/assets/three.module-*.js 753.25 kB │ gzip: 192.46 kB
(!) Some chunks are larger than 500 kB after minification.
✓ built in 1.81s

$ dist/data/space-weather.json
dist status ok events 391 label real-public
```

The chunk-size warning predates this change and is not a failure.

## 6. Browser e2e (`npm run test:e2e`)

```text
$ npm run test:e2e
PASS Static fallback, six indicators, four crew and LIGHTMINUTE branding
PASS CC BY reference anatomy renders; male/female, systems, rotation, zoom and reset respond
PASS No-WebGL devices retain all six readings and a clear 3D unavailable state
PASS Signal drilldown preserves the engine value and three-lens disagreement
PASS Action checklist, simulated send and cited protocol runner
PASS Crew switch resets message simulation, protocol and checklist context
PASS Local check-in persists across reload and stays scoped to mission day
PASS Three-signal trend limit, grounded offline handbook and explicit missing signal sources
PASS NOAA historical snapshot + NASA DONKI events, real-public labels, timestamps and flux plot
PASS Both benchmark cohorts, all four methods and published calibration
PASS All three scenarios at start, day 16 and day 24
PASS Ten views without page overflow at 375, 768, 1024 and 1440px
PASS Light/dark persistence and presentation mode
PASS Ground console, real scenario selection and private behavioural default
PASS Double-click ground console and protocol demo using file://
PASS Earth-link demo login, authenticated queue, persisted report and logout
PASS Production UI with real local API and LLM_PROVIDER=none
17 browser integration groups passed. Screenshots: docs/screenshots/
```

## 7. Secret scan for the pasted key prefix

Scanned the working tree (excluding `node_modules`, `.git`, `dist`) and `dist/`
for the first 8 characters of the pasted key. Match counts only; the full key was
never printed.

```text
WORKTREE_FILES_MATCHED=0
DIST_FILES_MATCHED=0
```

Result: **0 matches**.

## 8. Unverified / not claimed

- **api.nasa.gov key validation is `unverified`.** `NASA_API_KEY` was absent and
  `.env` did not exist, so no keyed request was made. A single `DEMO_KEY` APOD probe
  returned `HTTP 500` and was not retried. This does not affect DONKI, which is keyless.
- **DONKI rate-limit headers:** none observed, so none are reported as values.
- **DONKI forecast/alerting use:** not claimed. Events are event records, not a forecast,
  and the UI says so.
- **Individual dose:** not computed from DONKI or NOAA. Both panels state that solar
  events are context, not individual dose.
