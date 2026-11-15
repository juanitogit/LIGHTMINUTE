# Exploratory direction-guard check

Run: `python ml/proxy/direction_check.py`; preregistration committed as
`8da7041` before execution. The input and original results were already known,
so this is **not independent validation**. Machine-readable output, source
SHA-256, revision, environment and per-person values:
`ml/proxy/direction-check-results.json`.

The directional change corrects a distinct error: alternating high and low
outliers no longer count as one same-direction run. Engine tests cover upward
and downward sustained shifts and alternating excursions. Commands:
`python scripts/run_tests.py` (113/113) and `python tests/fault_injection/run.py`
(27/27); `uvx ruff check services/engine` passed.

On the previously studied MMASH minute data, raw coverage remains
15,590/23,488 = **66.37%**, below the 90–98% descriptive gate and unchanged
from the prior v2 run. The circadian residual result remains 13,197/23,488 =
56.19%. This fix therefore **does not fix the coverage regression**. Both
figures are terrestrial proxies and make no astronaut or clinical claim.

The guard still counts observations rather than elapsed time; three consecutive
minute readings are treated like three consecutive daily readings. A safe
redesign must specify timestamp/cadence handling, missing and out-of-order
readings, and preserve the ability to flag prolonged shifts. It needs a new
independent evaluation; do not tune against these already inspected MMASH data.
