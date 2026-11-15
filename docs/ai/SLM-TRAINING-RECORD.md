# SLM training record — LIGHTMINUTE student card model

Status: **experimental research artefact. NOT integrated into the product. NOT a
medical device and not medical advice.** Nothing in `project/` imports this
model; the only wiring is an optional, unmerged reference module
(`slm/integration/local_slm.py`).

Path convention: `slm/...` and `project/...` are relative to the umbrella folder
`C:\Users\juan8\Videos\tether-kit\tether-kit\`. Evidence pointers are file paths;
JSON artefacts are cited by path and key because they have no stable line numbers.

## 1. Purpose and intended use

The goal was to test whether a 0.5B-parameter model could turn engine facts into
a Decision Card that satisfies the **real product verifier**, offline, on a
laptop GPU. The engine remains the authority for urgency, numbers and facts; the
student only writes prose around them. It is a feasibility probe, not a feature.

## 2. Base model and license

| item | value | evidence |
|---|---|---|
| Base model | `Qwen/Qwen2.5-0.5B-Instruct` | `slm/out/adapters/qwen05/run.json` key `model`; `slm/MODEL_CARD.md:9` |
| License | Apache-2.0 | `slm/docs/SOURCES.md:35`, `slm/MODEL_CARD.md:9` |
| Access date | UNKNOWN — ask human (no download log with a date was found) | — |
| Modification | LoRA adapter, not a model trained from scratch | `slm/out/adapters/qwen05/run.json` key `lora` |

Adapter files: `adapter_model.safetensors` is 33.6 MB; the adapter directory
including tokenizer files is 48.8 MB. Evidence: file sizes under
`slm/out/adapters/qwen05/`; the same 48.8 MB figure is in `slm/MODEL_CARD.md`
("Adapter size | 48.8 MB (measured)"). Training checkpoints add ~133 MB more on
disk but are not part of the adapter.

## 3. Training data and its producer

### 3.1 Cases

Synthetic cases are produced by the project's own deterministic simulator
through `slm/data/make_cases.py` (header: "engine -> synthetic cases
(train/val/test/ood, leakage report)", `slm/README.md:27`). Counts of generated
cases, counted from the files:

| split | cases | evidence |
|---|---:|---|
| train | 5,750 | `slm/data/cases/train.jsonl` (line count) |
| val | 450 | `slm/data/cases/val.jsonl` (line count) |
| test | 650 | `slm/data/cases/test.jsonl` (line count) |
| ood | 600 | `slm/data/cases/ood.jsonl` (line count) |

Leakage: `slm/data/cases/leakage_report.json` key `passed` is `true`;
`seed_overlap` and `id_overlap` are 0 for every split pair; the OOD combination
`["sep_sleep_loss","strong"]` appears only in OOD (`ood_combo_in_train`,
`ood_combo_in_test`, `ood_combo_in_val` are empty).

### 3.2 Who produced the target cards (the "teacher")

The targets were produced by a **pool of remote free-tier models called through
the local OpenCode CLI**, not by a DeepSeek API key (the team has none). The
generator rotates to the next model when one hits its quota:

- `slm/data/teacher.py:188-189` — `self.models = [m.strip() for m in
  (getattr(args, "models", "") or args.model).split(",")]`.
- `slm/data/teacher.py:215-234` — the loop that walks `self.models` and retries
  with the next id on failure; `--models` help at `:418-419`: "comma list;
  quota on one model rotates to the next".
- `slm/Makefile:4` — the rotation list actually passed to the run.
- `slm/out/teacher/train_rotate*.log` first line — `models=` and the wall-clock
  `cap=` for each of the seven training passes.

The `teacher_model` field of the card files gives the realised mix. Train
(`slm/out/teacher/cards/train.jsonl`, 2,141 rows): `inkling-2-small:free` 672,
`glm-5.3-flash-free` 537, `deepseek-v4.1-flash-free` 503,
`mimo-v2.6-flash-free` 248, `minimax-m3.1-flash-free` 173,
`ernie-5.5-flash-preview:free` 5, `particle-1:free` 3. Test (300 rows):
`deepseek-v4.1-flash-free` 91, `glm-5.3-flash-free` 65,
`inkling-2-small:free` 65, `mimo-v2.6-flash-free` 60,
`minimax-m3.1-flash-free` 19. OOD (290 rows): `inkling-2-small:free` 240,
`ernie-5.5-flash-preview:free` 3, `particle-1:free` 2, no model recorded 45.

The default model constant does **not** describe the run:

- `slm/data/teacher.py:35` — `MODEL = "opencode/deepseek-v4.1-flash-free"`, used
  when `--models` is not passed and by the single-model pilot
  (`slm/out/teacher/pilot_v1/run_test.json` key `model`; `bench.json[0].model`).
- `slm/docs/COMPLIANCE.md:70-73` records that three OpenRouter free ids were
  added to the rotation after the OpenCode-only phase.

So the teacher is a rotating free-tier pool dominated on the training split by
`openrouter/thinkingmachines/inkling-2-small:free`, and on OOD by that model
alone. It is **not** a local model, **not** a paid API, and **not** a single
DeepSeek-family model. There is no per-teacher breakdown of student accuracy, so
the mix is a confound, not a controlled variable (see `MODEL-CARD.md`).

### 3.3 Provider terms on output use (quoted)

`slm/docs/COMPLIANCE.md:14` records the terms version as **effective
2026-11-08**, URL `https://opencode.ai/legal/terms-of-service`. The decisive
clauses are quoted verbatim in that file (`slm/docs/COMPLIANCE.md:18-24`):

