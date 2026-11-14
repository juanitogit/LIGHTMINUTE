# Validation (SYNTHETIC crews)

Equal false-alarm budget (~0.1 per crew-week); thresholds tuned on separate seeds; 500 simulated crew members per effect size; onset day 14; recall = detected within 10 days. Effect sizes are shifts in units of within-person sd.

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

## Limitations (read before quoting any number)
- Synthetic data from our own simulator; effect applied in the syndrome direction.
- Method C knows the syndrome direction (a clinical prior); it is blind to other directions. B/B2 are direction-agnostic.
- Gaussian noise, independent indicators, 4 indicators, no circadian/exercise context. Real data will be harder.
- Single-indicator N-of-1 (B) is NOT dramatically better than a population rule when crews are homogeneous; the gains come from CUSUM, the syndrome score and heterogeneity.
- NOT clinical validation. Next: run unchanged on Inspiration4 / MMASH proxies and report what fails.
