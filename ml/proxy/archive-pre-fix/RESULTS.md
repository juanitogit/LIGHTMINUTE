# Public-data validation

The unchanged Student-t predictor was evaluated on two datasets under plans committed in `2fea48f`. Neither study establishes clinical sensitivity. The acquisition and scripts began on November 14, 2026. The output run finished on resumption, November 15 UTC, outside the original 90-minute wall-clock windows. Counts and numerical predictions are in [the run output](credibility-run.log) and [the detailed JSON](credibility-results.json).

## MMASH · healthy terrestrial proxy

PhysioNet MMASH v1.0.0, Rossi et al., is open under the Open Data Commons Open Database License v1.0. Retain attribution and the dataset license when reusing the database. The archive digest matched PhysioNet's SHA-256 release manifest. This run converts positive finite RR intervals in seconds to beats/minute, takes minute medians and scores before updating. Across 22 participants there were 5,859 training and 23,488 held-out occupied minutes. Missing minutes within the recording spans totalled 1,318. [Dataset and data dictionary](https://physionet.org/content/mmash/1.0.0/) · [Release digests](https://physionet.org/files/mmash/1.0.0/SHA256SUMS.txt)

| Model input | Held-out observations inside nominal 95% band | Outside-band minutes per observed person-day | Median participant band width (bpm) | Median lag-one innovation correlation |
|---|---:|---:|---:|---:|
| Raw minute HR | 21,879/23,488 (93.15%) | 98.64 | 29.53 | 0.782 |
| Residual after training-only clock adjustment | 22,320/23,488 (95.03%) | 71.61 | 35.74 | 0.854 |

Both pooled coverages meet the preregistered descriptive tolerance. The clock adjustment failed the improvement rule because its bands widened. Individual coverage ranged from 91.81% to 95.43% raw and 90.88% to 98.22% adjusted. Positive serial correlation means adjacent flags can describe the same episode. Raw-band coverage inside documented sleep intervals was 4,762/5,014 and outside those intervals 17,117/18,474. Minutes outside a reported sleep interval can include unannotated sleep. Missing minutes were never filled. The data have no labelled disease events, and the single partial-day training period cannot establish a circadian rhythm or validate Gaussian assumptions. NASA lists separate methodological use of MMASH in Ashlei Lewis's winning entry. [NASA HRP challenge results](https://www.nasa.gov/hrp/winners-of-nasa-hrps-artemis-ii-data-methodology-challenge/)

## OSD-575 · real-public Inspiration4 serum chemistry

The unrestricted transformed CMP CSV was linked to the sample metadata using the exact sample key. Unit-bearing indicator columns and explicit phase, relative-day and subject metadata defined eligibility. Baselines were initialized and updated only on preflight values, then frozen. The public study page lists CC0-1.0. [NASA OSDR study](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575) · [API documentation](https://visualization.osdr.nasa.gov/biodata/api/)

| Measure | Result |
|---|---:|
| De-identified participants / rows in source table | 4 / 28 |
| Indicator columns / eligible subject–indicator histories | 19 / 72 |
| Preflight samples per included history | 3 |
| Postflight predictions outside preflight predictive band | 79 / 287 |
| Postflight observations scored at R+1 / R+45 / R+82 / R+194 | 72 / 71 / 72 / 72 |

The transformed CMP and visit metadata include R+194, beyond the abbreviated study description. The primary kidney study also documents this visit. The JSON reports the direction, units, band, missingness and visit for each eligible measurement. Differences may reflect small baseline samples, within-person variability, collection conditions or flight. Multiple indicators and visits belong to the same people. The study did not preregister a specific indicator-direction pair from the literature, so directional concordance is unverified. [Primary study, Methods](https://www.nature.com/articles/s41467-024-49212-1.pdf)

![Individual MMASH predictive coverage varies by participant. The adjacent panel counts postflight values outside the frozen band for each of four Inspiration4 participants.](credibility-results.png)

## Reproduction

From the project root use Python 3.14.3 and the [pinned analysis dependencies](credibility-requirements.txt). Obtain the [MMASH archive](https://physionet.org/files/mmash/1.0.0/MMASH.zip) in `data/snapshots/MMASH.zip`. Run `python ml/proxy/credibility_fetch.py` to retrieve the public metadata and unrestricted CMP. Then run `python ml/proxy/credibility_analysis.py`. [Acquisition manifest](credibility-provenance.json) records the URLs, timestamps and hashes. Archive SHA-256 is `ef91ee1b36b5849a6366b1918de82686ab278915d33c7f62133f07f741f70726`. CMP SHA-256 is `5eb1e7f025dd8443a9e70111e62bc32afae3432753024489c5c013e401d709d9`. Source-engine hash, exclusions and per-participant metrics are in the detailed JSON.