> "(e) automatically or programmatically extracts data or Output;"
>
> "(g) uses Output to develop artificial intelligence models that compete with
> the Services or any Third Party Models."

The same file states there is "no output-use grant equivalent to DeepSeek
§4.2(3) in the OpenCode Terms" (`slm/docs/COMPLIANCE.md:28-30`), and records the
operator's explicit risk acceptance (`slm/docs/COMPLIANCE.md:35`):

> "OpenCode igualmente, asumo el riesgo."

Consequences recorded there: teacher outputs are not published as a standalone
dataset, the adapter is not uploaded without a fresh permission check, and the
decision is documented in `slm/AI-USE.md`. Access date of the terms page is not
recorded → UNKNOWN - ask human.

Scope limit: those OpenCode clauses cover the OpenCode-served models. Three
teachers are OpenRouter free ids; `slm/docs/COMPLIANCE.md:70-77` states their
provider terms are "separate from OpenCode's" and applies the same
synthetic, non-commercial, research-only constraint, but does not quote them.
Whether that is sufficient is a human legal decision, not something these files
establish (`OPEN-QUESTIONS.md` Q14).

### 3.4 Filtering

Every candidate card had to pass the **vendored product verifier** plus an
SLM-specific contract (placeholders, length caps, no diagnostic wording).
`slm/VENDOR.json` records the copy, but its hash does **not** match any committed
version of the product verifier — see §7.1.

| split | candidates | passed gate | pass rate | rows kept | evidence |
|---|---:|---:|---:|---:|---|
| train | 2,134 | 2,129 | 99.77% | 2,125 | `slm/data/sft/train.stats.json` |
| val | 141 | 141 | 100% | 141 | `slm/data/sft/val.stats.json` |
| test | 300 | 300 | 100% | 298 | `slm/data/sft/test.stats.json` |
| ood | 289 | 240 | 83.04% | 238 | `slm/data/sft/ood.stats.json` |

OOD teacher coverage is lower because the free tier returned nothing for some
calls (45 of 50 no-card rows had `teacher_model=None`, per
`slm/out/LIMITATIONS.md`).

### 3.5 Gap to the pre-set gate

- **G1 (volume): NOT PASSED.** 2,125 train rows against a 4,000-row bar.
  Evidence: `slm/data/sft/train.stats.json` key `kept_after_dedupe`;
  `slm/out/LIMITATIONS.md` first bullet; `slm/EVAL.md` "## Gates".
- **G3 (human review + quality bars): NOT PASSED / NOT ELIGIBLE.**
  `slm/eval/human_review.csv` has 50 sampled rows with empty `reviewer`,
  `verdict`, `severity` and `notes` columns. No human review was done.

## 4. Training runs

### 4.1 Pilot (separate, labelled)

