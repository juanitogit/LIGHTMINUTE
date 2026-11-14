# Credibility handoff · open product findings

For the product owners. All fixtures use synthetic inputs. Reproduce from the project root with `.venv/Scripts/python.exe tests/fault_injection/run.py`. See the [observations and tracebacks](../docs/safety/fault-injection-results.json) and [hazard analysis](../docs/safety/hazard-analysis.md). Please retain the failing cases as acceptance tests.

| Case | Owner area | Requested change and acceptance check |
|---|---|---|
| FI-20 | Mission API / privacy | Define what can be sent when behavioral consent is withheld, including free text and nested notes. The ground response must exclude the withheld sentinel. Document any separate explicit consent for narrative content. |
| FI-02 | Card verifier | Apply fact checks to each displayed measurement. The unsupported headline in the fixture must be rejected. |
| FI-10 | Pipeline / template | Carry sample freshness into card rendering. With missing current HR, suppress the reading or identify its age. |
| FI-11 | Sensor quality | Specify when unchanged values indicate a stuck device for each channel. Expose the resulting QC state for the frozen-channel fixture. |
| FI-13 | Baseline governance | Define when continued learning during an unresolved change is appropriate. Replaying the sustained shift should preserve an unresolved-change signal or require an explicit rebaseline decision. |
| FI-07 | Card service | Cover provider construction with the same fallback contract as a request timeout. The injected initialization error should yield a local card. |
| FI-15 | Mission API | Deduplicate retried submissions under the same sender/key. Identical retries must refer to the same stored message. |
| FI-23 | Mission context | Build the case payload from the actual scenario profile. The lunar fixture must carry lunar timing and phase. |
| FI-25 | Scenario API | Preserve the actual fallback identity or report the requested case unavailable. An unrelated scenario must never take the requested name. |

For review before submission: avoid claims of clinical validation, guaranteed consent across all text fields, complete hallucination prevention, and guaranteed operation across all provider outages. Product fixes require a separate change and a fresh evidence run.
