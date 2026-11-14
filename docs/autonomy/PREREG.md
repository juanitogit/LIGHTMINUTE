# Preregistration: value of autonomy (synthetic)

Registered before new analysis. The commit containing this file is the registration
record; scripts record the exact engine revision and execution time. Prior work in
this chat already exposed historical validation results. This is a new held-out
simulation analysis, not a blinded or independent external replication.

Question: how often can the unchanged daily scenario engine issue an action before
a hypothetical Earth reply, and at what false-action cost?

Method: import `pipeline.run_scenario` and scenario ground truth. Evaluate
`cmo_fever`, `sep_sleep_loss`, `co2_creep`, strong/mild. Tuning seeds 1000–1009;
report seeds 2000–2029. Never tune using report seeds. Use default scenario duration,
all generated crew, and native day indices. Count first watch-or-higher and
act-or-higher at/after true onset; non-detections remain non-detections, not zeros.

Ground assumptions: use the repository's ISS/Moon/Mars light-delay ranges as
demo inputs, not independently verified mission facts. Ground processing is an
explicit synthetic policy sweep: 300/900/1800/3600 seconds. Compare earliest and
latest round-trip reply if a message is sent at true onset. Also show the reply
from the actual first watch; label this later-origin alternative separately.
Daily sampling cannot resolve minutes. Report day-bin ambiguity: an action in the
onset day may be earlier or later than a minutes-scale reply. Primary conservative
coverage requires the end of the action day-bin to precede the earliest reply;
secondary point-time coverage assumes a reading at the start of each day.

Population comparator: max indicator distance outside the cited Earth reference
range in units of range width; null ranges contribute no evidence. Calibrate a
single threshold on tuning seeds to be no more liberal than the engine's false
act crew-day budget, with ties resolved conservatively. Freeze it before report
seed runs. Missing references are reported, never invented. Count false act days
only outside labelled onset/affected intervals; denominator is observed unaffected
crew-days divided by seven. Sustained alarms count as repeated alert-days, not
independent incidents. Report comparator and engine realized held-out budgets;
do not call budgets equal if they differ.

Metrics: event detection fraction, median first watch/act latency among detected
events plus non-detection count, false act alerts per crew-week, conservative and
point-time autonomy coverage with all true events as denominator, and sensitivity
to processing and light-time assumptions. Write per-event and aggregate CSV/JSON.

Pass/fail: a valid analysis has disjoint seeds, preserves non-detections, includes
false alerts and time-resolution caveats, and is reproducible. No minimum effect
size is required; zero conservative benefit and comparator superiority are valid
negative outcomes. Simulator-based benefits are not mission or clinical claims.
