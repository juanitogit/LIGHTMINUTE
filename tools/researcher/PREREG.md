# Preregistration: offline researcher tool verification

Question: can a standalone CSV adapter reuse the unchanged repository engine with
honest per-subject predictions, quality flags and reproducible offline reports?

Method: import BaselineModel, CUSUM and SyndromeScore; no copied statistical engine,
LLM or network. Require explicit --label synthetic|real-public|proxy. Sort within
subject by parsed time; reject duplicate subject/timestamp pairs and malformed
numbers; missing observations do not update the corresponding model. Report
learning phase and insufficient observations. Initialize each indicator from its
first seven nonmissing observations (training only), then predict before robust
updates; omit inferential scoring during those training observations. Report
Student-t predictive intervals, not posterior credible intervals for the mean.

Verification before reporting: golden fixture against direct engine calls; bad
columns/timestamps/duplicate IDs/non-finite input; deterministic forty-percent
missing fixture; constant series; single subject; HTML escaping and self-contained
report. Results must have finite or explicit null scores, no invented imputations,
no cross-subject baseline sharing and no inference from training on future rows.

Pass/fail: all adapter contract tests pass with no network. Failures stay documented
and fixed only within owned tool paths. No claim of medical/clinical validation.
