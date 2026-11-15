# Value of autonomy — synthetic scenario results

**Task gate: DONE for the registered simulation; no mission or clinical claim.**
The primary conservative autonomy-window coverage is zero for both methods across the registered delay sweep. Daily observations cannot establish that an action happened before a reply arriving within minutes. Start-of-day point estimates are secondary assumptions, not measured minute-scale benefit.

Generated: `2026-11-14T20:45:17.195426+00:00`. Source revision: `a4cb4ccd6188d9e068e63ac8a9e26fe9658b48f3`. Preregistration was committed in `2fea48f` before execution. The study imports the engine unchanged. Full source hashes and pre-existing dirty source paths are in `results.json`; those hashes were equal before/after the analysis. No product file was edited by this study.

## Reproduce and inspect

From repository root, with the existing environment:
```powershell
.\.venv\Scripts\python.exe docs/autonomy/run_autonomy.py *> docs/autonomy/run.log
```
Actual command executed in this session (global interpreter with the existing venv packages):
```powershell
python -u -c "import sys,runpy; sys.path.insert(0,r'.venv/Lib/site-packages');runpy.run_path('docs/autonomy/run_autonomy.py',run_name='__main__')" *> docs/autonomy/run.log
```
The command exited successfully. `run.log` contains progress, the frozen tuning configuration and the aggregate output. `events.csv` preserves each event and null/empty nondetections; `daily.csv` preserves the scored crew-days; `aggregate.csv` and `sensitivity.csv` provide the tables without rounding. `results.json` holds provenance and machine-readable results.

## Registered design and population comparator

Default mission length: 24 days. Tuning seeds `1000–1009` and report seeds `2000–2029` are disjoint. All three scenario families and both strength variants are included, with every generated crew member. An event is one affected crew member in one scenario/variant/seed; shared CO2 crew events are correlated, not independent subjects.
The population score is the maximum distance outside a two-sided Earth reference, divided by its range width. It is a comparator implemented for this study, not an existing clinical early-warning score. It uses the repository's HR, temperature and sleep rules; their source strings are general/approximate references, not independently verified NASA limits. PVT has no Earth reference; CO2/headache are one-sided demo parameters and have no range width, so all three are excluded rather than assigned invented widths. See `FROZEN-COMPARATOR.json` for the original rules and exclusions.
The threshold was frozen at `0.965` with strict `score > threshold` before report split execution. Score ties at the cutoff stay quiet. On 4040 unaffected observed tuning crew-days, engine and population each produced 25 and 25 false act-days respectively. No engine threshold or scenario parameter was tuned.
On held-out seeds the realized false-alert budgets differ; these results must not be described as equal-budget held-out performance. Population watch is defined as its act threshold because this comparator has one operating point; its watch latency is not a separate calibrated early-warning output.

## Detection and false-action results

Latencies are medians among detected events only. Nondetections remain missing, never zero. First detection is searched from onset through the final mission day, as preregistered. False act-days are counted on observed days outside the affected effect interval, including recovery days and all days of unaffected crew. Effect duration is read from the simulator specification because the labels sidecar supplies onset/affected crew but omits its end. Sustained alarms count repeatedly; these are alert-days, not independent episodes.

| Method | Scenario / variant | Events | Watch detected (missed) | Median watch latency d | Act detected (missed) | Act detection | Median act latency d | False act-days / unaffected observed days | False acts / crew-week |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| engine | ALL / ALL | 360 | 354 (6) | 2.0 | 271 (89) | 75.28% | 2 | 71 / 12120 | 0.04101 |
| engine | cmo_fever / strong | 30 | 30 (0) | 1.0 | 27 (3) | 90.00% | 1 | 21 / 2580 | 0.05698 |
| engine | cmo_fever / mild | 30 | 29 (1) | 2 | 14 (16) | 46.67% | 2.0 | 16 / 2580 | 0.04341 |
| engine | sep_sleep_loss / strong | 30 | 30 (0) | 0.0 | 29 (1) | 96.67% | 1 | 15 / 2640 | 0.03977 |
| engine | sep_sleep_loss / mild | 30 | 30 (0) | 1.0 | 14 (16) | 46.67% | 1.0 | 19 / 2640 | 0.05038 |
| engine | co2_creep / strong | 120 | 120 (0) | 1.0 | 116 (4) | 96.67% | 2.5 | 0 / 840 | 0.00000 |
| engine | co2_creep / mild | 120 | 115 (5) | 4 | 71 (49) | 59.17% | 7 | 0 / 840 | 0.00000 |
| population | ALL / ALL | 360 | 133 (227) | 4 | 133 (227) | 36.94% | 4 | 137 / 12120 | 0.07913 |
| population | cmo_fever / strong | 30 | 8 (22) | 5.5 | 8 (22) | 26.67% | 5.5 | 35 / 2580 | 0.09496 |
| population | cmo_fever / mild | 30 | 6 (24) | 5.0 | 6 (24) | 20.00% | 5.0 | 32 / 2580 | 0.08682 |
| population | sep_sleep_loss / strong | 30 | 30 (0) | 1.0 | 30 (0) | 100.00% | 1.0 | 30 / 2640 | 0.07955 |
| population | sep_sleep_loss / mild | 30 | 14 (16) | 1.0 | 14 (16) | 46.67% | 1.0 | 25 / 2640 | 0.06629 |
| population | co2_creep / strong | 120 | 62 (58) | 6.0 | 62 (58) | 51.67% | 6.0 | 5 / 840 | 0.04167 |
| population | co2_creep / mild | 120 | 13 (107) | 4 | 13 (107) | 10.83% | 4 | 10 / 840 | 0.08333 |

