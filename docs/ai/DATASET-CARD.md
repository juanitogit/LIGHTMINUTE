# Dataset card — LIGHTMINUTE synthetic Decision-Card dataset

**Status: synthetic, research-only. No personal or crew data. Not a clinical
dataset.** Used solely to train and evaluate the experimental `qwen05` adapter.
The product does not ship or consume it.

Full evidence record: `project/docs/ai/SLM-TRAINING-RECORD.md`.

## What it contains

Each row is a sanitised engine case (no numbers, no case id, no day, no scenario
name — see `slm/integration/local_slm.py:7-10`) paired with a Decision Card
produced by a remote teacher model, then filtered through a verifier. Several
teacher models contributed; see "How targets were produced" below.

| Split | Generated cases | Rows after filtering | Teacher pass rate |
|---|---:|---:|---:|
| train | 5,750 | 2,125 | 99.77% (2,129/2,134) |
| validation | 450 | 141 | 100% (141/141) |
| test | 650 | 298 | 100% (300/300) |
| OOD | 600 | 238 | 83.04% (240/289) |

Evidence: generated-case counts are line counts of
`slm/data/cases/{train,val,test,ood}.jsonl`; filtered counts and pass rates are
the `kept_after_dedupe`, `n`, `passed` and `pass_rate` keys of
`slm/data/sft/{train,val,test,ood}.stats.json`.

The counts reconcile as follows, and the gap is explained by the teacher's
wall-clock caps rather than by a sampling step. `slm/data/cases/train.jsonl`
holds 5,750 cases. Teacher generation ran in seven wall-clock-capped passes, each
resuming the cases with no card yet; the first line of every
`slm/out/teacher/train_rotate*.log` records `todo=` and `cap=` — the caps were
240, 240, 210, 140, 110, 105 and 44 minutes, and `todo` fell 5,750 → 3,705.
2,134 distinct cases received at
least one card; 3,616 were never attempted. `slm/out/teacher/cards/train.jsonl`
holds 2,141 rows for those 2,134 cases (7 retries), the stats `n` is 2,134, and
the authoritative training-row count after dedupe is **2,125**.

The evaluation splits are capped prefixes, not random draws.
`slm/out/teacher/run_test.json` records `requested: 300` against a 650-case test
pool, and the OOD passes record `todo=300` then `todo=204` against a 600-case
pool (`slm/out/teacher/ood_rotate{1,2}.log` line 1). So 350 test and 310 OOD cases
were never attempted. The reported intervals describe the attempted cases only.

## How cases were generated

`slm/data/make_cases.py` drives the project's deterministic simulator and writes
the four splits plus a leakage report (`slm/README.md:27`). The simulator is
`project/services/engine/tether_engine/simulate/scenarios.py`, which draws from a
local `random.Random` seeded with a string, so the same arguments reproduce the
same bytes (`scenarios.py:1-11`). Ground truth lives in a separate labels file
the engine never reads.

## How targets were produced (the teachers)

The targets are not from one model. A pool of free-tier models was called through
the local OpenCode CLI, rotating to the next model when one hit its quota
(`slm/data/teacher.py:188-189,215-234`; `slm/Makefile:4`). No paid DeepSeek API
key and no local model was involved.

Per-split model counts, read from the `teacher_model` field of
`slm/out/teacher/cards/*.jsonl` (card rows, not deduplicated rows):

| Split | Teacher models (card rows) |
|---|---|
| train (2,141 rows) | `inkling-2-small:free` 672; `glm-5.3-flash-free` 537; `deepseek-v4.1-flash-free` 503; `mimo-v2.6-flash-free` 248; `minimax-m3.1-flash-free` 173; `ernie-5.5-flash-preview:free` 5; `particle-1:free` 3 |
| test (300 rows) | `deepseek-v4.1-flash-free` 91; `glm-5.3-flash-free` 65; `inkling-2-small:free` 65; `mimo-v2.6-flash-free` 60; `minimax-m3.1-flash-free` 19 |
| OOD (290 rows) | `inkling-2-small:free` 240; `ernie-5.5-flash-preview:free` 3; `particle-1:free` 2; no teacher model recorded 45 |
| validation (172 rows) | `deepseek-v4.1-flash-free` 106; no teacher model recorded 66 |

