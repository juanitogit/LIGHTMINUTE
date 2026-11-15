# Historical snapshot — do not quote

This directory preserves the first FreeBuff review run: **18/27 assertions
passed**, with nine safety findings open. It is kept only as review provenance.

The current evidence is [../fault-injection-results.md](../fault-injection-results.md)
and [../fault-injection-results.json](../fault-injection-results.json):
**27/27 passed at revision `05533ea`**. The hazard table is
[../hazard-analysis.md](../hazard-analysis.md).

Caveat added after the rerun: FI-13 passes its injection but the guard regresses
MMASH calibration (66.37 % pooled coverage against a 90–98 % tolerance); see
[FI-13](../hazard-analysis.md) and [public-data results](../../../ml/proxy/RESULTS.md).
