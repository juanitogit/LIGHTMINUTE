---
name: three-lens-verdict
description: Implement and present the Three-Lens verdict (Earth rule, Space-adapted rule, Personal baseline) and the named disagreement patterns (hidden_in_range, expected_for_you, space_adapted_normal, concordant_alert, learning_baseline). Use when building the Why screen, any indicator detail view, threshold KB entries, or explaining why a reading is or is not alarming.
---
# Three-lens verdict

Code: `tether_engine/lenses.py`, thresholds `kb/thresholds.json` (loader rejects unlabelled/unsourced rules). Tests: `tests/test_lenses_thresholds.py`. Visual reference: `apps/crew-tablet/prototype/three-lens.html`.

## Rules
1. Lens 1 Earth: only from a rule with status `earth-standard`, `verified` (needs http source) or `demo-parameter`.
2. Lens 2 Space-adapted: `null` until you have a real source. Show "No verified rule yet", never invent one.
3. Lens 3 Personal: needs `n_seen >= 7` else `learning`. Show 95% credible band + z + n.
4. The pattern name is the headline when lenses disagree; the UI explains it in one sentence.
5. Patterns: `hidden_in_range` (normal for population, unusual for you) · `expected_for_you` (your normal is outside Earth range) · `space_adapted_normal` · `concordant_alert` · `concordant_normal` · `learning_baseline` · `mixed`.
6. Every indicator row carries `hrp_risk` + `hazard`; load fails otherwise.
