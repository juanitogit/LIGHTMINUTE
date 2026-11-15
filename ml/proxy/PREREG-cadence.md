# Exploratory cadence-aware guard evaluation

Registered before running this experiment. MMASH results and the earlier direction
check are already known; this is not blinded, independent or clinical validation.

Hypothesis: the unresolved-change guard was defined on daily samples and applies
incorrectly to minute-level samples. For explicitly timestamped high-frequency
data, count same-direction deviations against a fixed pre-shift reference and
require a minimum elapsed duration corresponding to the existing three daily
samples (two elapsed days). Continue the clipped adaptive baseline in parallel;
when the duration is reached, freeze the pre-shift reference and flag unresolved.
When timestamps are absent, preserve the existing daily-observation behavior.
Two days is a demo-policy adaptation, not a validated clinical threshold.

Before examining results, run existing engine tests plus synthetic tests for
minute-scale and daily sustained shifts, brief excursions, and invalid or
out-of-order timestamps. Evaluate raw and circadian-adjusted MMASH using the
existing chronological split and existing descriptive coverage gate 90–98%.
Keep historical results intact; report pooled and participant coverage,
guard behavior and negative results. This does not establish performance on
unseen participants or clinical events. No further parameter tuning on MMASH.
