# Software hazard analysis · LIGHTMINUTE

**Scope.** These are consequences if someone relied on this simulator; no crew harm was measured. All injections used synthetic data. Severity expresses the possible consequence, independent of likelihood. Low means inconvenience, medium means added work or confusion recoverable by checking the record, high means a materially misleading or delayed decision, and critical means a potentially suppressed urgent escalation or disclosure of withheld sensitive information.

Each FI identifier links the mode to its named executable case and observed output in [the run table](fault-injection-results.md). MITIGATED-TESTED means the specified assertion passed at that interface. OPEN means the guard failed, raised an exception, or was absent. MITIGATED-UNTESTED would mean a documented control exists but was not exercised. Column “check / control” gives the detection method followed by the design behavior.

| ID | Component and failure mode | Cause → possible effect | Severity | Check / control | Residual risk | Status |
|---|---|---|---|---|---|---|
| FI-01 | Verifier, invented measurement in facts text | Generated number lacks sensor support → unnecessary escalation | High | Mutate facts sentence / compare numbers with engine facts | Correct numbers can still describe the wrong indicator | MITIGATED-TESTED |
| FI-02 | Verifier, invented measurement in headline | Numeric check misses headline → false reading displayed prominently | High | Mutate headline / unsupported number accepted | Crew may trust the headline alone | OPEN |
| FI-03 | Verifier, lowered urgency | Generated level drops below engine level → delayed action | Critical | Lower structured level / reject downgrade | Narrative can still imply low urgency | MITIGATED-TESTED |
| FI-04 | Verifier, unknown citation | Generated identifier lacks a source → false authority | High | Submit missing ID / check against KB | Existing ID does not guarantee relevant support | MITIGATED-TESTED |
| FI-05 | Card service, free text influences output | Instructions in symptom text could redirect generated advice → bad escalation | Critical | Supply hostile text and predetermined invalid provider response / reject and render template | Tests downstream guard only; model susceptibility and plausible unsafe text unmeasured | MITIGATED-TESTED |
| FI-06 | Card service, provider call fails | Timeout during request → absent guidance | High | Raise transport timeout / template returns | Local template shares dependence on engine facts | MITIGATED-TESTED |
| FI-07 | Card service, client fails to initialize | Exception before request guard → no fallback card | High | Raise during construction / exception escapes | Unavailable when service is enabled but cannot start | OPEN |
| FI-08 | Pipeline, NaN input | Invalid sensor sample → non-finite output or score | High | Inject NaN / QC drops sample; JSON serializes | Loss reduces evidence available | MITIGATED-TESTED |
| FI-09 | Pipeline, impossible heart rate | Extreme input → spurious alert | High | Inject out-of-range HR / QC drops sample | Plausible but wrong values can survive | MITIGATED-TESTED |
| FI-10 | Card, stale HR during dropout | Current sample absent; prior HR reused → perceived current measurement | High | Remove HR / inspect displayed facts | No freshness qualifier in observed card | OPEN |
| FI-11 | Sensor QC, frozen signal | Repeated plausible HR → false impression of stable condition | High | Hold channel constant / inspect output for stuck flag | Hardware freshness unverified; test looks for explicit stuck indication | OPEN |
| FI-12 | Baseline, single outlier moves reference | Isolated excursion → later readings judged against distorted baseline | High | Compare posterior locations / winsorized update reduces influence | Bound is relative in this fixture; no general tolerance established | MITIGATED-TESTED |
| FI-13 | Baseline, sustained abnormal state learned | Repeated shift during adaptation → low surprise despite persistent change | High | Compare surprise before and after repeated updates / clipping insufficient | Model alone cannot distinguish adaptation from illness | OPEN |
| FI-14 | Pipeline, personalized conclusions too early | Sparse history → overconfidence | High | Inspect initial days / learning flag and info level | Early event detection during learning unestablished | MITIGATED-TESTED |
| FI-15 | Mission API, duplicate message | Retry accepted twice → repeated response or confused history | High | Repeat same request with same key / two distinct IDs | Lost acknowledgement may prompt another submission | OPEN |
| FI-16 | Mission API, arrival inversion | Messages have different travel times → missing or misordered context | Medium | Advance clock across arrivals / both records retained | No causal order for acting on instructions | MITIGATED-TESTED |
| FI-17 | Mission API, premature delivery | Ignored transit interval → crew assumes ground knows sooner | High | Read before and after scheduled arrival / filter recipient visibility | Clock and link modeled locally | MITIGATED-TESTED |
| FI-18 | Mission API, failed write acknowledged | Storage unavailable → false belief report was sent | High | Raise database error during POST / server reports failure | Loss after successful commit and real packet loss untested | MITIGATED-TESTED |
| FI-19 | Mission API, withheld structured behavior delivered | Serializer includes nonconsented category → disclosure | Critical | Place sentinel in behavioral section / category filtered | Other text fields cross consent boundary (FI-20) | MITIGATED-TESTED |
| FI-20 | Mission API, withheld behavior in allowed text | Category filter trusts free text → recipient sees sensitive information | Critical | Inspect ground response for sentinel / top-level category filter insufficient | Test demonstrates exposure in the combined fixture | OPEN |
| FI-21 | Audit log, stored payload edited | Record changes after creation → incorrect reconstruction | High | Change payload / verification locates changed entry | Unkeyed chain does not authenticate the author or anchor the entire history | MITIGATED-TESTED |
| FI-22 | Mission API, invalid profile | Unknown profile changes assumed travel time → inappropriate routing | High | Submit undefined profile / schema rejects request | Valid but wrong profile still possible | MITIGATED-TESTED |
| FI-23 | Card service, incorrect mission context | Fixed Mars context on Moon scenario → wrong delay conveyed to generator | High | Inspect payload built from lunar scenario / profile mismatch | Output impact depends on card generator | OPEN |
| FI-24 | Scenario API, engine unavailable | Fallback served after engine failure → stale inference mistaken for fresh | High | Disable engine / response marks file source and synthetic data | Downstream consumers must read labels | MITIGATED-TESTED |
| FI-25 | Scenario API, wrong fallback identity | Requested file missing; another scenario substituted → wrong crew narrative | High | Remove requested fallback at read boundary / compare effective and advertised names | Source label alone fails to identify substitution | OPEN |
| FI-26 | Radiation UI, old snapshot appears current | Cached environmental input ages → outdated context used | High | Inject archived timestamp / browser displays archive label and date | No tested maximum-age rejection | MITIGATED-TESTED |
| FI-27 | Tablet UI, offline data appears live | API outage triggers local scenario → misinterpretation | High | Return unavailable API responses / browser shows local simulation and synthetic labels | Only the tested screen and built artifact are covered | MITIGATED-TESTED |

