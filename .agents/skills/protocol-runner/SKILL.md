---
name: protocol-runner
description: Build the timed, step-by-step Emergency/Protocol Runner (large controls, scenario suggested by sensor patterns, every step labelled source-published or demo-wording, run timed, logged to the audit chain and queued for ground). Use for any "what do I do now" flow, emergency walkthrough, checklist UI, or when a Decision Card needs an executable procedure.
---
# Protocol runner

Idea studied in rivals, reimplemented with our guarantees.
- Data: `kb/protocols/<id>.json` = `{id, title, trigger_patterns[], steps[{text, source_status: published|demo-wording, source}]}`. Steps never contain drug doses; they point to the onboard medical protocol.
- UI: one step per screen, >=64px targets, step timer, "can't do this" branch, undo. Keyboard + screen reader.
- Suggested scenario comes from engine facts (e.g. fever-like syndrome), never from LLM free text.
- Each completed step -> `AuditLog.append("protocol_step", {...})`; summary queued via `ground/delay.py` routing.
- Any crew member can run it (CMO-is-the-patient scenario): steps phrased for a non-physician.
- Ship 3 protocols for the demo: fever-like syndrome, CO2 headache cluster, post-EVA orthostatic symptoms. Mark every unsourced step `demo-wording` visibly.
