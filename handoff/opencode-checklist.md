# Handoff — opencode verifier hardening

Date: 2026-11-14
Ownership: `services/engine/tether_engine/llm/verifier.py`, `redteam.py`, `services/engine/tests/test_verifier.py`

## Changes
- `verifier.py`: full DecisionCard schema validation (types, enums, maxLength/minItems/maxItems) implemented without adding a JSON Schema dependency.
- Total validation for arbitrary JSON: malformed/unhashable citations (e.g. `[{}]`) and other bad inputs return validation errors instead of raising.
- Diagnosis, dose, and grounded-number checks now scan all visible text fields (`headline`, `what_changed`, `why_it_matters`, `do_now`, `monitor`, `escalate_if`, `ground_message`); `citations` are excluded from the numeric scan.
- Numeric policy allows only grounded engine facts plus numbers extracted from whitelisted deterministic action strings taken from `protocols/templates.py`; invented measurements remain rejected.
- Conservative urgency preserved (`level` cannot drop below `engine_facts.level`); negated wording such as "not a diagnosis" remains allowed.
- `redteam.py`: adversarial suite expanded from 30 to 36 cases (headline/ground-message/monitor numbers, diagnosis in `do_now`/`escalate_if`, unhashable citations).
- `test_verifier.py`: count assertion updated to 36; added tests for all-visible-text and malformed-input behavior; `good()` fixture adjusted to contain no invented numbers.

## Review round 2 changes
- Numeric regex now captures optional sign/exponent and uses word boundaries, so sign inversion (`-3.5` vs allowed `+3.5`) and scientific notation are rejected, while embedded identifier digits (`CO2`, `O2`) are not counted as numbers.
- Urgency is now exact: both lowered and raised levels are rejected.
- Prompt received an additive rule requiring `level` to equal `engine_facts.level` exactly.
- Red-team expanded to 37 cases (added raised-urgency case).
- Tests expanded; no assertions weakened.

## Review round 3 changes
- Closed numeric bypasses by requiring `what_changed` to equal the deterministic template verbatim and rejecting any other numeric-bearing visible string (except exact `CO2`/`O2` identifiers).
- Removed superseded regex/whitelist complexity; verifier now uses template equality plus digit detection.
- Unsupported probability/probability-of-disease claims are rejected.
- Prompt/kb output contract updated with frozen `what_changed` policy.
- Verified all exported scenario cards (cmo_fever, sep_sleep_loss, co2_creep) pass: 0 bad cards.
- Tests updated to deterministic facts text; no attack assertions weakened.

## Review round 4 changes
- Actions are deterministic: `do_now`, `monitor`, `escalate_if` and `ground_message` must equal `template_card(engine_facts)` exactly.
- LLM may vary only non-numeric `headline`/`why_it_matters`, subject to existing filters.
- Diagnosis filter extended with "you are suffering from".
- Filters documented as defense in depth, not a semantic clinical guarantee.
- Fake-good fixtures (test_llm, redteam) now derive template fields dynamically.
- Added regression cases for "Take two tablets" and "You are suffering from influenza" in actions.
- Prompt/kb output contract updated with frozen action policy.
- Verified all exported scenario cards still pass: 0 bad cards.

## Test evidence
- `python scripts/run_tests.py`: 109/109 passed.
- `python -m tether_engine.llm.redteam` (offline): 39/39 adversarial cards rejected.
- `python -m compileall` on changed files: exit 0.
- No paid LLM calls were made; no secrets read.

## Limits
- `monitor`/`escalate_if` item lengths and word budgets (headline <= 12 words, steps <= 14 words) are not enforced because they are not in `llm/schemas/decision_card.schema.json`.
- Verifier does not validate semantic quality beyond the contract (e.g. whether a step is actually executable).
- Other P0 items (case_data `_band`, pipeline fallback, mission context, df) are owned by other agents and were not touched.
- Ruff is not installed in the local venv; lint could not be run here.