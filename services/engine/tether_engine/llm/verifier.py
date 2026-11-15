"""Deterministic guard between the LLM and the astronaut.

The engine owns every number and the escalation level. The LLM may only
explain. A card is rejected (and replaced by the template fallback) if it
invents a citation, changes a number, lowers urgency, diagnoses, prescribes,
grows fields outside the frozen schema or overruns the ground-message budget.

Every rejection reason is fed back to the model once before we give up.
"""
from __future__ import annotations

import re

LEVELS = ["info", "watch", "act", "escalate"]
REQUIRED = {"headline", "what_changed", "why_it_matters", "confidence",
            "do_now", "monitor", "escalate_if", "ground_message", "citations", "level"}
ALLOWED_FIELDS = REQUIRED                       # llm/schemas/decision_card.schema.json
DIAGNOSIS = re.compile(r"\byou have\b|(?<!not a )(?<!no )\bdiagnos(is|ed)\b|"
                       r"\bit is (definitely|certainly)\b|\bconfirmed infection\b", re.IGNORECASE)
# Guardrail 8: never output doses. Matches amounts with a unit and dose wording.
DOSING = re.compile(r"\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|ml|iu|tablets?|capsules?|pills?|drops?)\b"
                    r"|\bdos(?:e|es|age|ing)\b", re.IGNORECASE)
GROUND_MAX = 140


def _formats(value: float) -> set[str]:
    """Every honest way the engine number may legitimately appear in prose."""
    try:
        as_float = float(value)
    except (TypeError, ValueError):
        return {str(value)}
    out = {f"{as_float:.1f}", f"{as_float:.2f}",
           f"{as_float:.2f}".rstrip("0").rstrip("."),
           f"{as_float:.1f}".rstrip("0").rstrip("."), str(as_float)}
    if as_float.is_integer():
        out.add(str(int(as_float)))
    return out


def _text_of(value) -> str:
    if isinstance(value, (list, tuple)):
        return " ".join(_text_of(v) for v in value)
    if isinstance(value, dict):
        return " ".join(_text_of(v) for v in value.values())
    return str(value)


def verify_card(card: dict, *, engine_facts: dict, kb_ids: set[str]) -> list[str]:
    errs: list[str] = []
    if not isinstance(card, dict):
        return ["response is not a JSON object"]
    missing = REQUIRED - card.keys()
    if missing:
        return [f"missing fields: {sorted(missing)}"]
    extra = set(card.keys()) - ALLOWED_FIELDS
    if extra:
        errs.append(f"unknown fields: {sorted(extra)}")
    if card["level"] not in LEVELS:
        errs.append("bad level")
    elif LEVELS.index(card["level"]) < LEVELS.index(engine_facts["level"]):
        errs.append("LLM lowered urgency below engine level")      # never allowed
    citations = card["citations"]
    if not isinstance(citations, list) or not citations:
        errs.append("no citations")
    else:
        bad = [c for c in citations if c not in kb_ids]
        if bad:
            errs.append(f"unknown citations: {bad}")
    text = " ".join(str(card[k]) for k in ("headline", "what_changed", "why_it_matters"))
    if DIAGNOSIS.search(text):
        errs.append("diagnostic language")
    if DOSING.search(_text_of(card)):
        errs.append("medication dose language")
    # every number in what_changed must appear in the engine facts (as rounded strings)
    allowed: set[str] = set()
    numbers = engine_facts["numbers"]
    stale_hr = "hr_age_days" in numbers and numbers["hr_age_days"] != 0
    for key, value in numbers.items():
        # FI-10: an HR value from an earlier day is not today's reading, so it may not
        # be quoted as a current measurement. Its age (hr_age_days) stays allowed.
        if stale_hr and key in ("hr_now", "hr_lo", "hr_hi", "hr_base", "z_hr"):
            continue
        allowed |= _formats(value)
    for num in re.findall(r"\d+(?:\.\d+)?", str(card["what_changed"])):
        if num not in allowed:
            errs.append(f"number {num} not in engine facts")
    # The headline, rationale and the message shown to Earth are read just as
    # prominently (FI-02), so the same rule applies. do_now stays exempt: it
    # legitimately carries procedural numbers ("re-measure after 5 min") that are
    # not engine measurements, and we cannot tell them apart without weakening
    # the measurement check.
    for field in ("headline", "why_it_matters", "ground_message"):
        for num in re.findall(r"\d+(?:\.\d+)?", str(card[field])):
            if num not in allowed:
                errs.append(f"number {num} in {field} not in engine facts")
    do_now = card["do_now"]
    if not isinstance(do_now, list) or not (1 <= len(do_now) <= 5):
        errs.append("do_now must have 1-5 steps")
    elif not all(isinstance(step, str) for step in do_now):
        errs.append("do_now must be a list of strings")
    if len(str(card["ground_message"])) > GROUND_MAX:
        errs.append(f"ground_message too long (max {GROUND_MAX})")
    return errs
