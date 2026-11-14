---
name: bayesian-n-of-1-engine
description: How to implement and extend the per-astronaut Bayesian baseline engine (Normal-Inverse-Gamma conjugate updates, Student-t predictive, forgetting factor, CUSUM, hierarchical priors from proxy data). Use for ANY work on anomaly detection, baselines, thresholds, z-scores, early warning, "unusual for this person", false-alarm tuning, or multi-indicator fusion, even if the user just says "detect when something is off".
---
# N-of-1 Bayesian engine

Code: `services/engine/tether_engine/bayes/nof1.py` (tested: `services/engine/tests/test_nof1.py`). Read it before editing.

## Why not population thresholds
With n=4 crew, population statistics fail; NASA HRP's Artemis II Data Methodology Challenge rewarded hierarchical Bayesian / N-of-1 / empirical-Bayes methods with borrowed strength from proxy cohorts. We compare each person to **their own** history and say how sure we are.

## Contract
1. `surprise(x)` BEFORE `update(x)` — a point must not judge itself.
2. Return z, two-sided p, 95% credible interval, baseline, df, n_seen. Cards quote these numbers.
3. Weak priors: `prior_n` (mean) ~3, `prior_var_n` ~0.5. A wide population sd must not make the model lazy (we hit this bug; tests guard it).
4. `lam` ~0.98 forgets slowly so legitimate adaptation is tracked; abrupt shifts still surprise.
5. Pair every z-detector with a `CUSUM` for small sustained shifts.
6. Separate models per *context* (rest vs exercise vs sleep; pre/post EVA). Never mix.
7. Quality control first: drop sensor dropouts/artifacts before modelling; log what was dropped.

## Fusion (keep it simple, explainable)
- Per-indicator evidence -> per-risk-family score = weighted sum of |z| capped at 4, plus CUSUM alarms.
- Escalation level from a small, readable rule table in `protocols/` (info/watch/act/escalate). No black box decides urgency.
- Multi-indicator agreement raises level; single noisy indicator lowers confidence.

## Hierarchical prior
Fit population mean/sd of each indicator from proxy data (OSDR Inspiration4, PhysioNet MMASH) offline in `ml/`; store as `kb/priors.json` with source + date. Runtime code only reads the JSON.

## Do not
- Do not add deep nets for the MVP. Do not tune thresholds on the test scenarios (leakage). Do not report p-values as probabilities of disease.
- Keep tests green: `make test`.

## Added in v2 (all tested)
- `robust_update()` winsorizes anomalous points so illness is not absorbed into the baseline.
- `SyndromeScore` (`bayes/syndrome.py`): directional multi-indicator score with shrunk covariance; signs come from `kb/syndromes.json` (cite them or label demo-parameter).
- `crew/attribution.py`: shared-exposure vs individual.
- **Honest finding:** at equal false-alarm budget single-indicator N-of-1 z is NOT much better than a population rule in a homogeneous crew; the wins are CUSUM, the syndrome score, and heterogeneous crews (`docs/validation.md`). Never claim otherwise.