First acts after the effect ended: engine 0, population 0. The population comparator detects more strong SEP events in this run; superiority is not universal. The overall mixture weights CO2 more heavily because it affects the full crew. No confidence intervals or significance claims are made for these correlated scripted simulations.

## Reply assumptions and autonomy coverage

ISS/Moon/Mars light-time inputs are imported from the repository's demo profiles, not verified mission facts. Ground-processing times below are explicit synthetic policies. Reply bounds are two-way light-time plus processing; no message loss, queueing, bandwidth, diagnosis quality or clinician availability is modeled here.
A day-bin action could occur anywhere within that mission day. Primary conservative success requires **the end of the action bin to precede the earliest reply**. Secondary point-time success assumes the reading/action and message origin occur at the start of their days. Equality is not counted as before. The denominator always includes all true events, including nondetections.

| Mission profile | Ground processing s | Earliest reply s | Latest reply s |
|---|---:|---:|---:|
| iss | 300 | 300 | 300 |
| iss | 900 | 900 | 900 |
| iss | 1800 | 1800 | 1800 |
| iss | 3600 | 3600 | 3600 |
| moon | 300 | 302.6 | 302.6 |
| moon | 900 | 902.6 | 902.6 |
| moon | 1800 | 1802.6 | 1802.6 |
| moon | 3600 | 3602.6 | 3602.6 |
| mars | 300 | 660 | 2940 |
| mars | 900 | 1260 | 3540 |
| mars | 1800 | 2160 | 4440 |
| mars | 3600 | 3960 | 6240 |

Full sensitivity (all registered profiles/processing policies and both message origins):