## Unsafe control actions (STPA-inspired)

| Control action | Unsafe context or timing | Constraint and evidence |
|---|---|---|
| Issue a crew-facing card | Headline cites unsupported HR; latest HR is absent | Every measurement shown needs a source, unit and acquisition time. FI-02 and FI-10 remain open. |
| Withhold escalation or card | Generated urgency drops, provider initialization fails, or adaptation absorbs a sustained shift | Preserve engine urgency and fallback availability; distinguish changed physiology from a governed decision to relearn. FI-03 passed; FI-07 and FI-13 remain open. |
| Send a report to ground | Unstructured content carries a withheld category | Consent must apply to the transmitted representation. FI-19 and FI-20 show the boundary. |
| Repeat an action on receipt | Delayed and retried messages arrive after the original | Use stable identities across retries and timestamps visible to the operator. FI-15 and FI-16 cover different guarantees. |
| Advise waiting for a ground reply | Card context represents a different mission than its scenario | Derive delay context from the same scenario used for routing. FI-17, FI-22, FI-23. |
| Continue displaying a case during outage | Fallback belongs to a different scenario or archived inputs lack freshness | Preserve actual case identity, retrieval time and source through the UI. FI-24 through FI-27. |

## Evidence and remaining exposure

Run from the repository root. `.venv/Scripts/python.exe tests/fault_injection/run.py` produced [27 observations](fault-injection-results.json), [console output](fault-run.log) and [per-case verdicts](fault-injection-results.md). The harness returned nonzero: 18 passed, eight assertions failed and one exception escaped. The independent command `.venv/Scripts/python.exe scripts/run_tests.py` recorded [85/85 passing](baseline-tests.log) on the working checkout.

These results concern demo software. Hardware faults, network partitions and recovery after a lost client acknowledgement, whole-history audit replacement, clinical validity, protection from arbitrary generated text, and safe use in an actual mission remain unverified. The handoff gives an acceptance condition for each observed open case.

The evidence was collected on a working checkout with local API and tablet changes. [SHA-256 manifest](checkout-sha256.txt) fingerprints the Python engine sources and built JS/HTML observed after the run. Recreate it with PowerShell Get-FileHash -Algorithm SHA256 over those listed paths. The revision alone does not pin local modifications.
