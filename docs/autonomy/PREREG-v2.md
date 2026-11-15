# Preregistration v2: value of autonomy (synthetic), engine revision 6deea70

Registered before the v2 analysis was executed. This file is the registration
record; `run_autonomy.py` records the exact engine revision and source hashes.
It is not a blinded or independent replication.

## Why a second registration

The v1 study (`PREREG.md`, committed in `2fea48f`) imported the engine at
`a4cb4cc`. Nine fault-injection findings were subsequently fixed in `05533ea`,
including FI-13: a sustained deviation is no longer absorbed into the personal
baseline without an explicit re-baseline. That change was made after the v1
results were seen, and it can plausibly increase sustained alert-days and alter
detection latency. The v1 numbers therefore do not describe the engine that
would ship. V1 outputs are preserved under `docs/autonomy/archive-pre-fix/`.

This registration repeats the v1 question and method so the two revisions are
comparable. Prior aggregate v1 results were known before this file was written;
the report must say so and must not present v2 as a blinded confirmation.

## Question

How often can the shipped daily scenario engine issue an action before a
hypothetical Earth reply, and at what false-action cost, after the FI-13 change?

## Method (identical to v1 unless stated)

Import `pipeline.run_scenario` and scenario ground truth. Evaluate `cmo_fever`,
`sep_sleep_loss`, `co2_creep`, strong and mild. Tuning seeds `1000–1009`;
report seeds `2000–2029`, disjoint and never tuned. Default scenario duration,
all generated crew, native day indices. Count first watch-or-higher and
act-or-higher at or after true onset. Non-detections remain non-detections, not
zeros. No engine threshold, scenario parameter or seed is changed.

Ground delay assumptions, processing sweep (300/900/1800/3600 s), reply
bounds, day-bin ambiguity, conservative and point-time coverage, and the
population comparator are unchanged from v1. The comparator remains an
implemented study score, not a clinical early-warning score.

Comparator threshold: re-frozen on tuning seeds only, by the v1 rule (single
threshold no more liberal than the engine's tuning false-act budget, ties
resolved conservatively), because the engine's tuning behaviour may have
changed. The v1 threshold (`0.965`) and the v1 tuning outcome were already
known; the report must disclose both the old and the new frozen value. Report
seeds remain untouched until `FROZEN-COMPARATOR.json` exists.

Metrics unchanged: event detection fraction, median first watch/act latency
among detected events plus non-detection counts, false act alerts per
crew-week, conservative and point-time autonomy coverage over all true events,
and sensitivity to processing and light-time assumptions. Per-event and
aggregate CSV/JSON outputs.

## Pass/fail and limits

A valid analysis has disjoint seeds, preserves non-detections, includes false
alerts and time-resolution caveats, and is reproducible. No minimum effect size
is required; zero conservative benefit, a worse result than v1, or comparator
superiority are all valid outcomes and must be reported without reinterpretation.
Simulator-based benefits are not mission or clinical claims.

## Time-box

One local execution on the existing snapshot; no network and no LLM calls. If
the run fails, fix only harness/report defects (not analysis rules) and record
the failed attempt.
