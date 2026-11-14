# Validation (SYNTHETIC crews)

Equal false-alarm budget (~0.1 per crew-week); thresholds tuned on separate seeds; 500 simulated crew members per effect size; onset day 14; recall = detected within 10 days. Effect sizes are shifts in units of within-person sd.

Reproduce with `python ml/validation/run_all.py` (writes this file, `results.json` and `apps/crew-tablet/public/data/validation.json`).

## Scenario 1: homogeneous crew (between-person sd x1)

| Method | FA / crew-week | recall mild(0.8 sd) | recall moderate(1.6 sd) | recall strong(3.0 sd) | median delay moderate (d) |
|---|---|---|---|---|---|
| A  Population threshold | 0.10 | 18% | 38% | 91% | 3 |
| B  N-of-1 z-score | 0.10 | 22% | 41% | 85% | 3 |
| B2 N-of-1 CUSUM | 0.10 | 18% | 72% | 100% | 6 |
| C  N-of-1 syndrome (directional) | 0.10 | 70% | 96% | 100% | 2 |

## Scenario 2: heterogeneous crew (between-person sd x2.5, e.g. athletes + deconditioned)

| Method | FA / crew-week | recall mild(0.8 sd) | recall moderate(1.6 sd) | recall strong(3.0 sd) | median delay moderate (d) |
|---|---|---|---|---|---|
| A  Population threshold | 0.14 | 9% | 13% | 27% | 3 |
| B  N-of-1 z-score | 0.10 | 26% | 50% | 88% | 3 |
| B2 N-of-1 CUSUM | 0.15 | 9% | 40% | 98% | 6 |
| C  N-of-1 syndrome (directional) | 0.10 | 66% | 93% | 100% | 2 |

## Calibration: do the 95% intervals mean anything?

Healthy report seeds, days 8-30, nominal coverage 95%, n = 11040 indicator-days.

| Indicator | 95% coverage | n |
|---|---|---|
| rest_hr | 97% | 2760 |
| temp_c | 94% | 2760 |
| sleep_h | 92% | 2760 |
| pvt_ms | 93% | 2760 |
| **Pooled** | **94%** | 11040 |

## Robustness 1: missing readings

Readings dropped at random before the engine sees them (40% approximates a failing wearable). Thresholds are NOT re-tuned per condition, so this measures degradation. 120 report seeds per cell.

| Missing | A recall moderate | B recall moderate | B2 recall moderate | C recall moderate | C FA / crew-week |
|---|---|---|---|---|---|
| 0% | 44% | 38% | 75% | 94% | 0.09 |
| 20% | 42% | 37% | 48% | 84% | 0.03 |
| 40% | 36% | 34% | 31% | 74% | 0.02 |

## Robustness 2: how much personal history before the shift

The shift starts after k days of personal data (k = 3/7/14). Recall = detected within 10 days of that onset; 120 report seeds per cell. Moderate effect (1.6 sd).

| Personal history at onset | A | B | B2 | C |
|---|---|---|---|---|
| 3 days | 52% | 38% | 45% | 74% |
| 7 days | 48% | 32% | 59% | 82% |
| 14 days | 44% | 38% | 75% | 94% |

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