| item | value | evidence |
|---|---|---|
| Rows | 527 train / 141 val | `slm/out/adapters/smoke_ram4/run.json` |
| Steps | 10 | same file |
| Duration | 5.19 min | same file |
| Finished | 2026-11-15T01:21:55Z | same file |

Smaller smokes also exist (`smoke05`, `smoke05b`, `smoke05c`: 3–4 steps,
32–96 rows) and are not results.

### 4.2 Final adapter

| item | value | evidence |
|---|---|---|
| Steps | 133 (1 epoch) | `slm/out/adapters/qwen05/run.json` keys `steps`, `epochs_done` |
| LoRA | r=16, alpha=32, dropout=0.05 | key `lora` |
| Quantisation | 4-bit | key `4bit` |
| LR | 1e-4 | key `args.lr` |
| Batch | 4 × grad-accum 4 | key `args.batch`, `args.grad_accum` |
| Max sequence | 1,152 tokens | key `args.max_seq_len` |
| Seed | 42 | key `args.seed` |
| Hardware | NVIDIA GeForce RTX 3050 6GB Laptop GPU | key `gpu` |
| Duration | 64.39 min | key `elapsed_min` |
| Peak VRAM | 2.05 GB | key `max_vram_gb` |
| Train loss | 1.5302 | key `train_loss` |
| Best eval loss | 1.3774 at step 100 | `log_history` |
| Finished | 2026-11-15T15:12:18Z | key `finished_at` |

Shipped weights are the **final step (133)**, not the best-eval checkpoint; no
post-hoc selection was applied (`slm/out/LIMITATIONS.md`, bullet "The shipped
adapter is the final step").

## 5. Evaluation

Protocol: `slm/eval/evaluate.py`, evaluation set = every case with a stored
teacher card (`--require-cards`); one correction retry; `max_new_tokens=320`,
matching the wrapper's `MAX_NEW_TOKENS` (`slm/integration/local_slm.py:22`).
Figures below are copied from `slm/results.json` (also `slm/out/eval/`).
The "T" row scores the stored teacher cards, which on the test split come from
five different teacher models (§3.2), so T is a mixed reference, not one model's
ceiling.

| system | split | n | strict first | after 1 retry | adversarial n / pass |
|---|---|---:|---:|---:|---:|
| T (teacher) | test | 300 | 92.0% | 100% | 67 / 100% |
| S1 (LoRA) | test | 224 | 0.0% | 57.1% | 50 / 64.0% |
| S1 (LoRA) | ood | 289 | 0.0% | 49.1% | 54 / 70.4% |
| S0 (base, no LoRA) | test | 24 | 0.0% | 0.0% | 4 / 0.0% |

Point estimates with 95% bootstrap intervals (10,000 resamples, seed 42) are in
`slm/results.json`; for example S1/test after-retry is 57.1% [50.9, 63.4] and
S1/ood is 49.1% [43.2, 54.7]. S0's n=24 is a prefix stopped to meet the delivery
deadline and must not be extrapolated.

Contract axes on emitted cards (`slm/results.json`): level preserved 100% for
S1 in both splits, citation validity 100%, numeric fidelity 86.2% (ood) / 90.6%
(test), diagnosis wording clean 99.3% / 97.8%.

**Figures in the brief, checked against the files.** "Failure 43% test and 51%
OOD after retry" is 100 − 57.1 and 100 − 49.1, so it matches. "numbers 86–91%"
matches (86.2% OOD, 90.6% test). "level 100%, citations 100%" matches. "zero
complete cards on first attempt" matches (`strict_first` is 0.0% in every S1
split with n>0).

"base 0/24 vs LoRA 57.1%" needs a denominator caveat: 0/24 is S0 on 24 test
cases, while 57.1% is S1 on 224 test cases. `slm/out/LIMITATIONS.md` states that
S0's 24 cases are a prefix of S1's 224 and that "the same cases pass 57% with the
adapter", but `slm/results.json` contains no per-24 breakdown, so that shared-set
figure is reported by the team and cannot be recomputed from the result file.
The two headline numbers are individually correct; they are not one paired
comparison.

## 6. Numeric fidelity is a placeholder metric, not a substitution bug

