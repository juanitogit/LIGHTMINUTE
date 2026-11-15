# LIGHTMINUTE — Data card

Every source is labelled `real-public`, `proxy` or `synthetic`. Nothing here is real
astronaut health data, and no personal health data is stored in this repository.

## Used at runtime or in results

| Data | Source & URL | Retrieved / version | License | Label | Used for | Limitations |
|---|---|---|---|---|---|---|
| Solar proton flux (≥10 MeV) | NOAA SWPC GOES primary, <https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json> | 2026-11-14T14:38:16Z, 2,288 rows, sha256 `e0c6563d…` | Public domain (U.S. Government work) | `real-public` | Space-weather context + `apps/crew-tablet/public/data/radiation.json` (286 points, S-scale 0 at retrieval) | 1-day window, single satellite (GOES-18), 5-minute cadence; context only, never raises an alert by itself |
| NASA DONKI events (SEP, FLR, CME, GST) | CCMC DONKI, `https://ccmc.gsfc.nasa.gov/DONKI/WS/get/{TYPE}?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`; docs <https://ccmc.gsfc.nasa.gov/DONKI/api/> | 2026-08-16..2026-11-14 UTC, retrieved 2026-11-14T20:07Z, 391 events (SEP 11, FLR 55, CME 322, GST 3), sha256 per file in `data/snapshots/manifest.json` | NASA open data (CCMC DONKI; NASA does not endorse this project) | `real-public` | `apps/crew-tablet/public/data/space-weather.json` (91,121 bytes) rendered by the radiation panel as space-weather context | Event records as published, not a forecast; SEP rows carry no peak flux or class, so none is inferred; event classes and times reproduced as published; not individual dose |
| MMASH (wearable HR, sleep, IBI) | PhysioNet 1.0.0, <https://physionet.org/content/mmash/1.0.0/> | 24,649,620 bytes, sha256 `ef91ee1b…` | ODC Open Database License v1.0 (attribution) | `proxy` | Interval-calibration check on real wearable noise (`ml/proxy/mmash.py`) | 22 healthy volunteers, ~24 h each, no labelled events; not crew data; aggregate results only are published |
| Synthetic crews | `services/engine/tether_engine/simulate/mini.py` (own code) | seed 0…; regenerated per run | n/a (our code) | `synthetic` | All recall, delay and calibration tables; the demo scenario | Gaussian, independent indicators, no circadian or exercise context in the shared fixture |
| Synthetic S1 replay | `scripts/fetch_noaa.py` fallback path | deterministic, 24 h | n/a | `synthetic` | Only if NOAA is unreachable; `synthetic: true` and a `why` field make it visible | A cartoon of a solar event, not a replay of a real one |

Snapshots are recorded in `data/snapshots/manifest.json` with url, retrieved_at, sha256,
row counts and license. `tether_engine.ingest.verify_snapshot()` rejects a file whose
checksum or row count does not match. If a source is unreachable, the fallback is
labelled synthetic — values are never invented and presented as real.

### NASA DONKI (verified 2026-11-14)

- **Base URL and auth.** `https://ccmc.gsfc.nasa.gov/DONKI/WS/get/{SEP|FLR|CME|GST}` with
  `startDate` / `endDate` in `YYYY-MM-DD` (UTC). Live checks returned HTTP 200 with no
  `api_key` parameter. DONKI is a CCMC service and does **not** use the api.nasa.gov key;
  no key is sent, stored, or required. The api.nasa.gov catalog did not list DONKI in the
  version read during the event; the CCMC documentation is authoritative for this endpoint.
- **Range limit.** The service rejects windows over 60 days with
  `API Error: Date range cannot exceed 60 days`. `scripts/fetch_nasa.py` therefore splits
  the 90-day window into 60-day chunks and merges them by event id.
- **Window used.** `2026-08-16` to `2026-11-14` UTC (90-day difference, 91 calendar days
  inclusive). Rows returned: SEP 11, FLR 55, CME 322, GST 3; total 391 after de-duplication.
- **Rate limits.** No `X-RateLimit-*` headers were returned by the DONKI responses. Requests
  used a 1.5 s polite delay and retry/backoff on 429 or 5xx.
