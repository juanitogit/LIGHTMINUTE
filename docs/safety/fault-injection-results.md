# Real-interface fault injection

Run UTC: 2026-11-14T20:37:12.601634+00:00. Revision: `2fea48ff4d349de96980a39301e269818d731245`.
Command: `.venv/Scripts/python.exe tests/fault_injection/run.py`. Raw evidence: `docs/safety/fault-injection-results.json`.
Result: **18/27 assertions passed**. Failures are safety findings, not engine fixes.

| Fault | Test | Result | Observation |
|---|---|---|---|
| FI-01 Invented number in facts | `invented_fact` | PASS | {"verifier_errors": ["number 999 not in engine facts"]} |
| FI-02 Invented number outside facts field | `invented_headline` | FAIL | "Verifier accepted malicious headline: Your heart rate is 999 bpm" |
| FI-03 LLM lowers urgency | `lower_urgency` | PASS | {"verifier_errors": ["LLM lowered urgency below engine level"]} |
| FI-04 Nonexistent citation | `fake_citation` | PASS | {"verifier_errors": ["unknown citations: ['NASA-DOES-NOT-EXIST']"]} |
| FI-05 Prompt injection in free text | `prompt_injection` | PASS | {"source": "template", "errors": [], "scope": "adversarial provider output, not proof of prompt immunity"} |
| FI-06 LLM transport unavailable | `llm_unavailable` | PASS | {"source": "template", "errors": []} |
| FI-07 LLM client initialization unavailable | `llm_initialization_failure` | ERROR | "RuntimeError: injected initialization failure" |
| FI-08 NaN sensor reading | `nan_sensor` | PASS | {"dropped": 2, "serialized_finite": true} |
| FI-09 Impossible physiological value | `impossible_sensor` | PASS | {"dropped": 2} |
| FI-10 Dropout must not quote stale HR as current | `missing_hr_freshness` | FAIL | "Missing HR displayed as current: HR 59.9 vs your usual band 55.9 to 66.1; combined score -0.6." |
| FI-11 Stuck-value sensor detection | `stuck_sensor` | FAIL | "No stuck-value flag surfaced by the real pipeline" |
| FI-12 Bound single outlier influence on baseline | `robust_outlier` | PASS | {"robust_baseline": 70.10568798353297, "ordinary_baseline": 76.75325488488119} |
| FI-13 Prolonged illness must not become an unflagged normal | `prolonged_baseline_contamination` | FAIL | "Sustained injected shift normalized: initial_p=6.735853962835537e-12, final_p=0.6266086272965906, baseline=78.25826070421195" |
| FI-14 Insufficient days retain learning phase | `learning_phase` | PASS | {"learning_entries": 24} |
| FI-15 Duplicate delivery retry must be idempotent | `duplicate_message` | FAIL | "Retry created a second message instead of deduplicating" |
| FI-16 Out-of-order arrivals retain separate records | `reordered_messages` | PASS | {"visible_before": 1, "visible_after": 2, "scope": "no command-order or exactly-once guarantee"} |
| FI-17 Communication delay hides undelivered messages | `communication_delay` | PASS | {"one_way_s": 1320.0} |
| FI-18 Storage/transport loss is not acknowledged as delivered | `communication_failure` | PASS | {"status_code": 500, "scope": "failed server write; client retry/exactly-once not protected"} |
| FI-19 Structured behavioral consent filter | `structured_consent` | PASS | {"withheld_structured_text": true} |
| FI-20 Behavioral text hidden inside allowed fields | `nested_consent_leak` | FAIL | "Withheld behavioral sentinel leaked through text/vitals" |
| FI-21 Audit entry tampering | `audit_tampering` | PASS | {"detected_entry": 0, "scope": "tamper evidence only; no authenticated signature"} |
| FI-22 Unknown mission profile rejected | `wrong_profile` | PASS | {"status_code": 422} |
| FI-23 Mission context matches scenario | `mismatched_mission_context` | FAIL | "Moon scenario received context {'phase': 'mars_transit', 'delay_minutes': 11, 'synthetic': True, 'not_a_medical_device': True}" |
| FI-24 Engine outage is explicitly labelled static | `engine_outage` | PASS | {"source": "scenario-file", "synthetic": true} |
| FI-25 Static fallback must not rename another scenario | `wrong_static_fallback` | FAIL | "Requested co2_creep; effective scenario=cmo_fever; advertised name=co2_creep; source=demo-data" |
| FI-26 Stale space weather stays visibly archived | `stale_weather_archived` | PASS | {"injected_retrieval": "2000-01-01T00:00:00Z", "label": "Archived snapshot Â· not live", "limit": "No automatic maximum-age rejection; label only"} |
| FI-27 API outage shows local synthetic mode | `static_mode_label` | PASS | {"api_status": 503, "label": "Local simulation", "synthetic_label": true} |

## Limits
These are bounded synthetic fault injections, not an exhaustive safety certification.
Provider outputs are mocked; prompt-injection cases do not establish immunity to all model behavior.
Duplicate retry, long-term adaptation, free text consent and physical freshness need explicit controls.
An unkeyed audit chain detects changed entries only while its trusted head is preserved; it is not a signature.
Clinical correctness, sensor hardware integrity, compromised hosts, malicious administrators and real communications are unverified.
