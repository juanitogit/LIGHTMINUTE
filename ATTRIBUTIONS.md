# Attributions

Only sources actually used are listed. No third-party code, assets, 3D models or branding were
copied; the three-lens layout and protocol ideas were studied in public READMEs and reimplemented.

## Data

**NASA DONKI — Space Weather Database Of Notifications, Knowledge, Information (CCMC)**
<https://ccmc.gsfc.nasa.gov/DONKI/api/> · reference <https://ccmc.gsfc.nasa.gov/tools/DONKI/>
NASA open data. Snapshots for SEP, FLR, CME and GST cover 2026-08-16..2026-11-14 UTC and are
recorded in `data/snapshots/manifest.json` with endpoint (no key), retrieval time, sha256, row
count and license note. The endpoint is keyless; no api.nasa.gov key is required or sent.
Used as `real-public` space-weather context in the radiation panel. Event classes, times and
links are reproduced as published; no dose or S-scale is inferred from them. NASA does not
endorse this project.

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
NASA-STD-3001 reference ranges and career dose limits, OSDR RadLab, OSD-569 blood-count
ranges, and any third-party 3D anatomy model beyond the CC-licensed assets listed below.
Nothing from these is quoted, so nothing is claimed.


## Human body model

The locally hosted `apps/crew-tablet/public/assets/models/human.glb` is the pre-existing
**Male base mesh — 3D Person, Rigged A-pose**, published by Innerscene, adapted from MakeHuman CC0 assets.
Source and license: https://www.innerscene.com/tools/library/3d-parts/male-base-mesh-3d-person-rigged-a-pose-380e6d89
— **CC0-1.0**, https://creativecommons.org/publicdomain/zero/1.0/.
Original GLB preserved; runtime replaces materials with neutral display shading. No anatomical
or clinical accuracy is claimed. Landmarks illustrate engine lens verdicts, not measured anatomy.
The source, final download URL, size and SHA-256 are recorded in `public/assets/models/manifest.json`.
The asset is served locally; the app does not contact the model publisher at runtime.

## Anatomical reference datasets

Male: BodyParts3D, © The Database Center for Life Science, CC BY 4.0. Female: HRA 3D Reference Organs (Visible Human female), HuBMAP Consortium, CC BY 4.0. Web-simplified meshes obtained from https://github.com/AdityaK0804/Crew-Health-Monitor/tree/main/public/anatomy ; upstream left neck vein mirrors the right. Our renderer/materials are independently authored. Original assets, digests and source commit: `apps/crew-tablet/public/assets/anatomy/provenance.json`. License: https://creativecommons.org/licenses/by/4.0/. No endorsement is implied.