| Method | Origin | Profile | Processing s | Events | Conservative before earliest | Point before earliest | Conservative before latest | Point before latest |
|---|---|---|---:|---:|---:|---:|---:|---:|
| engine | true_onset | iss | 300 | 360 | 0/360 (0.00%) | 23/360 (6.39%) | 0/360 (0.00%) | 23/360 (6.39%) |
| engine | actual_first_watch | iss | 300 | 360 | 0/360 (0.00%) | 138/360 (38.33%) | 0/360 (0.00%) | 138/360 (38.33%) |
| engine | true_onset | iss | 900 | 360 | 0/360 (0.00%) | 23/360 (6.39%) | 0/360 (0.00%) | 23/360 (6.39%) |
| engine | actual_first_watch | iss | 900 | 360 | 0/360 (0.00%) | 138/360 (38.33%) | 0/360 (0.00%) | 138/360 (38.33%) |
| engine | true_onset | iss | 1800 | 360 | 0/360 (0.00%) | 23/360 (6.39%) | 0/360 (0.00%) | 23/360 (6.39%) |
| engine | actual_first_watch | iss | 1800 | 360 | 0/360 (0.00%) | 138/360 (38.33%) | 0/360 (0.00%) | 138/360 (38.33%) |
| engine | true_onset | iss | 3600 | 360 | 0/360 (0.00%) | 23/360 (6.39%) | 0/360 (0.00%) | 23/360 (6.39%) |
| engine | actual_first_watch | iss | 3600 | 360 | 0/360 (0.00%) | 138/360 (38.33%) | 0/360 (0.00%) | 138/360 (38.33%) |
| engine | true_onset | moon | 300 | 360 | 0/360 (0.00%) | 23/360 (6.39%) | 0/360 (0.00%) | 23/360 (6.39%) |
| engine | actual_first_watch | moon | 300 | 360 | 0/360 (0.00%) | 138/360 (38.33%) | 0/360 (0.00%) | 138/360 (38.33%) |
| engine | true_onset | moon | 900 | 360 | 0/360 (0.00%) | 23/360 (6.39%) | 0/360 (0.00%) | 23/360 (6.39%) |
| engine | actual_first_watch | moon | 900 | 360 | 0/360 (0.00%) | 138/360 (38.33%) | 0/360 (0.00%) | 138/360 (38.33%) |
| engine | true_onset | moon | 1800 | 360 | 0/360 (0.00%) | 23/360 (6.39%) | 0/360 (0.00%) | 23/360 (6.39%) |
| engine | actual_first_watch | moon | 1800 | 360 | 0/360 (0.00%) | 138/360 (38.33%) | 0/360 (0.00%) | 138/360 (38.33%) |
| engine | true_onset | moon | 3600 | 360 | 0/360 (0.00%) | 23/360 (6.39%) | 0/360 (0.00%) | 23/360 (6.39%) |
| engine | actual_first_watch | moon | 3600 | 360 | 0/360 (0.00%) | 138/360 (38.33%) | 0/360 (0.00%) | 138/360 (38.33%) |
| engine | true_onset | mars | 300 | 360 | 0/360 (0.00%) | 23/360 (6.39%) | 0/360 (0.00%) | 23/360 (6.39%) |
| engine | actual_first_watch | mars | 300 | 360 | 0/360 (0.00%) | 138/360 (38.33%) | 0/360 (0.00%) | 138/360 (38.33%) |
| engine | true_onset | mars | 900 | 360 | 0/360 (0.00%) | 23/360 (6.39%) | 0/360 (0.00%) | 23/360 (6.39%) |
| engine | actual_first_watch | mars | 900 | 360 | 0/360 (0.00%) | 138/360 (38.33%) | 0/360 (0.00%) | 138/360 (38.33%) |
| engine | true_onset | mars | 1800 | 360 | 0/360 (0.00%) | 23/360 (6.39%) | 0/360 (0.00%) | 23/360 (6.39%) |
| engine | actual_first_watch | mars | 1800 | 360 | 0/360 (0.00%) | 138/360 (38.33%) | 0/360 (0.00%) | 138/360 (38.33%) |
| engine | true_onset | mars | 3600 | 360 | 0/360 (0.00%) | 23/360 (6.39%) | 0/360 (0.00%) | 23/360 (6.39%) |
| engine | actual_first_watch | mars | 3600 | 360 | 0/360 (0.00%) | 138/360 (38.33%) | 0/360 (0.00%) | 138/360 (38.33%) |
| population | true_onset | iss | 300 | 360 | 0/360 (0.00%) | 7/360 (1.94%) | 0/360 (0.00%) | 7/360 (1.94%) |
| population | actual_first_watch | iss | 300 | 360 | 0/360 (0.00%) | 133/360 (36.94%) | 0/360 (0.00%) | 133/360 (36.94%) |
| population | true_onset | iss | 900 | 360 | 0/360 (0.00%) | 7/360 (1.94%) | 0/360 (0.00%) | 7/360 (1.94%) |
| population | actual_first_watch | iss | 900 | 360 | 0/360 (0.00%) | 133/360 (36.94%) | 0/360 (0.00%) | 133/360 (36.94%) |
| population | true_onset | iss | 1800 | 360 | 0/360 (0.00%) | 7/360 (1.94%) | 0/360 (0.00%) | 7/360 (1.94%) |
| population | actual_first_watch | iss | 1800 | 360 | 0/360 (0.00%) | 133/360 (36.94%) | 0/360 (0.00%) | 133/360 (36.94%) |
| population | true_onset | iss | 3600 | 360 | 0/360 (0.00%) | 7/360 (1.94%) | 0/360 (0.00%) | 7/360 (1.94%) |
| population | actual_first_watch | iss | 3600 | 360 | 0/360 (0.00%) | 133/360 (36.94%) | 0/360 (0.00%) | 133/360 (36.94%) |
| population | true_onset | moon | 300 | 360 | 0/360 (0.00%) | 7/360 (1.94%) | 0/360 (0.00%) | 7/360 (1.94%) |
| population | actual_first_watch | moon | 300 | 360 | 0/360 (0.00%) | 133/360 (36.94%) | 0/360 (0.00%) | 133/360 (36.94%) |
| population | true_onset | moon | 900 | 360 | 0/360 (0.00%) | 7/360 (1.94%) | 0/360 (0.00%) | 7/360 (1.94%) |
| population | actual_first_watch | moon | 900 | 360 | 0/360 (0.00%) | 133/360 (36.94%) | 0/360 (0.00%) | 133/360 (36.94%) |
| population | true_onset | moon | 1800 | 360 | 0/360 (0.00%) | 7/360 (1.94%) | 0/360 (0.00%) | 7/360 (1.94%) |
| population | actual_first_watch | moon | 1800 | 360 | 0/360 (0.00%) | 133/360 (36.94%) | 0/360 (0.00%) | 133/360 (36.94%) |
| population | true_onset | moon | 3600 | 360 | 0/360 (0.00%) | 7/360 (1.94%) | 0/360 (0.00%) | 7/360 (1.94%) |
| population | actual_first_watch | moon | 3600 | 360 | 0/360 (0.00%) | 133/360 (36.94%) | 0/360 (0.00%) | 133/360 (36.94%) |
| population | true_onset | mars | 300 | 360 | 0/360 (0.00%) | 7/360 (1.94%) | 0/360 (0.00%) | 7/360 (1.94%) |
| population | actual_first_watch | mars | 300 | 360 | 0/360 (0.00%) | 133/360 (36.94%) | 0/360 (0.00%) | 133/360 (36.94%) |
| population | true_onset | mars | 900 | 360 | 0/360 (0.00%) | 7/360 (1.94%) | 0/360 (0.00%) | 7/360 (1.94%) |
| population | actual_first_watch | mars | 900 | 360 | 0/360 (0.00%) | 133/360 (36.94%) | 0/360 (0.00%) | 133/360 (36.94%) |
| population | true_onset | mars | 1800 | 360 | 0/360 (0.00%) | 7/360 (1.94%) | 0/360 (0.00%) | 7/360 (1.94%) |
| population | actual_first_watch | mars | 1800 | 360 | 0/360 (0.00%) | 133/360 (36.94%) | 0/360 (0.00%) | 133/360 (36.94%) |
| population | true_onset | mars | 3600 | 360 | 0/360 (0.00%) | 7/360 (1.94%) | 0/360 (0.00%) | 7/360 (1.94%) |
| population | actual_first_watch | mars | 3600 | 360 | 0/360 (0.00%) | 133/360 (36.94%) | 0/360 (0.00%) | 133/360 (36.94%) |

