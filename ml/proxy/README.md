# Real-data proxy check (MMASH) — PROXY, not astronaut data

`python ml/proxy/mmash.py` (needs `python scripts/fetch_mmash.py` first).

## What is run
`tether_engine.bayes.BaselineModel`, **unchanged**: the same code path the engine
uses on board. Input is real per-minute heart rate from MMASH 1.0.0 (PhysioNet):
22 healthy adults, ~24 h each, median Actigraph HR per clock minute, zero readings dropped.

No detection accuracy is claimed here. MMASH has one day per person and no labelled
health events, so recall and delay cannot be measured from it. What it can test is the
claim our Decision Cards rest on: **does a per-person 95% interval cover that person's
real values?**

## Result

| Condition | 95% interval coverage | Minutes scored | Nominal |
|---|---|---|---|
| Shipped model, one baseline per person, whole day | **93.4%** | 29,937 | 95% |
| One baseline per (person, hour of day) | 94.0% | 25,137 | 95% |
| Same stream, pre-fix update rule (kept in `ml/diagnostics`) | 21.6% | 29,937 | 95% |

Night (01–05 h) minus afternoon (13–17 h) median HR: **−24 bpm** (range across users −4.8 to −36).

## What this actually means (corrected after diagnosis)
The first version of this note blamed the 21.6% on mixing circadian contexts. That was
wrong, and `ml/diagnostics/forgetting_drift.py` shows why:

- The baseline model applies the forgetting factor to `kappa` and `beta` but **not to
  `alpha`**, so `df = 2*alpha` grows without bound while the scale shrinks. After a few
  hundred updates the Student-t collapses into a very narrow Gaussian.
- A *flat* synthetic series reproduces the collapse exactly (100% coverage at 23 updates,
  83% at 200, 56% at 500, 16% at 2000), so the rhythm is not the cause.
- Discounting `alpha` like the other two statistics fixes it: the engine ships that rule
  now, and the same script measures **93.4%** on MMASH and **95%** at 2000 updates.
- The hourly variant looked healthy even before the fix (90.4%) mainly because each hour
  bucket holds only ~21 updates — it resets the drift, it does not diagnose it. It reads
  94.0% with the fix.

## Still true, and still design-relevant
Real HR moves ~24 bpm between night and afternoon. Any single band that spans both must
be very wide; `ml/sensitivity/circadian.py` confirms it: with a 24 h term inside one
baseline, coverage goes to 99–100% (the interval widens to swallow the rhythm) instead of
staying tight. Statistically that is honest, operationally it is insensitive — which is
why the engine keeps contexts separate instead of enlarging one band.

We have **not** measured detection power on MMASH (no labelled events exist). Do not
quote this dataset as evidence that anything is detected.

## Caveats (state these whenever quoting the table)
- Healthy volunteers, optical wearable HR, not astronauts and not clinical ECG.
- One day per person: no long-horizon adaptation, no illness.
- Minutes are autocorrelated; coverage across minutes is descriptive, not an iid estimate.
- `robust_update` (winsorised) is the production path and is used here.
- ODbL 1.0 data: attribution required; the archive is a checksummed snapshot
  (`data/snapshots/manifest.json`), aggregate results only are published.

Source: MMASH 1.0.0, <https://physionet.org/content/mmash/1.0.0/> (Rossi et al., 2020).
