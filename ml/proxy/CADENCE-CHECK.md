# Cadence-aware MMASH check

Exploratory re-evaluation on the previously inspected public MMASH data; not an
independent or clinical validation. Registration `bffb1f6` preceded this run.
Command: `python ml/proxy/cadence_check.py`. Full results, source SHA-256 and
dependency versions: `cadence-check-results.json`. Previous results remain in
`credibility-results.json` and `direction-check-results.json`.

| Model | Covered / held-out minutes | Coverage | Previously registered 90–98% descriptive gate |
|---|---:|---:|---|
| Prior guard, no timestamps (v2) | 15,590 / 23,488 | 66.37% | FAIL |
| Cadence-aware, raw heart rate | 21,879 / 23,488 | 93.15% | PASS |
| Cadence-aware, training-only clock residual | 22,320 / 23,488 | 95.03% | PASS |

The original v1 already produced these same pooled results; this repeated dataset
cannot be used to select a policy and then be called a blind test. A one-person
result or correlated minute-level observations are not independent clinical
outcomes. The residual interval was wider; a higher coverage alone does not
establish better clinical usefulness.

The explicit `observed_at` mode takes strictly increasing epoch seconds. It
tracks a reference at the first departure while the adaptive baseline continues
to update, flags `change_pending` and returns the anchor's `pending_z` and
`pending_p_two_sided` during the waiting period. A same-direction change present
for two days triggers the unresolved state and restores the anchor; a gap over
one day resets the candidate, because continuity cannot be established. These
durations are demo policy, not medical thresholds. Clients **must** show and
interpret pending status rather than treating the adaptive baseline as proof of
normality. The mode has synthetic tests, not clinical validation.

Existing calls without timestamps continue to use the original observation-count
guard. The researcher CSV CLI offers the explicit `--timestamped-guard` option;
the ordinary mission pipeline does not yet supply timestamps. This result applies
only to callers explicitly using the mode and is not evidence that every product
path has improved. The mission
pipeline simulates daily data and remains subject to the known guard limitations.

`python scripts/run_tests.py` and `python tests/fault_injection/run.py` cover the
existing daily path, shift preservation, invalid timestamps and missing gaps;
the exact final counts are recorded in the credibility summary.