The true-onset origin hypothetically sends a message at the moment of labelled onset, even if neither detector has noticed anything. The actual-first-watch alternative means the first watch on or after labelled onset, as registered; it ignores any earlier false watch. Those are different questions and must not be pooled. In particular, the population method defines watch and act identically, making its point-time act-before-reply count after watch largely tautological. The alternative does not demonstrate an independent speed advantage.

## Limitations and gate

- All crews, illnesses/exposures and outcomes here are synthetic, from our own simulator. This is not a clinical trial, mission validation, independent replication, diagnosis assessment or evidence of improved health outcomes.
- Historical validation results were visible before this preregistration. This analysis uses held-out seeds, but is not blinded or externally independent.
- Daily time resolution is coarser than every reply bound in this sweep. The zero conservative result is a valid negative outcome; positive point-time percentages cannot resolve that uncertainty.
- The engine was designed for these scenario families; held-out seeds vary noise and person offsets, not the underlying causal scenario design. Population reference choices and missing rules limit comparability.
- False-alert rates use unaffected crew-days, not all mission days, and repeated alarms are repeated alert-days. Detection medians exclude missed events; report misses alongside medians.
- A threshold already exceeded before onset can count as an onset-day detection; the registered metric does not require a new alarm transition. The separate false-alert cost must remain visible.
- No source outside the repository was needed or independently verified for these demo delay assumptions. No NASA assurance/clinical standard compliance is claimed.
- Existing baseline suite verification is coordinated separately by the parent credibility run; this script checks seed separation, conservative tuning and unchanged source hashes. It does not claim a fresh baseline-suite result.

| Item | Status | Evidence | Caveat |
|---|---|---|---|
| Preregistered analysis | DONE | `PREREG.md`, commit `2fea48f` | Historical validation already known |
| Unchanged engine and separate tuning/report seeds | DONE | `results.json`, `FROZEN-COMPARATOR.json` | Exact hashes recorded; no new engine tuning |
| Watch/act latency and nondetections | DONE | `events.csv`, `aggregate.csv` | Daily bins and detected-only medians |
| False act budget and population comparison | DONE | `daily.csv`, frozen threshold | Tuning budget matched; held-out budgets differ |
| Delay sensitivity and autonomy coverage | DONE | `sensitivity.csv` | All primary conservative coverage zero |
| Mission or clinical benefit | NOT DONE | No mission/clinical data | Simulation only |
