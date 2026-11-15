# AI-use inventory — LIGHTMINUTE

Scope: the active tree `project/` (branch `ai-docs`, created from `main` at
`4cce8984`, 2026-11-15 11:11 -05) and the sibling training tree `slm/`.
Documentation only: no product code, test, model, scenario or number was
modified.

Path convention: `project/...` and `slm/...` are relative to the umbrella folder
`C:\Users\juan8\Videos\tether-kit\tether-kit\`. JSON artefacts are cited by path
and key because they have no stable line numbers.

This file lists six categories: (a) AI used to build the project, (b) AI inside
the product, (c) trained/adapted models, (d) AI-generated content shipped,
(e) statistical learning in the engine, (f) synthetic data generation. Claims
that could not be matched to a file are in §7, not in the tables.

## a. AI used to build the project

| What | Evidence | Detail | Limit of the evidence |
|---|---|---|---|
| OpenCode session | `project/docs/prompts/opencode-prompts.md:7-11` | Platform OpenCode; model `opencode/deepseek-v4.1-flash-free`; effort `low`; agent `build`; session id `ses_e2358819cffedKue7CRmbpsoa9` | Self-reported session registry written by the team; no vendor log |
| Freebuff session | `project/docs/prompts/freebuff-prompts.md:6-9` | Platform Freebuff; model `DeepSeek V4.1 Flash Slow`; date 2026-11-15; 2 prompts | Same |
| Antigravity session | `project/docs/prompts/prompt-antygravity.md:7-11` | Models `Gemini 3.8 Flash (Medium)` and `Claude Sonnet 4.6 (Thinking)`; 26 prompts | Same |
| Stated development model | `project/AGENTS.md:22` | DeepSeek `deepseek-flash` (V4.1 Flash); temperature 1.0 / top_p 0.95 for agentic coding runs | Configuration text, not a usage log |
| Public disclosure text | `project/README.md:326-331` | "Built with **DeepSeek V4.1 Flash** and coding agents" | Prose claim |
| Attribution list | `project/ATTRIBUTIONS.md:57-59` | DeepSeek V4.1 Flash as "optional explanation layer and development assistance"; coding agents "(DeepSeek Harness / Claude Code-compatible)" | Prose claim |
| Agent instruction surface | `project/AGENTS.md`, `project/.agents/skills/*/SKILL.md` (16 skill directories, counted) | Rules, contracts and workflows the assistants were given | Shows instruction, not which assistant executed it |
| Commit trailers | `git log -200 --format='%H%x09%B'` run in `project/` | 27 commits contain `Co-Authored-By: Codebuff <noreply@codebuff.com>` | Trailer only; no record of which model Codebuff used |
| Commit authors | `git log -200 --format='%h|%an|%s'` | 135 commits in the last 200-commit window; human author names only, plus the Codebuff trailer above | Authorship does not prove or disprove tool use |

Not found as build tools in the repository: Codex, Cursor, GitHub Copilot,
GPT-5. Their absence from the files is **not** evidence that they were unused;
the team's own registry only names the three sessions above. Ask the human if a
tool is missing from this table (see `OPEN-QUESTIONS.md`).

## b. AI used inside the product

| Element | Evidence | Detail |
|---|---|---|
| Decision-card layer | `project/services/engine/tether_engine/llm/card_service.py:1-8` | "the engine decides, DeepSeek explains, the verifier gates"; provider `none` means template only, zero network calls |
| Provider client | `project/services/engine/tether_engine/llm/deepseek_client.py:1-4,18` | OpenAI-compatible client; default model `deepseek-flash`; default base URL `https://api.deepseek.com`; facts recorded as checked 2026-11-13 |
| Provider selection | `project/services/engine/tether_engine/llm/card_service.py:65-78` | `LLM_PROVIDER` unset/`auto` → `deepseek` only if `DEEPSEEK_API_KEY` is non-empty, otherwise `none`; key value never logged |
| System prompt | `project/llm/prompts/decision_card.system.md` (1,248 bytes), loaded at `.../llm/kb.py:19,123-131` | Rules plus the cited knowledge base, thresholds and syndromes; one byte-stable prefix for prompt caching |
| Output contract | `project/llm/schemas/decision_card.schema.json`; `.../llm/verifier.py:18-28` | Ten required fields; verifier rejects invented citations, changed numbers, lowered level, diagnosis wording, dosing and a ground message over 140 characters |
| Retry and fallback | `.../llm/card_service.py:7,189-227`; `template_card` imported at `:15`, used at `:164` | At most two attempts: verifier reasons are fed back once, then a deterministic template card. A transport exception falls back immediately on the first attempt, without the retry |
| Call shape | `.../llm/deepseek_client.py:28-53` | JSON-object response format, thinking enabled by default, `reasoning_effort` low/high/max, `max_tokens=2000` requested by the card service (`card_service.py:195`) |
| Timeout | `.../llm/deepseek_client.py:22-26` | No explicit timeout is set; the OpenAI SDK default applies |
| Browser dictation | `project/apps/crew-tablet/src/components/VoiceNote.tsx:11-25` | Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`); UI text at `:24`: "Your browser may send microphone audio to its speech provider" |
| Provider actually executed? | `project/docs/safety/ESTADO-Y-AUDITORIA-ACTUAL.md:27`; `project/docs/ui-audit.md:97` | Code contains the configurable client, verifier and fallback; the audit records that no `DEEPSEEK_API_KEY` was present and **no real call was made**; "DeepSeek real sin ejecutar" |
| Recorded live output | none found | No transcript, log or fixture containing a real `deepseek-flash` completion was found in the repository |

Providers **implemented**: one (`deepseek`). Providers **proven executed in the
product**: none in the repository. The training tree used a different path — the
OpenCode CLI, not the product client (`slm/data/teacher.py:1-6`).

Environment variable names in `project/.env.example` (names only): `DEEPSEEK_API_KEY`,
`DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`, `LLM_PROVIDER`, `MISSION_PROFILE`.

## c. Models trained or adapted

| Item | Value | Evidence |
|---|---|---|
| Base model | `Qwen/Qwen2.5-0.5B-Instruct`, Apache-2.0 | `slm/out/adapters/qwen05/run.json` key `model`; `slm/docs/SOURCES.md:35` |
| Method | LoRA adapter, 4-bit base | `slm/out/adapters/qwen05/run.json` keys `lora`, `4bit` |
| Adapter | `slm/out/adapters/qwen05` (48.8 MB with tokenizer; weights 33.6 MB) | directory listing; `slm/MODEL_CARD.md` |
| Run | 133 steps, 1 epoch, lr 1e-4, r=16/α=32, seq 1,152, seed 42 | `slm/out/adapters/qwen05/run.json` |
| Hardware / time | RTX 3050 Laptop 6 GB; 64.39 min; peak 2.05 GB | same file, keys `gpu`, `elapsed_min`, `max_vram_gb` |
| Teacher / target producer | Rotating pool of free-tier models via the OpenCode CLI; 7 models in the training cards, largest `inkling-2-small:free` (672/2,141), `glm-5.3` 537, `deepseek-v4.1` 503 | `slm/out/teacher/cards/train.jsonl` field `teacher_model`; `slm/data/teacher.py:188-189,215-234`; `slm/docs/COMPLIANCE.md:70-73` |
| Integrated? | No | no import in `project/`; only `slm/integration/local_slm.py` (reference wiring) |

Full record: `project/docs/ai/SLM-TRAINING-RECORD.md`. Summary cards:
`project/docs/ai/MODEL-CARD.md`, `project/docs/ai/DATASET-CARD.md`.

## d. AI-generated content shipped to judges

| Asset | Path | Production method | AI label |
|---|---|---|---|
| Pitch text | `project/pitch/*.md` (5 files) | Prose only; no images, video, audio or slide deck | n/a |
| 60-second video | not in the repository | `project/pitch/video-script-60s.md:5,24` describes manual screen recording of the app; no AI-video or TTS statement | no AI claim found |
| Screenshots (11) | `project/docs/screenshots/` | Captured by the automated end-to-end run: `project/docs/demo-runbook.md:22`, `project/docs/qa/anatomy-review.md:14` | none needed; not stated as AI-generated |
| Startup motion asset | `project/apps/crew-tablet/public/assets/motion/startup.webm` | `project/apps/crew-tablet/media/hyperframes/README.md:3-5`: rendered with HyperFrames 0.9.52 at 30 fps, no audio, decorative | no AI statement, no watermark text found |
| Logo and icons | `project/apps/crew-tablet/public/assets/lightminute-official.png`, `icon-192.png`, `icon-512.png`, `logo-lightminute.svg` | `project/docs/ui-audit.md:52`: "El logo es el PNG suministrado, sin reinterpretación"; `project/docs/native-design.md:15` | none; owner-supplied |
| 3D human | `project/apps/crew-tablet/public/assets/models/human.glb` | CC0 Innerscene/MakeHuman: `project/ATTRIBUTIONS.md:70-73`; GLB `asset.copyright` says public domain | not AI |
| Organ meshes | `project/apps/crew-tablet/public/assets/organs/*.glb` | CC BY 4.0 NIH 3D / HRA: `project/docs/organ-models-licenses.md:23-30`; `project/ATTRIBUTIONS.md:81` | not AI |
| Anatomy meshes | `project/apps/crew-tablet/public/assets/anatomy/` | BodyParts3D (CC BY 4.0) and HRA HuBMAP: `project/assets/anatomy/provenance.json:2-6` | not AI |
| UI mockup PDF | `project/mockup/NASA_Health_Monitor_UIUX_Mockups.pdf` | PDF metadata producer "ReportLab PDF Library"; production method not stated in the repository | unknown |
| Master document (.docx) | `project/docs/AstroVital_Documento_Maestro_COMPLETADO_v0.2.0.docx` | Internal metadata creator/description "python-docx"; production method beyond that not stated | unknown |

Watermark/label search: the strings `AI-generated` and `generated with AI` do not
occur in the repository's text files, and no asset is described anywhere as
AI-generated. Only generator labels exist
(`apps/ground-console/data/sample-scenario.js:1` "generated by make-sample.py";
`apps/crew-tablet/media/hyperframes/startup.js:1` "Generated from ... startup.ts").
Whether any image carries a visible label was **not** verified visually; there is
no AI-labelled asset to check, but that rests on the production statements above,
not on a pixel inspection (`OPEN-QUESTIONS.md` Q13).

The one "AI" asset reference in the repository is a research link
("Download free 3D models generated with Meshy AI") in
`project/docs/prompts/prompt-antygravity.md:111`; no statement links it to a
shipped file, and the shipped brain is credited to NIH 3D.

## e. Statistical / Bayesian "learning" in the engine

These are classical statistical estimators, **not** machine-learning training and
**not** an LLM. The engine computes every number and urgency level.

| Method | Evidence | What it is |
|---|---|---|
| N-of-1 Bayesian baseline | `project/services/engine/tether_engine/bayes/nof1.py:1-13` | Normal-Inverse-Gamma conjugate update per indicator per astronaut, forgetting factor, Student-t predictive; O(1) and explainable |
| Adaptive conformal interval | `project/ml/proxy/adaptive_conformal.py`; `project/ml/proxy/CONFORMAL-RESULTS.md:1-4`; `project/ml/proxy/PREREG-conformal.md` | Separate synthetic experiment, preregistered at commit `684767c`; "separate from the mission engine" |
| Autonomy analysis | `project/docs/autonomy/RESULTS.md:1-4` | Synthetic scenario study; "no mission or clinical claim"; conservative coverage zero across the delay sweep |

## f. Synthetic data generation

| Generator | Evidence | Determinism |
|---|---|---|
| Mission scenarios | `project/services/engine/tether_engine/simulate/scenarios.py:1-11` | `generate(name, variant, seed)` uses a local `random.Random` seeded with a string; same arguments give the same bytes; ground truth lives in a separate `labels.json` the engine never reads |
| SLM cases | `slm/data/make_cases.py`; header quoted in `slm/README.md:27` | Engine-driven synthetic cases for train/val/test/OOD; leakage report at `slm/data/cases/leakage_report.json` |
| SLM target cards | `slm/data/teacher.py:1-6,188-189,215-234`; `slm/out/teacher/cards/*.jsonl` | Produced by a rotating pool of remote free-tier models through the OpenCode CLI; the teachers are AI, the cases are not |

No LLM is used inside the mission simulator. The only LLMs in the data path are
the SLM teachers, which are outside the product.

## 7. Unsupported claims register

| Claim | Status |
|---|---|
| "AI reviewed the audit report `docs/AUDITORIA-INTEGRAL-2026-11-15.md`" | Unsupported — the file does not state how it was produced |
| "Screenshots or logos were AI-generated" | Unsupported — no file states it; the logo is described as owner-supplied |
| "A live DeepSeek call ran in the product" | Unsupported — the project audit records the opposite (`docs/safety/ESTADO-Y-AUDITORIA-ACTUAL.md:27`) |
| "The product uses four LLM providers" | Unsupported — only `deepseek` is implemented (`card_service.py:65-78`) |
| "The trained SLM is used by the app" | False — no import exists in `project/` |
| "The teacher was a paid DeepSeek API" | False — the teachers were free-tier models through the OpenCode CLI (`slm/data/teacher.py:188-189`; `slm/Makefile:4`) |
| "The teacher was `deepseek-v4.1-flash-free`" | Misleading — that is the default constant, not the run; 503 of 2,141 training card rows carry it, and 672 carry `inkling-2-small:free` |
