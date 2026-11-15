# Open questions — AI-use disclosure

Format: each item is `UNKNOWN - ask human` until a person answers it. Nothing
below is asserted in the disclosure text.

| # | Question | Why it matters | What would answer it |
|---|---|---|---|
| Q1 | What is the exact local submission cutoff (date and time, and time zone)? | The brief states a 1:00 pm code freeze; the submission deadline is not recorded in any file | A human statement; a link or email from the organisers |
| Q2 | On what date was `Qwen/Qwen2.5-0.5B-Instruct` downloaded/accessed? | Model cards normally record an access date; no download log with a date was found | Hugging Face cache timestamps or a human statement |
| Q3 | On what date were the OpenCode Terms of Service (effective 2026-11-08) read and accepted? | The compliance file quotes them but records no access date | A human statement; browser history is not evidence |
| Q4 | ~~Why does `slm/data/cases/train.jsonl` contain 5,750 cases while the filtering stats cover 2,134 teacher attempts?~~ **Resolved from files:** the teacher ran in seven wall-clock-capped passes (240→44 min, `slm/out/teacher/train_rotate*.log` line 1); 2,134 distinct cases were attempted and 3,616 never were. | No longer an unknown; recorded in `DATASET-CARD.md` | closed |
| Q5 | Is the partial evaluation (S0 `n=24`; S1 test `224/300`) acceptable for the event, or must the missing cases be run before submission? | Partial denominators are reported honestly, but a judge may ask why they are partial | A human decision; time is the constraint |
| Q6 | The brief said the wrapper points at an adapter path that does not exist. The path `slm/out/adapters/qwen05` **does** exist (48.8 MB). Is there another wrapper or another path the brief meant? | Affects the reproducibility claim | The exact wrapper file or command the brief refers to |
| Q7 | Which working-tree version of `verifier.py` produced the vendored copy (`69c2922a…`)? It matches none of the four committed versions. | Provenance of the filtering gate is not established by hash | The original local file, or a human confirmation of the edit |
| Q8 | Were any other coding assistants used beyond OpenCode, Freebuff and Antigravity (e.g. Codex, Cursor, Copilot, ChatGPT)? | The inventory lists only what the registries name; absence is not proof of non-use | A human statement covering the whole build period |
| Q9 | How were `mockup/NASA_Health_Monitor_UIUX_Mockups.pdf` and `docs/AstroVital_Documento_Maestro_COMPLETADO_v0.2.0.docx` produced? | Both are shipped artefacts; their production method is not stated in the repository | A human statement or the generating source file |
| Q10 | Who will perform the human review of the 50 sampled SLM cards (`slm/eval/human_review.csv`)? | Gate G3 is not eligible without it | A named reviewer and a completed CSV |
| Q11 | Was the judge/token-budget ablation ever run? | The SLM record currently says it was not run | A result file or a human statement that it was cancelled |
| Q12 | Does the team accept that the adapter cannot be redistributed under the recorded OpenCode terms? | The record says the adapter is not uploaded; this is a decision, not a fact | A human confirmation |
| Q13 | Has a person visually checked every shipped image/video for an AI label (the event requires one on AI-generated media)? | The audit was text-only; it found no asset described as AI-generated, but did not inspect pixels | A human visual check of `docs/screenshots/`, the logo files, the startup WebM, the mockup PDF and the master DOCX |
| Q14 | Were the OpenRouter provider terms (which cover three of the teachers, including the largest training contributor) reviewed, or only accepted under the same non-commercial constraint as OpenCode's? | `slm/docs/COMPLIANCE.md:70-77` says their terms are separate but does not quote them; the disclosure cannot state they were cleared | A human statement plus the terms version/date, or a decision to exclude OpenRouter-derived rows |
| Q15 | Does the team want the per-teacher breakdown of the SLM evaluation (not currently computed)? | The test and OOD splits use different teacher mixes, so the 57.1% and 49.1% are not like-for-like | Time to rerun the evaluator grouped by `teacher_model`; otherwise it stays a stated limitation |

## Redaction note

No key, token or environment value is reproduced anywhere in `docs/ai/`. The
product reads `DEEPSEEK_API_KEY` but its value is never logged
(`project/services/engine/tether_engine/llm/card_service.py:65-67`), and the
audit that checked the environment found no key present
(`project/docs/safety/ESTADO-Y-AUDITORIA-ACTUAL.md:27`).
