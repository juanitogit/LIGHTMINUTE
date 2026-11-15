# Preregistration v2: MMASH real-public proxy, engine revision 6deea70

Registered before the v2 MMASH analysis was executed. This is a new
registration, not a blinded replication: the v1 aggregate coverage numbers
(93.15 % raw, 95.03 % circadian residual) and per-person results were already
known when this file was written. V1 outputs are preserved under
`ml/proxy/archive-pre-fix/`.

## Why a second registration

V1 (`PREREG-MMASH.md`, committed in `2fea48f`) imported the engine at
`e0c1fb5`. Nine fault-injection findings were fixed in `05533ea`, including
FI-13: a sustained deviation is no longer absorbed into the personal baseline.
MMASH is healthy real-public physiology with genuine circadian and activity
drift, so the guard could plausibly reduce coverage or widen intervals. The
shipped engine must be described by numbers measured on itself.

## Question and method (identical to v1 unless stated)

Question: does the shipped Student-t personal baseline cover healthy
real-public heart-rate measurements at its nominal predictive level, and does
a training-only circadian context improve held-out coverage without hiding
limitations?

Availability/license: reuse the existing local snapshot
`data/snapshots/MMASH.zip` only after checking its SHA-256 against the
recorded official `SHA256SUMS` value; the script refuses a mismatch. Data are
de-identified real-public physiology used as a proxy, never astronaut or
event clinical validation. No network access is required or used.

Processing, exclusions, minute aggregation, chronological 20 % training split
(minimum 60 training and 60 report minutes), prediction-before-update,
default forgetting factor, robust update, training-only prior with positive
scale floor, and the training-only circadian residual adapter are unchanged.
No report-data tuning.

Metrics unchanged: pooled and per-person empirical coverage of the nominal
95 % interval, outside-band flags per observed person-day, interval width,
training/report counts, lag-one residual correlation, missing minutes,
constant segments and scale, and the preregistered helpfulness rule for the
context adapter. Annotated sleep/activity association only if alignment is
unambiguous; otherwise NOT DONE for annotated-change detection. No
disease-event sensitivity inferred.

Pass/fail: calibration target 90–98 % pooled report coverage, a descriptive
tolerance chosen in v1 and kept unchanged. Report failures and per-person
outliers even if pooled coverage passes. Context is helpful only if absolute
distance from 95 % decreases without a larger median interval width.

## Expected risk and reporting

Because v1 results are known, this is a confirmation on a revised engine, not
an independent test. A coverage drop, a failed calibration gate, or a changed
helpfulness verdict are valid outcomes and must be reported as such; v1 numbers
stay visible as historical results. Do not describe v2 as validation of the
baseline in astronauts.

## Outputs and time-box

New outputs use `credibility-*` filenames, overwriting only the working copies;
the v1 copies remain in `archive-pre-fix/`. One local execution on the existing
snapshot; no network and no LLM calls. Harness or reporting defects may be
fixed; analysis rules may not be changed after seeing v2 numbers.
