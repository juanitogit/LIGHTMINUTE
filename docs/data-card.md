# LIGHTMINUTE — Data card

Every source is labelled `real-public`, `proxy` or `synthetic`. Nothing here is real
astronaut health data, and no personal health data is stored in this repository.

## Used at runtime or in results

| Data | Source & URL | Retrieved / version | License | Label | Used for | Limitations |
|---|---|---|---|---|---|---|
| Solar proton flux (≥10 MeV) | NOAA SWPC GOES primary, <https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json> | 2026-11-14T14:38:16Z, 2,288 rows, sha256 `e0c6563d…` | Public domain (U.S. Government work) | `real-public` | Space-weather context + `apps/crew-tablet/public/data/radiation.json` (286 points, S-scale 0 at retrieval) | 1-day window, single satellite (GOES-18), 5-minute cadence; context only, never raises an alert by itself |
| MMASH (wearable HR, sleep, IBI) | PhysioNet 1.0.0, <https://physionet.org/content/mmash/1.0.0/> | 24,649,620 bytes, sha256 `ef91ee1b…` | ODC Open Database License v1.0 (attribution) | `proxy` | Interval-calibration check on real wearable noise (`ml/proxy/mmash.py`) | 22 healthy volunteers, ~24 h each, no labelled events; not crew data; aggregate results only are published |
| Synthetic crews | `services/engine/tether_engine/simulate/mini.py` (own code) | seed 0…; regenerated per run | n/a (our code) | `synthetic` | All recall, delay and calibration tables; the demo scenario | Gaussian, independent indicators, no circadian or exercise context in the shared fixture |
| Synthetic S1 replay | `scripts/fetch_noaa.py` fallback path | deterministic, 24 h | n/a | `synthetic` | Only if NOAA is unreachable; `synthetic: true` and a `why` field make it visible | A cartoon of a solar event, not a replay of a real one |

Snapshots are recorded in `data/snapshots/manifest.json` with url, retrieved_at, sha256,
row counts and license. `tether_engine.ingest.verify_snapshot()` rejects a file whose
checksum or row count does not match. If a source is unreachable, the fallback is
labelled synthetic — values are never invented and presented as real.

## Cited but not downloaded (claims only)

| Source | URL | Status | Used for |
|---|---|---|---|
| NASA HRP risks | <https://www.nasa.gov/hrp/risks> | verified (page read) | risk framing, `kb/evidence.yaml` ids |
| Patel et al. 2020, "Red risks for a journey to the red planet" | <https://pmc.ncbi.nlm.nih.gov/articles/PMC7645687> | verified (page read) | priority risks (radiation, SANS, behavioral, nutrition) |
| HRP core-temperature RFI | <https://www.nasa.gov/help-nasa-find-practical-ways-to-monitor-astronaut-body-temperature-in-low-earth-orbit/> | verified (page read) | 24 h core-temperature rationale |
| HRP Artemis II Data Methodology Challenge winners | <https://www.nasa.gov/hrp/winners-of-nasa-hrps-artemis-ii-data-methodology-challenge/> | verified (page read) | the small-sample / N-of-1 argument |
| Inspiration4 (n=4) in NASA OSDR | <https://doi.org/10.1038/s41526-024-00393-5> | paper verified; **data not fetched** | why n=4 methods matter |

**OSDR was not used.** The GLOpenAPI endpoints tried during the event returned 404
(`osdr.nasa.gov/geode-py/ws/api/studies`, `/osdr/data/osd/api`). No OSDR dataset was
downloaded, no numbers from it are quoted, and no prior is claimed to come from it.
`services/engine/tether_engine/ingest/` is written so a snapshot can be added later.

## Not used, and deliberately left unverified
- **NASA-STD-3001** reference ranges and career dose limits — not opened, so no limit is
  hard-coded; `hazards/space_weather.py` takes the limit as a parameter.
- **NASA DONKI** SEP event timeline — endpoint not exercised.
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
python scripts/fetch_mmash.py           # 24 MB proxy archive + checksum
python ml/proxy/mmash.py                # proxy result -> ml/proxy/results.json
```
