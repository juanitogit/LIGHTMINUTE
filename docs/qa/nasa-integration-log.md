# NASA data integration — verification log

Review date: 2026-11-15. Branch: `nasa-data`. No production deployment or merge is authorized by this task.

## Source inventory and decisions

- **OSD-575** is already used in `ml/proxy/RESULTS.md` for exploratory postflight comparisons, not synthetic crew telemetry. NASA's [metadata API](https://visualization.osdr.nasa.gov/biodata/api/v2/dataset/OSD-575/?format=json) returned accession OSD-575, identifiers LSDS-8 and GLDS-579, the serum material and the Inspiration4 study title. The official [study page](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575) is linked from the new Data sources view. OSD-569 metadata was inspected previously, but its dataset is not used. The OSD-575 source file is not committed; its recorded retrieval is in `ml/proxy/credibility-provenance.json`.
- The publicly accessible transformed CMP file was fetched again for verification only. Actual output: `sha256=5eb1e7f025dd8443a9e70111e62bc32afae3432753024489c5c013e401d709d9`, `bytes=8506`. This matches the original provenance record. Its public research participants are private astronauts; it is not an LSAH record. A blanket statement that no astronaut biomedical/clinical measurements were used would be inaccurate.
- **NASA DONKI** SEP, FLR, CME and GST are already committed snapshots produced by `scripts/fetch_nasa.py`, displayed in Space weather, with hashes and retrieval dates in `data/snapshots/manifest.json`. **NOAA GOES** proton flux is a separate historical snapshot in the same UI and manifest. No existing data values or results were regenerated. NASA's [open API catalog](https://api.nasa.gov/) now lists DONKI; the project's existing direct CCMC endpoint is separate and keyless. Keyed gateway access remains unverified.
- NASA's [OSDR FAQ](https://science.nasa.gov/reference/osdr-faq/) provides the acknowledgement added to the UI and attributions. NASA describes [LSAH restricted access](https://nlsp.nasa.gov/search/data/details/eb851add-81e9-5827-9915-7e8ea717185c?dataType=EXPERIMENTS) and the [LSAH/LSDA request process](https://www.nasa.gov/wp-content/uploads/2015/05/hrp_retrospective_data_request_study_information_package_guidelines_final.pdf). No LSAH or restricted LSDA records were used.
- **RadLab: abandoned.** The official [data API](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) returned `status=200 length=1113` for a brief historical ISS DosTel query; this does not establish a recent dataset, and instrument-specific redistribution terms were not verified. No RadLab dataset is included. No additional OSDR dataset or NASA knowledge-base claim was added.

## Commands and observed outputs

```text
python scripts/run_tests.py
123/123 passed

python tests/test_nasa_data_provenance.py
Ran 3 tests in 0.010s
OK

python scripts/check_ownership.py --overlaps
ownership map OK

npm run build
Verified 8 signed synthetic scenario files.
✓ 103 modules transformed.
✓ built in 2.28s

npm run test:e2e
PASS Data sources and NASA OSDR acknowledgement work with snapshots and API unavailable
25 browser integration groups passed. Screenshots: docs/screenshots/
```

Initial verification detected a Windows-only mismatch: the four DONKI working-tree files had CRLF line endings and did not match their manifest digests; the corresponding committed Git blobs all matched. `.gitattributes` now preserves LF for `data/snapshots/*.json`. After normalizing this isolated checkout, the exact-byte snapshot tests passed without changing any dataset value or digest.

Build size check: largest file `apps/crew-tablet/dist/assets/organs/lung.glb`, 21,308,976 bytes; files exceeding 25 MiB: 0. `apps/crew-tablet/public/data/space-weather.json` remains the existing file: 91,121 bytes in the Git blob and 91,122 bytes in this Windows checkout because of line endings; no new JSON was added. Browser layout checks on the new view at 390 and 1440 CSS pixels reported `overflow: false`.

`NASA_API_KEY` was absent from the environment and `.env` was absent in this worktree. Therefore a first-eight-character key scan and keyed gateway request are **not applicable / not performed**; zero matches cannot be claimed. Existing manifest entries contain the non-secret boolean `api_key_sent: false`, but no key value. These checks do not constitute a full history secret scan.

## Go / no-go for human review

| Item | Status | Evidence | Public URL check after an authorized merge |
|---|---|---|---|
| OSD-575 provenance, acknowledgement, limitations | DONE | Source API and CSV hash above; `src/views/DataSources.tsx` | Open footer → Data sources, verify title, link, attribution and limitations. |
| Existing DONKI and NOAA snapshots | DONE | Manifest/hash tests; existing radiation view | Check separate NASA DONKI / NOAA GOES labels, retrieval time and context-only wording. |
| RadLab | ABANDONED | Source API worked; terms/recent data not established | Do not claim or expect a RadLab series. |
| Additional OSDR dataset and new NASA KB entries | ABANDONED | No extra source added under the verification gate | Do not claim additional studies. |
| Key-specific leak scan | BLOCKED | Key absent; no prefix available | If configured later, scan without printing the key and rotate any exposed credential. |
| Build and local tests | DONE | Commands above | Test the merged build on the live public URL, including static/offline and mobile. |
| Merge / deployment | BLOCKED | Explicitly reserved to the human | Review branch and CI, then authorize or perform merge and verify deployment. |

The current public deployment has not been changed by this branch. This report records local checks; it is not clinical validation or a declaration that all external access and licenses are verified.