So the largest single contributor to the training targets is
`openrouter/thinkingmachines/inkling-2-small:free` (672 of 2,141 card rows), not
the DeepSeek model named in `slm/data/teacher.py:35` as the default. The default
is what the code uses for a single-model call and for the pilot; the run actually
rotated. `slm/docs/COMPLIANCE.md:70-73` records that three OpenRouter free ids
were added to the rotation.

The teacher prompt is built from the product's own
`tether_engine.llm.kb.system_prefix()` (`slm/common.py:68-75`), so every teacher
saw the same cited knowledge base as the product. Raw stdout/stderr was kept for
audit during generation.

## Filtering

Candidate cards had to pass the vendored product verifier plus an SLM-specific
contract (placeholders resolved, length caps, no diagnostic wording) —
`slm/data/filter.py`, `slm/common.py:217-268`.

Verifier provenance is **not** clean: `slm/vendor/verifier.py` has SHA-256
`69c2922a…` and `slm/VENDOR.json` says it was copied from a local working tree at
commit `09bf08f8`, but the file at that commit hashes to `d67cd876…`. It matches
none of the four committed product versions (see
`SLM-TRAINING-RECORD.md` §7.1). The dataset is therefore gated by a verifier that
is the same family of checks but not bit-identical to any product commit.

## Leakage and splits

`slm/data/cases/leakage_report.json` key `passed` is `true`:

- `seed_overlap` and `id_overlap` are 0 for every split pair;
- the OOD combination `["sep_sleep_loss","strong"]` appears only in OOD
  (`ood_combo_in_train`, `ood_combo_in_test`, `ood_combo_in_val` are empty).

## Personal data and privacy

No real personal health data. Cases are simulator output; labels are synthetic.
The product's own rule is synthetic/proxy/real-public only (`project/AGENTS.md`
invariant 2). The teacher receives synthetic case text and the public knowledge
base, not crew data.

## Licensing and terms

- Cases and labels: generated by this project's code; no third-party dataset.
- Teacher outputs: OpenCode Terms effective 2026-11-08 restrict programmatic
  Output extraction and use of Output to build competing models
  (`slm/docs/COMPLIANCE.md:14-35`). The operator recorded explicit risk acceptance.
  Three teachers are OpenRouter free ids; `slm/docs/COMPLIANCE.md:70-77` says
  their terms are separate and were not quoted, and applies the same
  non-commercial research constraint. Consequence: teacher outputs are **not**
  published as a standalone dataset and the adapter is not uploaded without a
  fresh permission check.

## Known gaps

1. 2,125 training rows against a 4,000-row gate — the dataset is undersized by
   design constraints (free-tier quota, time).
2. No human review: `slm/eval/human_review.csv` has 50 sampled rows with empty
   reviewer/verdict/severity/notes fields.
3. OOD teacher coverage is lower (45 of 50 no-card rows had
   `teacher_model=None`, per `slm/out/LIMITATIONS.md`).
4. Several teacher models (seven appear in the training cards) but one prompt
   family and one simulator; no per-teacher breakdown of student accuracy, so
   the effect of teacher mix is unmeasured. The OOD split is almost entirely one
   teacher (`inkling-2-small:free`, 240 of 290 card rows), so its score is not
   comparable to the five-teacher test split.
5. No licence review of teacher outputs beyond the operator acceptance quoted
   above; OpenRouter terms are unquoted and the OpenCode access date is unknown —
   see `OPEN-QUESTIONS.md` Q3 and Q14.

## Maintenance

Frozen at the 2026-11-15 run. Regenerating requires the OpenCode CLI, network and
quota; filtering and training are offline. Commands are in
`SLM-TRAINING-RECORD.md` §8 and `slm/Makefile`.
