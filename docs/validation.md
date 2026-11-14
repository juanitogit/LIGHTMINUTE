# Validation (SYNTHETIC crews)

Equal false-alarm budget (~0.1 per crew-week); thresholds tuned on separate seeds; 500 simulated crew members per effect size; onset day 14; recall = detected within 10 days. Effect sizes are shifts in units of within-person sd.

Reproduce with `python ml/validation/run_all.py` (writes this file, `results.json` and `apps/crew-tablet/public/data/validation.json`).

## Scenario 1: homogeneous crew (between-person sd x1)

| Method | FA / crew-week | recall mild(0.8 sd) | recall moderate(1.6 sd) | recall strong(3.0 sd) | median delay moderate (d) |
|---|---|---|---|---|---|
| A  Population threshold | 0.10 | 18% | 38% | 91% | 3 |
| B  N-of-1 z-score | 0.09 | 20% | 39% | 84% | 2 |
| B2 N-of-1 CUSUM | 0.09 | 13% | 60% | 100% | 6 |
| C  N-of-1 syndrome (directional) | 0.10 | 71% | 96% | 100% | 2 |

## Scenario 2: heterogeneous crew (between-person sd x2.5, e.g. athletes + deconditioned)

| Method | FA / crew-week | recall mild(0.8 sd) | recall moderate(1.6 sd) | recall strong(3.0 sd) | median delay moderate (d) |
|---|---|---|---|---|---|
| A  Population threshold | 0.14 | 9% | 13% | 27% | 3 |
| B  N-of-1 z-score | 0.11 | 27% | 51% | 89% | 3 |
| B2 N-of-1 CUSUM | 0.16 | 8% | 30% | 96% | 6 |
| C  N-of-1 syndrome (directional) | 0.10 | 66% | 93% | 100% | 2 |

## Calibration: do the 95% intervals mean anything?

Healthy report seeds, days 8-30, nominal coverage 95%, n = 11040 indicator-days.

| Indicator | 95% coverage | n |
|---|---|---|
| rest_hr | 98% | 2760 |
| temp_c | 95% | 2760 |
| sleep_h | 94% | 2760 |
| pvt_ms | 95% | 2760 |
| **Pooled** | **95%** | 11040 |

## Robustness 1: missing readings

Readings dropped at random before the engine sees them (40% approximates a failing wearable). Thresholds are NOT re-tuned per condition, so this measures degradation. 120 report seeds per cell.

| Missing | A recall moderate | B recall moderate | B2 recall moderate | C recall moderate | C FA / crew-week |
|---|---|---|---|---|---|
| 0% | 44% | 33% | 61% | 93% | 0.09 |
| 20% | 42% | 38% | 45% | 84% | 0.04 |
| 40% | 36% | 37% | 29% | 76% | 0.03 |

## Robustness 2: how much personal history before the shift

The shift starts after k days of personal data (k = 3/7/14). Recall = detected within 10 days of that onset; 120 report seeds per cell. Moderate effect (1.6 sd).

| Personal history at onset | A | B | B2 | C |
|---|---|---|---|---|
| 3 days | 52% | 45% | 45% | 79% |
| 7 days | 48% | 36% | 55% | 84% |
| 14 days | 44% | 33% | 61% | 93% |

## Real data and model variants (separate scripts, same engine)
- Proxy run on MMASH wearable HR: `python ml/proxy/mmash.py` -> `ml/proxy/README.md`.
- Forgetting-factor diagnostic and proposed fix: `python ml/diagnostics/forgetting_drift.py`.
- Circadian sensitivity, with the forgetting defect separated out: `python ml/sensitivity/circadian.py`.

## Limitations (read before quoting any number)
- Synthetic data from our own simulator; effect applied in the syndrome direction.
- Method C knows the syndrome direction (a clinical prior); it is blind to other directions. B/B2 are direction-agnostic.
- Gaussian noise, independent indicators, 4 indicators, no circadian/exercise context. Real data will be harder.
- Single-indicator N-of-1 (B) is NOT dramatically better than a population rule when crews are homogeneous; the gains come from CUSUM, the syndrome score and heterogeneity.
- Missing readings are imputed as a neutral z=0 for the syndrome score, and its covariance is learned only on complete healthy days; a real dropout pattern (whole sensors failing for days) is harsher than random drops.
- Robustness cells use 120 report seeds, so their percentages carry wide intervals; treat differences under ~10 points as unresolved.
- NOT clinical validation. Next: run unchanged on Inspiration4 / MMASH proxies and report what fails.
