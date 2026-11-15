# Exploratory recheck: directional sustained-change guard

Question: does counting consecutive departures only when their direction agrees
change raw minute-level MMASH predictive coverage, while retaining detection of
sustained positive and negative synthetic shifts?

The MMASH v1 and v2 results and participant data were already inspected. This is
an exploratory regression check, **not a blinded or independent validation** and
must not be used to tune thresholds on the same dataset. No model parameters
are to be selected from this run.

Method: use the local SHA-256-verified MMASH archive and the existing
`credibility_analysis.mmash()` method unchanged, including its chronological
20% training split, per-person minute aggregation and prediction-before-update.
Report the raw pooled covered/total and coverage, the original descriptive
90–98% criterion, per-person results and the context-adjusted result. Compare
against historical v2 without claiming causality from this comparison alone.
Also execute the existing fault-injection suite and the upward/downward and
alternating-sign synthetic unit tests. A passing aggregate cannot prove clinical
validity or safe behavior under high-frequency physiological drift.

Keep historical v2 artifacts unchanged. Write new output under
`ml/proxy/direction-check-results.json` and record the source revision, local
source-file SHA-256, dependency versions, command, date and failure status.
