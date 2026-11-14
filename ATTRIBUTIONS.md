# Attributions

Only sources actually used are listed. No third-party code, assets, 3D models or branding were
copied; the three-lens layout and protocol ideas were studied in public READMEs and reimplemented.

## Data

**NOAA SWPC — GOES primary integral protons (1-day JSON)**
<https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json>
U.S. Government work, public domain. Snapshot 2026-11-14T14:38:16Z, sha256 `e0c6563d…`,
recorded in `data/snapshots/manifest.json`. Used for space-weather context and the radiation panel.
NOAA S-scale thresholds (10 / 100 / 1 000 / 10 000 / 100 000 pfu at ≥10 MeV) follow the published
S-scale definition; no dose limit is hard-coded.

**MMASH — Multilevel Monitoring of Activity and Sleep in Healthy people, v1.0.0**
PhysioNet: <https://physionet.org/content/mmash/1.0.0/> — ODC Open Database License (ODbL) v1.0.
Reference: Rossi et al., *Multilevel Monitoring of Activity and Sleep in Healthy People* (2020).
Used as a **proxy** for interval calibration only; the archive is a checksummed snapshot and only
aggregate results are published. Attribution: data courtesy of the MMASH authors via PhysioNet.

## Facts and framing (cited, not redistributed)

- NASA Human Research Program, risks overview — <https://www.nasa.gov/hrp/risks>
- Patel et al., "Red risks for a journey to the red planet", npj Microgravity (2020) — <https://pmc.ncbi.nlm.nih.gov/articles/PMC7645687>
- NASA HRP, 24-hour core body temperature RFI — <https://www.nasa.gov/help-nasa-find-practical-ways-to-monitor-astronaut-body-temperature-in-low-earth-orbit/>
- NASA HRP, Artemis II Data Methodology Challenge winners — <https://www.nasa.gov/hrp/winners-of-nasa-hrps-artemis-ii-data-methodology-challenge/>
- Sanders et al., Inspiration4 multi-omics in NASA OSDR — <https://doi.org/10.1038/s41526-024-00393-5>
  (cited as motivation for small-sample methods; the dataset was **not** downloaded or analysed)

## Tools

- DeepSeek V4.1 Flash (`deepseek-flash`) — optional explanation layer and development assistance.
- Coding agents (DeepSeek Harness / Claude Code-compatible) — implementation assistance, reviewed
  by the team.
- Python, numpy, scipy — runtime for the engine and the validation harness.

## Not used
NASA-STD-3001 reference ranges and career dose limits, NASA DONKI, OSDR RadLab, OSD-569 blood-count
ranges, and any third-party 3D anatomy model. Nothing from these is quoted, so nothing is claimed.
