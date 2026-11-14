# LIGHTMINUTE — Model card

| | |
|---|---|
| **System** | LIGHTMINUTE on-board health decision support (NASA Space Apps 2026) |
| **Model version** | 0.1.0 (hackathon snapshot, 2026-11-14) |
| **Model type** | Per-person (N-of-1) conjugate Bayesian baseline + CUSUM + directional syndrome score. No neural network, no training set. |
| **Intended use** | Decision *support* for trained crew on long missions: flag a change from a person's own normal, state how sure it is, suggest protocol steps. |
| **NOT intended for** | Diagnosis, dosing, triage of an acute emergency, clinical use, real patient data, replacing a flight surgeon. **Not a medical device.** |
| **Data** | Synthetic crews (own simulator). One real proxy dataset (MMASH) used to test interval honesty. NOAA space weather used as context only. |

## Method (what actually decides)
1. **Baseline** — Normal-Inverse-Gamma conjugate model per (crew member, indicator): mean, variance, weak population prior (`prior_n=3`, `prior_var_n=0.5`), forgetting `lambda=0.98`, Student-t predictive. `surprise(x)` is always computed **before** `update(x)` so a value never judges itself.
2. **Robustness** — `robust_update` winsorises updates at ±3 sd, so an illness cannot be absorbed into the baseline within a few days.
3. **Change detection** — two-sided CUSUM (k=0.5, h=4) for small sustained shifts.
4. **Syndrome** — directional score `z_dir = s'z / sqrt(s'Ss)` over four indicators with a shrunk covariance learned on healthy days; signs come from `kb/syndromes.json` (labelled `demo-parameter`).
5. **Crew attribution** — if ≥50% of crew (≥2 people) cross z ≥ 2.33, flag a shared exposure and advise checking cabin environment first.
6. **Urgency** — a small readable rule table (`info`/`watch`/`act`/`escalate`); the LLM may keep or raise it, never lower it, and every card passes `verify_card`.
7. **Context** — mission profile (ISS 0 s / Moon 1.3 s / Mars 3–22 min one-way) changes routing, not the numbers.

## Validation summary
Full tables: `docs/validation.md` (regenerate with `python ml/validation/run_all.py`).
Equal false-alarm budget (~0.1/crew-week), tuning and report seeds disjoint, 500 simulated crew members per effect size.

| Condition | Population rule | N-of-1 z | N-of-1 CUSUM | N-of-1 syndrome |
|---|---|---|---|---|
| Homogeneous crew, mild effect recall | 18% | 20% | 13% | **71%** |
| Homogeneous crew, moderate | 38% | 39% | 60% | **96%** |
| Heterogeneous crew, strong | 27% | 89% | 96% | **100%** |
| Median delay, moderate effect | 3 d | 2 d | 6 d | **2 d** |

Additional checks in the same report:
- **Interval calibration** on healthy synthetic days: pooled **95%** coverage of the nominal 95% band (rest HR 98%, temperature 95%, sleep 94%, PVT 95%, n=11,040). Measured after the `alpha` fix; before it the pooled figure was 94%.
- **Missing readings** (random drops before the engine sees them): syndrome recall on a moderate effect falls 93% → 84% → 76% at 0/20/40% missing. CUSUM is the most fragile (61% → 45% → 29%): a cumulative sum that loses readings loses its evidence.
- **Baseline length at onset** (3/7/14 days of personal history): syndrome 79% → 84% → 93%. Short histories are usable but visibly weaker, which is why the UI shows `learning` below 7 observations.

## Real-data proxy (MMASH, 22 healthy adults, per-minute HR)
Run: `python ml/proxy/mmash.py` · report: `ml/proxy/README.md`.

| Condition | 95% coverage (nominal 95%) |
|---|---|
| Shipped model, one baseline per person over the whole day | **93.4%** |
| Same stream with the pre-fix update rule (kept in `ml/diagnostics`) | 21.6% |
| One baseline per (person, hour of day) | 94.0% |
| Night − afternoon median HR | −24 bpm |

This dataset has no labelled events, so it supports **no** recall or delay claim.

## Defects we found and what happened to them
1. **Over-weighted variance prior (fixed).** With `prior_n=3` on the variance, a wide
   population sd made the model lazy (estimated scale 3.95 vs 2.0 true). Fixed by
   separating `prior_var_n=0.5`; guarded by `tests/test_nof1.py`.
2. **Forgetting factor not applied to `alpha` (found, fixed 2026-11-14).** `update()`
   discounted `kappa` and `beta` but incremented `alpha` without discounting, so `df` grew
   without bound and the predictive interval collapsed. Measured on a flat healthy series:
   100% coverage at 23 updates, 83% at 200, 56% at 500, **16% at 2000**; on MMASH per-minute
   HR: **21.6%**. The fix discounts `alpha` toward its prior value
   (`alpha <- alpha0 + (alpha - alpha0)*lam + 0.5`), which puts the fixed point at
   `alpha0 + 0.5/(1-lam)` — df ≈ 52 instead of unbounded. Re-measured after the fix:
   **100% / 97% / 95% / 95%** at 23 / 200 / 500 / 2000 updates and **93.4%** on MMASH.
   `ml/diagnostics/forgetting_drift.py` keeps the old rule as `LegacyUndiscountedBaseline`
   so the defect stays reproducible, and `tests/test_nof1.py` fails if coverage collapses
   again. **What this changes:** every table above was regenerated with the fixed model;
   minute-level streaming is no longer the weak spot it was.

## Failure modes we know about
- **Whole-sensor failure** (not random drops): the syndrome imputes a neutral z=0; a sensor down for days silently removes that indicator's evidence.
- **Directional blindness:** the syndrome score only sees the prior direction (HR/temp up, sleep down, PVT slower). Anything moving the other way is caught only by CUSUM/z.
- **Homogeneous crews:** single-indicator N-of-1 z is *not* meaningfully better than a population rule there. The gains come from the syndrome score, CUSUM, and heterogeneity. Do not claim otherwise.
- **Behavioral indicators** (sleep, PVT, mood) are exploratory; confidence is deliberately low.
- **Verifier false rejects:** a legitimate card can be rejected for a formatting-number mismatch and replaced by the template. That is the safe direction, but it hides the LLM contribution.
- **Population priors** come from a weak synthetic assumption, not from real astronaut cohorts; no OSDR data was downloaded (see `docs/data-card.md`).

## What flight use would require
Prospective validation on real crew data with labelled events, clinical review of every threshold and protocol step, on-vehicle deployment with open weights (no hosted API for real data), a serialisable audit trail reviewed by a flight surgeon, and regulatory classification work. Everything here is a prototype.

## Reproduce
```bash
python scripts/run_tests.py                  # 77 tests
python ml/validation/run_all.py              # tables above -> docs/validation.md
python scripts/fetch_noaa.py                 # real space-weather snapshot + panel
python scripts/fetch_mmash.py && python ml/proxy/mmash.py
python ml/diagnostics/forgetting_drift.py    # defect 2, measured
python ml/sensitivity/circadian.py           # 24 h term, defect separated out
```
