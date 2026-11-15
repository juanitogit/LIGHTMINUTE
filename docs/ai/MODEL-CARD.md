# Model card — LIGHTMINUTE student Decision-Card model (`qwen05`)

**Status: experimental research artefact. Not integrated into the product. Not a
medical device. Not for diagnosis, treatment or crew use.** No file in
`project/` imports it; the only wiring is an unmerged reference module,
`slm/integration/local_slm.py`.

Full evidence record: `project/docs/ai/SLM-TRAINING-RECORD.md`.

## Model details

| Item | Value |
|---|---|
| Base model | `Qwen/Qwen2.5-0.5B-Instruct` |
| Base licence | Apache-2.0 (`slm/docs/SOURCES.md:35`) |
| Modification | LoRA adapter on the frozen base; not trained from scratch |
| LoRA | rank 16, alpha 32, dropout 0.05, applied to the 4-bit base |
| Adapter path | `slm/out/adapters/qwen05` (48.8 MB including tokenizer; `adapter_model.safetensors` 33.6 MB) |
| Teacher (target producer) | Pool of free-tier models called through the local OpenCode CLI, rotated on quota (`slm/data/teacher.py:188-189,215-234`). Seven appear in the training cards; the largest is `openrouter/thinkingmachines/inkling-2-small:free` (672 of 2,141 card rows), then `glm-5.3-flash-free` 537 and `deepseek-v4.1-flash-free` 503. Counts in `DATASET-CARD.md`. |
| Training rows | 2,125 |
| Steps / epochs | 133 / 1 |
| Learning rate | 1e-4 |
| Sequence length | 1,152 tokens |
| Seed | 42 |
| Hardware | NVIDIA GeForce RTX 3050 6GB Laptop GPU |
| Duration / peak VRAM | 64.39 min / 2.05 GB |
| Finished | 2026-11-15T15:12:18Z |
| Shipped weights | final step 133 (no best-checkpoint selection) |

Evidence for the training rows above: `slm/out/adapters/qwen05/run.json` keys
`model`, `lora`, `4bit`, `steps`, `epochs_done`, `args`, `seed`, `gpu`,
`elapsed_min`, `max_vram_gb`, `finished_at`; `slm/data/sft/train.stats.json`.

## Intended use

Research probe: can a 0.5B model rewrite engine facts into a Decision Card that
passes the product's deterministic verifier, offline, on a laptop GPU? The engine
remains the authority for numbers, urgency and facts.

**Out of scope:** any clinical or operational decision, any real crew, any
diagnosis or dosing, any use as the product's default card source.

## Evaluation

Source: `slm/results.json` (also `slm/out/eval/`). Evaluated on cases with a
stored teacher card; one correction retry; `max_new_tokens=320`. The "T" row is
the stored card itself, so on the test split it mixes five teacher models rather
than measuring one model.

| System | Split | n | Strict, first attempt | After one retry |
|---|---|---:|---:|---:|
| T (teacher) | test | 300 | 92.0% | 100% |
| S1 (LoRA) | test | 224 | 0.0% | 57.1% |
| S1 (LoRA) | OOD | 289 | 0.0% | 49.1% |
| S0 (base, no LoRA) | test | 24 | 0.0% | 0.0% |

- 95% bootstrap intervals (10,000 resamples, seed 42) are in `slm/results.json`;
  S1/test after retry is 57.1% [50.9, 63.4], S1/OOD 49.1% [43.2, 54.7].
- S0 `n=24` is a prefix stopped at 11:31 to protect the delivery deadline; it
  must not be extrapolated.
- Contract axes on emitted cards: level preserved 100% (S1, both splits),
  citation validity 100%, numeric fidelity 86.2% (OOD) / 90.6% (test), clean
  diagnosis wording 99.3% / 97.8%.
- Numeric fidelity is a placeholder-completeness metric: the per-split
  `numeric_fidelity` and `placeholder_complete` means are identical in
  `slm/results.json`, because numbers are substituted deterministically
  (`slm/common.py:190-205`). A miss means the model omitted a placeholder.

## Gates (pre-set, not met)

| Gate | Status | Evidence |
|---|---|---|
| G1 volume: 4,000 training rows | **MISSED** — 2,125 rows | `slm/data/sft/train.stats.json`; `slm/out/LIMITATIONS.md` |
| G3 human review and quality bar | **NOT ELIGIBLE** — `slm/eval/human_review.csv` has 50 blank rows | that file |

## Limitations

1. Zero complete cards on the first attempt under the shipped 320-token cap; the
   reported pass rate depends on one retry.
2. Fails 42.9% of the 224 test cards and 50.9% of the 289 OOD cards after retry.
3. Trained and evaluated on synthetic cards from several free-tier teachers (seven
   in the training cards); no per-teacher breakdown, no human ratings, no real
   crew data, no clinical validation. The OOD split comes almost entirely from
   one teacher (`inkling-2-small:free`), so its 49.1% is not an average over the
   same mix as the test split.
4. The adapter directory exists on this machine, but the reference wrapper is not
   imported by the product; integration was never tested.
5. The vendored verifier used to filter and score data does **not** hash-match any
   committed product verifier version — see `SLM-TRAINING-RECORD.md` §7.1.
6. Teacher-output terms: OpenCode Terms effective 2026-11-08 restrict programmatic
   Output extraction and use of Output to build competing models; the operator
   recorded risk acceptance (`slm/docs/COMPLIANCE.md:14-35`). Three of the
   teachers are OpenRouter free ids whose provider terms are separate and were
   **not** reviewed in the same file (`slm/docs/COMPLIANCE.md:70-77`), only
   accepted under the same non-commercial research constraint. The recorded
   consequence is that teacher outputs are not published as a standalone dataset
   and the adapter is not uploaded without a fresh permission check.

## Licence and redistribution

The base model is Apache-2.0. The adapter is a derivative of that base and no
separate licence is declared for it. Because of the teacher-terms issue above,
it is **not** offered for redistribution. Training code in `slm/` is part of this
repository.

## Decision

Not integrated. Did not meet its gates. Reported as a bounded negative/partial
feasibility result, not as a shipped feature or a teacher replacement.
