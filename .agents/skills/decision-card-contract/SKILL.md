---
name: decision-card-contract
description: The strict contract for LIGHTMINUTE "Decision Cards" - the JSON the LLM produces from engine output, the prompt rules, the verifier, and the deterministic template fallback. Use whenever you edit prompts, schemas, alert wording, the LLM client, the verifier, or UI that renders alerts/recommendations. Trigger on "alert text", "recommendation", "explain this reading", "what should the astronaut do".
---
# Decision Card contract

Pipeline: `engine facts` -> (LLM explain | template) -> `verify_card()` -> UI. Code: `tether_engine/llm/`. Schema: `llm/schemas/decision_card.schema.json`. Prompt: `llm/prompts/decision_card.system.md`.

## Fields (all required)
`level` (info|watch|act|escalate — set by ENGINE, LLM may only keep or raise), `headline`, `what_changed` (numbers only from engine facts), `why_it_matters`, `confidence` (low|moderate|high, from df/n_seen), `do_now` (1–5 imperative steps, each doable on board), `monitor`, `escalate_if` (explicit triggers), `ground_message` (<= 140 chars, delay-tolerant), `citations` (KB ids only).

## Rules
1. No diagnosis ("you have X"). Say "pattern consistent with / worth checking".
2. State uncertainty explicitly; low n => low confidence wording.
3. Every number must exist in engine facts; every claim cite >= 1 KB id.
4. Action ladder: self-check -> re-measure -> crew buddy check -> use onboard protocol -> message ground -> emergency procedure. Match to level.
5. Cards must be readable in < 10 s: headline <= 12 words, steps <= 14 words.
6. When the patient is the crew medical officer, `do_now` must be executable by any crew member.
7. If the verifier rejects twice, render the template card and log the rejection (counts go on the validation page).

## Template fallback
One template per (risk family x level) in `protocols/templates.py`, filled only with engine facts. It must be good enough to demo with the LLM unplugged.

## Tests
`services/engine/tests/test_verifier.py` — add a case for every new failure mode you discover.
