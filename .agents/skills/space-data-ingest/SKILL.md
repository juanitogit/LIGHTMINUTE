---
name: space-data-ingest
description: How to fetch, snapshot, checksum and cite real NASA/NOAA data for TETHER (OSDR/GeneLab incl. Inspiration4, OSD-569 blood counts, RadLab radiation, NOAA SWPC GOES proton flux, NASA DONKI solar events, PhysioNet MMASH). Use whenever you need real data, priors, a radiation panel, a replayed solar storm, proxy cohorts for validation, or a data card. Trigger on "NASA data", "OSDR", "GeneLab", "Inspiration4", "solar proton", "radiation data", "dataset".
---
# Space data ingest

## Sources (all public)
| Data | Where | Use |
|---|---|---|
| Inspiration4 (4 civilians; omics + clinical assays) | NASA OSDR, programmatic via GLOpenAPI (Sanders et al., npj Microgravity 2024, doi 10.1038/s41526-024-00393-5) | real n=4 validation + priors |
| OSD-569 blood counts / lab ranges | osdr.nasa.gov | immune-panel reference ranges |
| Radiation (DOSTEL ISS, CRaTER, MSL-RAD) | visualization.osdr.nasa.gov/radlab/ | dose rates, May 2024 storm replay |
| Solar protons (GOES) | services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json | live space-weather context |
| Solar energetic particle events | NASA DONKI API (api.nasa.gov; verify endpoint + key) | event timeline |
| PhysioNet MMASH (activity, sleep, HR, saliva cortisol) | physionet.org | baseline/validation on wearable-like signals |

## Rules
1. **Network is flaky at hackathons.** Download once into `data/snapshots/` and commit a `manifest.json` (url, retrieved_at UTC, sha256, license, row count). The app reads snapshots, never live URLs, except an optional "live" badge.
2. Reject a snapshot whose checksum/schema mismatches. Fail loudly.
3. Write `docs/data-card.md`: source, license, date, transformations, limitations. Cite the source in the UI wherever data is shown.
4. Never present proxy data as astronaut data. Label: `real-public`, `proxy`, or `synthetic`.
5. Privacy: OSDR processed Inspiration4 data is public; raw/genetic data is access-controlled — do not attempt it.
6. Ingest code lives in `services/engine/tether_engine/ingest/` with one function per source returning a typed dataframe; scripts in `scripts/fetch_*.py`.
7. If a source is unreachable in the room, say so in the data card and use the last snapshot — do not fabricate substitute values.
