# Preregistration: MMASH real-public proxy

Question: does the unchanged Student-t personal baseline cover healthy real-public
heart-rate measurements at its nominal predictive level, and does a training-only
circadian context improve held-out coverage without hiding limitations?

Availability/license gate: open the official PhysioNet dataset page, record license
and terms before new downloads or redistribution. Reuse an existing local snapshot
only after checking its hash against the recorded provenance. Data are de-identified
real-public physiology, used as a proxy, never astronaut/event clinical validation.

Method: use all available participants with documented RR/HR data, transform valid
RR intervals to heart rate only when units are established from the official data
description. Aggregate to minute medians; discard non-finite/nonpositive RR. Keep
source-based exclusion counts. For each participant use the first chronological
20% of occupied minutes for training, requiring at least 60 training and 60 report
minutes. Do not fill missing minutes. Predict before updating on each report point;
use the engine's default forgetting factor and robust update. Initial prior mean/sd
come only from training data with a positive scale floor.

Compare raw baseline with an external circadian residual transform: fit intercept,
sin and cos of local clock time on training only; apply the fixed transform to
report data and pass residuals to the same unchanged engine. This is a context
adapter experiment, not a new engine feature. A partial-day training window cannot
establish circadian physiology. No report-data tuning.

Metrics: pooled and per-person empirical coverage of the engine's nominal 95%
predictive interval, outside-band flags per observed person-day (occupied minutes
divided by 1440, not assumed calendar days), interval width, training/report counts,
lag-one residual correlation, missing minute counts, constant segments and scale.
Check association with sleep/activity only if annotation timestamps and units can
be aligned without guessing. Otherwise explicitly NOT DONE for annotated-change
detection. No disease-event sensitivity inferred from healthy activity.

Pass/fail: calibration target coverage 90–98% on the pooled report set, chosen as a
descriptive tolerance before execution, not a clinical acceptance criterion. Report
failures and per-person outliers even if pooled coverage passes. Context is helpful
only if absolute distance from 95% decreases without a larger median interval width;
otherwise report no improvement. Correlation/independence caveats always apply.

Time-box: at most 90 minutes from first official dataset access in this work block.
Record start/end; do not erase negative results or reinterpret existing historic
`results.json` as a new run. New outputs use `credibility-*` filenames.
