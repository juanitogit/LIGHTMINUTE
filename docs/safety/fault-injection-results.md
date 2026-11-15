# Real-interface fault injection

Run UTC: 2026-11-15T03:39:57.708512+00:00. Revision: `6db4f80f5ab7580ae9d7df3b18a60d289a2b996e`.
Command: `.venv/Scripts/python.exe tests/fault_injection/run.py`. Raw evidence: [JSON](fault-injection-results.json).
Result: **27/27 assertions passed**. Every injected fault produced the expected safe behavior; this is bounded synthetic evidence, not certification.

| Fault | Test | Result | Observation |
|---|---|---|---|
| FI-01 Invented number in facts | `invented_fact` | PASS | {"verifier_errors": ["number 999 not in engine facts"]} |
| FI-02 Invented number outside facts field | `invented_headline` | PASS | {"verifier_errors": ["number 999 in headline not in engine facts"]} |
| FI-03 LLM lowers urgency | `lower_urgency` | PASS | {"verifier_errors": ["LLM lowered urgency below engine level"]} |
| FI-04 Nonexistent citation | `fake_citation` | PASS | {"verifier_errors": ["unknown citations: ['NASA-DOES-NOT-EXIST']"]} |
| FI-05 Prompt injection in free text | `prompt_injection` | PASS | {"source": "template", "errors": [], "scope": "adversarial provider output, not proof of prompt immunity"} |
| FI-06 LLM transport unavailable | `llm_unavailable` | PASS | {"source": "template", "errors": []} |
| FI-07 LLM client initialization unavailable | `llm_initialization_failure` | PASS | {"source": "template"} |
| FI-08 NaN sensor reading | `nan_sensor` | PASS | {"dropped": 2, "serialized_finite": true} |
| FI-09 Impossible physiological value | `impossible_sensor` | PASS | {"dropped": 2} |
| FI-10 Dropout must not quote stale HR as current | `missing_hr_freshness` | PASS | {"what_changed": "No current HR reading; last reading 1 day ago; combined score -0.6."} |
| FI-11 Stuck-value sensor detection | `stuck_sensor` | PASS | {"stuck_flag": true} |
| FI-12 Bound single outlier influence on baseline | `robust_outlier` | PASS | {"robust_baseline": 70.10568798353297, "ordinary_baseline": 76.75325488488119} |
| FI-13 Prolonged illness must not become an unflagged normal | `prolonged_baseline_contamination` | PASS | {"initial_p": 6.7358539628355474e-12, "final_p": 1.4105058958316965e-09} |
| FI-14 Insufficient days retain learning phase | `learning_phase` | PASS | {"learning_entries": 24} |
| FI-15 Duplicate delivery retry must be idempotent | `duplicate_message` | PASS | {"same_id": true} |
| FI-16 Out-of-order arrivals retain separate records | `reordered_messages` | PASS | {"visible_before": 1, "visible_after": 2, "scope": "no command-order or exactly-once guarantee"} |
| FI-17 Communication delay hides undelivered messages | `communication_delay` | PASS | {"one_way_s": 1320.0} |
| FI-18 Storage/transport loss is not acknowledged as delivered | `communication_failure` | PASS | {"status_code": 500, "scope": "failed server write; client retry/exactly-once not protected"} |
| FI-19 Structured behavioral consent filter | `structured_consent` | PASS | {"withheld_structured_text": true} |
| FI-20 Behavioral text hidden inside allowed fields | `nested_consent_leak` | PASS | {"withheld_nested_text": true} |
| FI-21 Audit entry tampering | `audit_tampering` | PASS | {"detected_entry": 0, "scope": "tamper evidence only; no authenticated signature"} |
| FI-22 Unknown mission profile rejected | `wrong_profile` | PASS | {"status_code": 422} |
| FI-23 Mission context matches scenario | `mismatched_mission_context` | PASS | {"context": {"phase": "lunar_mission", "one_way_delay_minutes": 0.02, "synthetic": true, "not_a_medical_device": true}} |
| FI-24 Engine outage is explicitly labelled static | `engine_outage` | PASS | {"source": "scenario-file", "synthetic": true} |
| FI-25 Static fallback must not rename another scenario | `wrong_static_fallback` | PASS | {"source": null} |
| FI-26 Stale space weather stays visibly archived | `stale_weather_archived` | PASS | {"injected_retrieval": "2000-01-01T00:00:00Z", "label": "Archived snapshot · not live", "limit": "No automatic maximum-age rejection; label only"} |
| FI-27 API outage shows local synthetic mode | `static_mode_label` | PASS | {"api_status": 503, "label": "Local simulation", "synthetic_label": true} |

## Limits
These are bounded synthetic fault injections, not an exhaustive safety certification.
Provider outputs are mocked; prompt-injection cases do not establish immunity to all model behavior.
Duplicate retry, long-term adaptation, free-text consent and physical freshness have explicit controls (FI-15, FI-13, FI-20, FI-10/11); their field behavior and hardware remain unverified.
An unkeyed audit chain detects changed entries only while its trusted head is preserved; it is not a signature.
Clinical correctness, sensor hardware integrity, compromised hosts, malicious administrators and real communications are unverified.
