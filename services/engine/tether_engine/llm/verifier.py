"""Deterministic guard between the LLM and the astronaut.

The engine owns every number and the escalation level. The LLM may only
explain. A card is rejected (and replaced by the template fallback) if it
invents a citation, changes a number, lowers urgency or diagnoses.
"""
from __future__ import annotations
import re

LEVELS = ["info", "watch", "act", "escalate"]
REQUIRED = {"headline", "what_changed", "why_it_matters", "confidence",
            "do_now", "monitor", "escalate_if", "ground_message", "citations", "level"}
DIAGNOSIS = re.compile(r"\byou have\b|(?<!not a )(?<!no )\bdiagnos(is|ed)\b|\bit is (definitely|certainly)\b", re.I)


def verify_card(card: dict, *, engine_facts: dict, kb_ids: set[str]) -> list[str]:
    errs: list[str] = []
    missing = REQUIRED - card.keys()
    if missing:
        return [f"missing fields: {sorted(missing)}"]
    if card["level"] not in LEVELS:
        errs.append("bad level")
    elif LEVELS.index(card["level"]) < LEVELS.index(engine_facts["level"]):
        errs.append("LLM lowered urgency below engine level")      # never allowed
    bad = [c for c in card["citations"] if c not in kb_ids]
    if bad:
        errs.append(f"unknown citations: {bad}")
    if not card["citations"]:
        errs.append("no citations")
    text = " ".join(str(card[k]) for k in ("headline", "what_changed", "why_it_matters"))
    if DIAGNOSIS.search(text):
        errs.append("diagnostic language")
    # every number in what_changed must appear in the engine facts (as rounded strings)
    allowed = {f"{v:.1f}".rstrip("0").rstrip(".") if isinstance(v, float) else str(v)
               for v in engine_facts["numbers"].values()}
    for num in re.findall(r"\d+(?:\.\d+)?", card["what_changed"]):
        if num not in allowed:
            errs.append(f"number {num} not in engine facts")
    if not (1 <= len(card["do_now"]) <= 5):
        errs.append("do_now must have 1-5 steps")
    return errs