Placeholders (`{{hr_now}}`, `{{hr_lo}}`, `{{hr_hi}}`, `{{z_dir}}`) are replaced
deterministically by `slm/common.py:190-205` (`render_card`), using the same
number format as the metric in `slm/eval/report.py`. Substitution cannot
mis-format a number.

The 86–91% figure therefore measures **whether the card carried all four
placeholders**, not whether the renderer worked: in `slm/results.json` the
per-split `numeric_fidelity` and `placeholder_complete` means are identical
(86.2% = 86.2% on ood, 90.6% = 90.6% on test). When the student omits a
placeholder, the rendered text cannot contain that number, and the metric
records a miss. This is a model output-completeness issue, not a numeric
fidelity defect. Investigated from the files; nothing was changed.

## 7. Provenance discrepancies (reported, not fixed)

### 7.1 Verifier hash chain

| artefact | sha256 | source |
|---|---|---|
| vendored gate used for filtering/eval | `69c2922a759e96f19de17e5e78531262bb5d16a85599727f10d30c7505d033aa` | `slm/vendor/verifier.py`; `slm/VENDOR.json` key `sha256` |
| file at the commit named in `VENDOR.json` (`09bf08f8`) | `d67cd8768876dbe800326bfe69965f664a6c5d1c3139a9c5b75d9e88ddba38ae` | `git show 09bf08f8:services/engine/tether_engine/llm/verifier.py` |
| current product HEAD (`4cce898`, branch `ai-docs`) | `9d87ea0a79f8bd7208787acc2055d4c7d8c77c83d4c2f3dfca09969626459f63` | `project/services/engine/tether_engine/llm/verifier.py` |
| other committed versions | `78441587…` (c419495), `d67cd876…` (e0c1fb5), `9d87ea0a…` (05533ea) | `git log -- services/engine/tether_engine/llm/verifier.py` |

`VENDOR.json` describes the copy as taken from "tether-kit (local working tree)",
so it is consistent with a dirty working tree rather than a commit. The vendored
hash matches **none** of the four committed versions. The SLM numbers are
therefore gated by a verifier that is not bit-identical to any product commit:
it is the same family of checks, but provenance is not established by hash. This
is a documentation finding; the file was not modified.

### 7.2 Adapter path expected by the wrapper

`slm/integration/local_slm.py:20` sets `ADAPTER = ROOT / "out" / "adapters" /
"qwen05"` with `ROOT = parents[1]`, i.e. `slm/out/adapters/qwen05`. **That
directory exists on this machine** (48.8 MB, `adapter_model.safetensors` 33.6 MB).
The brief expected the wrapper to point at a non-existent path; no file supports
that, so it is recorded as UNKNOWN in `OPEN-QUESTIONS.md` rather than asserted.
The wrapper is not imported by `project/`; a product-side integration would need
its own path and a `LLM_PROVIDER=local-slm` branch.

## 8. Reproducibility

Environment (measured): Python 3.12.10, torch 2.5.1+cu121, transformers 4.49.0,
peft 0.14.0, datasets 3.2.0; pinned in `slm/requirements.txt`. GPU: RTX 3050
Laptop 6 GB. Seed 42 throughout.

```powershell
cd slm
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
make data        # data/make_cases.py -> cases + leakage report
make teacher     # data/teacher.py through the OpenCode CLI (network + quota)
make filter      # vendored gate -> data/sft/*.jsonl + *.stats.json
make train       # train/train_lora.py -> out/adapters/qwen05
make eval        # eval/evaluate.py --require-cards --max-new-tokens 320
make report      # eval/report.py -> results.json, EVAL.md
```

Teacher generation needs the OpenCode CLI and network; evaluation and training do
not. `slm/Makefile` is the authoritative command list.

## 9. Decision

**Not integrated, and did not meet the pre-set gates.** The adapter learns the
contract (0/24 base vs 57.1% test with LoRA) but fails 43% of test cards and 51%
of OOD cards even after a retry, and produces **zero** complete cards on the
first attempt under the shipped 320-token cap. G1 (volume) and G3 (human review)
are not passed. The honest claim is a bounded feasibility result on a laptop
GPU, not a teacher replacement.
