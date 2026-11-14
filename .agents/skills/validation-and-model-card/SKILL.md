---
name: validation-and-model-card
description: How to validate the TETHER engine honestly and write the model card/validation page - false-alarm rate, detection delay, recall on mild vs strong effects, calibration, small-sample proxies (Inspiration4, MMASH), leakage checks, LLM-verifier rejection stats. Use whenever you claim performance, build the validation page, tune thresholds, or prepare answers to "does this actually work?". Trigger on "accuracy", "validation", "metrics", "benchmark", "model card", "false positives".
---
# Validation & model card

Validity is a judging criterion; NASA reviewers distrust perfect scores. Report weaknesses.

## Metrics (per indicator family and overall)
- **False alarms per crew-week** on healthy synthetic baselines (many seeds, e.g. 200).
- **Detection delay** (days/hours from onset to first `watch`/`act`) per scenario, mild + strong.
- **Recall** at fixed false-alarm budget; report mild-effect recall separately.
- **Calibration**: are 95% intervals ~95% on held-out healthy days? (coverage plot).
- **LLM layer**: verifier rejection rate, citation validity, numeric consistency; template-fallback rate.
- **Robustness**: missing data 0/20/40%, sensor artifacts, baseline length 3/7/14 days.

## Real-ish checks
- Run the engine unchanged on Inspiration4 public biomarkers and on PhysioNet MMASH signals. Report what recovered "textbook" physiology and what did not. Label: proxy.
- Never tune thresholds using the scenario labels that you report on (split seeds: tune seeds vs report seeds).

## Deliverables
- `ml/validation/run_all.py` -> `docs/validation.md` + figures (one command: `make validate`).
- `docs/model-card.md`: intended use, data, method, metrics, limitations, failure modes (include a mistake you found and fixed — e.g. an over-weighted variance prior made the model too lazy; tests now guard it).
- In-app **Validation page** showing the same numbers; link from the pitch.
- Use DeepSeek `max` effort only to *red-team* (adversarial inputs, prompt injection in symptom text), then convert findings into verifier tests.

## Harness
`python ml/validation/run_all.py` -> `docs/validation.md` + `ml/validation/results.json`. Equal false-alarm budget, tuning vs report seeds disjoint, homogeneous AND heterogeneous crews. Extend it (new indicators, missing data, circadian context) before adding new claims. Report where methods lose.
