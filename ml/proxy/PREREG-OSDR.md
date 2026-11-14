# Preregistration: Inspiration4 public biomarkers feasibility

Question: can publicly accessible, de-identified clinical/biomarker tables support
an unchanged per-person baseline comparison before versus after spaceflight?

Method: open the current official NASA OSDR API documentation/catalog; record actual
URLs and access dates, availability and dataset-level terms. Use NASA_API_KEY only
from the environment if an actually documented endpoint requires it; never print
the key or a URL containing it. Inspect only public metadata/tables. Ignore any
controlled-access files, access-request links or personal identifiers.

Eligibility: explicit participant IDs, documented specimen/measurement units and
visit labels separating pre-flight from in/post-flight, at least two pre-flight
measurements per participant/indicator. Do not infer visit order or units from
filenames. If eligible, train only pre-flight, predict post-flight with the unchanged
Student-t baseline, report individual directions/intervals, missingness and sample
counts. No p-values, population generalization or calibrated performance claim.
Compare directions with opened primary literature only; no unsupported concordance.

Pass/fail: feasible only if all eligibility gates and public terms are documented.
Otherwise mark NOT DONE with exact endpoint/file attempted, status/error and which
gate failed. Metadata discovery is not biomarker validation. Sparse baselines are
exploratory even when technically eligible. Never substitute synthetic data or
another cohort and label it Inspiration4. Time-box at most 90 minutes from first
official access; record attempts and stop reason.