- **Derived file.** `apps/crew-tablet/public/data/space-weather.json` is 91,121 bytes
  (< 200 KiB). It contains a compact newest-first timeline, per-type provenance, the
  explicit failure list, and limitations. The optional NOAA S-scale is included only from
  the real GOES proton snapshot, never inferred for DONKI event dates.
- **Failure honesty.** If a type fails, the script records `mode: "failed"`, the error and
  `status: "partial"`; the UI prints the failure and substitutes nothing.
- **UI labels.** The panel shows separate `NASA DONKI` and `NOAA GOES` chips, the retrieval
  date, and the sentence "Solar particle and flare events are space-weather context, not
  individual dose."
- **Key validation.** `NASA_API_KEY` was absent from this workspace and `.env` did not
  exist, so a keyed api.nasa.gov call was not performed; that validation is `unverified`.
  A single `DEMO_KEY` APOD probe returned HTTP 500 and was not retried. None of this
  affects DONKI, which needs no key.

## Cited but not downloaded (claims only)

| Source | URL | Status | Used for |
|---|---|---|---|
| NASA HRP risks | <https://www.nasa.gov/hrp/risks> | verified (page read) | risk framing, `kb/evidence.yaml` ids |
| Patel et al. 2020, "Red risks for a journey to the red planet" | <https://pmc.ncbi.nlm.nih.gov/articles/PMC7645687> | verified (page read) | priority risks (radiation, SANS, behavioral, nutrition) |
| HRP core-temperature RFI | <https://www.nasa.gov/help-nasa-find-practical-ways-to-monitor-astronaut-body-temperature-in-low-earth-orbit/> | verified (page read) | 24 h core-temperature rationale |
| HRP Artemis II Data Methodology Challenge winners | <https://www.nasa.gov/hrp/winners-of-nasa-hrps-artemis-ii-data-methodology-challenge/> | verified (page read) | the small-sample / N-of-1 argument |
| Inspiration4 (n=4) in NASA OSDR | <https://doi.org/10.1038/s41526-024-00393-5> | paper verified; **unrestricted OSD-575 CMP processed** | exploratory postflight bands (79/287); direction NOT DONE |

**OSDR was used, exploratorily.** The GLOpenAPI endpoints tried during the event returned 404
(`osdr.nasa.gov/geode-py/ws/api/studies`, `/osdr/data/osd/api`), but the unrestricted OSD-575
transformed CMP CSV was available and processed: 4 participants, 19 analytes, 79/287 postflight
values outside personal preflight bands. That is not validation: baselines have three preflight
samples, no clinical sensitivity is claimed, and directional concordance with Siew et al. is
NOT DONE because the published signs were not frozen before the numerical values were seen.
`services/engine/tether_engine/ingest/` remains written so a snapshot can be added later.

## Not used, and deliberately left unverified
- **NASA-STD-3001** reference ranges and career dose limits — not opened, so no limit is
  hard-coded; `hazards/space_weather.py` takes the limit as a parameter.
- **API-key validation** — `NASA_API_KEY` was absent and `.env` did not exist in this
  workspace, so no keyed api.nasa.gov response was observed. `unverified`. The delivered
  DONKI integration needs no key.
- **OSDR RadLab** dose rates — not fetched.
- **OSD-569** blood-count ranges — cited by a third-party project, never opened here.
- The three "Earth" thresholds in `kb/thresholds.json` are `earth-standard` approximations;
  the space-adapted lens is intentionally empty rather than invented.

## Privacy and consent
Crew data is treated as crew-owned: consent tiers decide what leaves the device (vitals
summary / symptoms / behavioral free text), and behavioral free text is off by default.
The demo only ever shows synthetic crews plus public aggregate data. Any hosted LLM call
uses synthetic or de-identified content only.

## Reproduce the data layer
```bash
python scripts/fetch_noaa.py            # snapshot + checksum + radiation panel
python scripts/fetch_nasa.py            # DONKI SEP/FLR/CME/GST snapshot + space-weather.json
python scripts/fetch_nasa.py --offline  # re-derive from committed snapshots, no network
python scripts/fetch_mmash.py           # 24 MB proxy archive + checksum
python ml/proxy/mmash.py                # proxy result -> ml/proxy/results.json
```
