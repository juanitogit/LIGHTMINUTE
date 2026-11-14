# Preregistration: software fault injection

Question: do the actual exported pipeline, verifier, API and audit/ground interfaces
reject or safely handle each failure mode listed in the user's hazard request?

Method: enumerate all requested faults before executing cases. Use synthetic facts,
temporary isolated mission storage and local API test clients. Inject into real
interfaces with explicit fixtures or monkeypatches only at external data/provider
boundaries. Do not patch production code or weaken an assertion after observing
a failure. Keep mocked upstream responses distinguishable from real interfaces.

Faults: invented number, lowered urgency, nonexistent citation, free-text prompt
injection, LLM outage, engine/API outage, missing/NaN/stuck/impossible sensor value,
illness-contaminated baseline, insufficient baseline, duplicate/out-of-order ground
messages, delay/loss, behavioral-consent leak, audit tamper, wrong mission delay,
stale weather and unlabelled live/static substitution. Additional attack strings
may extend coverage but cannot replace failed registered cases.

Metrics: each fault has an explicit safe-behavior assertion, pass/fail/error/untested,
actual command, traceback or observed sanitized output, source revision and time.
Expected safety failures remain failures in the raw evidence. The harness may
exit nonzero when safety gaps are found; this does not authorize engine repairs.
Baseline existing tests must still pass. No network LLM calls or real personal
data. No secrets or connection strings in artifacts.

Pass: safe assertion satisfied through a real tested interface. Fail: unsafe
behavior or missing guard. Untested: interface cannot be exercised within scope.
Severity is qualitative, not a numeric risk score. A mitigation without a real
test stays MITIGATED-UNTESTED; a failing or absent mitigation stays OPEN.
