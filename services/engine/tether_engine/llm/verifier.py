"""Deterministic guard between the LLM and the astronaut.

The engine owns every number and the escalation level. The LLM may only
explain. A card is rejected (and replaced by the template fallback) if it
invents a citation, changes a number, lowers or raises urgency, diagnoses,
prescribes, grows fields outside the frozen schema or overruns the
ground-message budget.

Every rejection reason is fed back to the model once before we give up.
"""
from __future__ import annotations

import math
import re

LEVELS = ["info", "watch", "act", "escalate"]
REQUIRED = {"headline", "what_changed", "why_it_matters", "confidence",
            "do_now", "monitor", "escalate_if", "ground_message", "citations", "level"}
ALLOWED_FIELDS = REQUIRED
CONFIDENCE_LEVELS = ["low", "moderate", "high"]
GROUND_MAX = 140
LIMITS = {
    "headline": 100,
    "what_changed": 300,
    "why_it_matters": 400,
    "ground_message": 140,
    "do_now_item": 120,
}
VISIBLE_FIELDS = ("headline", "what_changed", "why_it_matters", "do_now",
                  "monitor", "escalate_if", "ground_message")

# Defense in depth only: these filters catch obvious wording, but they are not a
# semantic clinical guarantee. The deterministic template owns action wording.
DIAGNOSIS = re.compile(r"\byou have\b|\byou are suffering from\b|\bsuffering from\b|"
                       r"(?<!not a )(?<!no )\bdiagnos(is|ed)\b|"
                       r"\bit is (definitely|certainly)\b|\bconfirmed infection\b|"
                       r"\b(?:this|it) is (?:an? )?(?:case of )?"
                       r"(?:influenza|flu|infection|sepsis|pneumonia|dehydration|"
                       r"diabetes|cancer|a heart attack|a stroke)\b", re.I)
DOSING = re.compile(r"\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|ml|iu|tablets?|capsules?|pills?|drops?)\b"
                    r"|\b(?:mg|mcg|µg|ml|iu|tablets?|capsules?|pills?)\b"
                    r"|\b(?:take|give|administer|use)\s+(?:\w+\s+){0,3}drops?\b"
                    r"|\bdos(?:e|es|age|ing)\b", re.I)
PROBABILITY = re.compile(r"\b(probability|probable|likelihood|odds|chance)\b", re.I)


def _template_card(facts):
    try:
        from ..protocols.templates import template_card
    except Exception:
        return None
    # level/numbers/confidence are validated before this helper is called.
    safe = dict(facts)
    safe.setdefault("crew", "A")
    try:
        return template_card(safe)
    except Exception:
        return None


def _template_strings(card) -> set[str]:
    if not isinstance(card, dict):
        return set()
    out: set[str] = set()
    for value in card.values():
        if isinstance(value, str):
            out.add(value)
        elif isinstance(value, (list, tuple)):
            for item in value:
                if isinstance(item, str):
                    out.add(item)
    return out


def _has_digit(text: str) -> bool:
    cleaned = re.sub(r"\bCO2\b", "", text)
    cleaned = re.sub(r"\bO2\b", "", cleaned)
    return any(ch.isdigit() for ch in cleaned)


def verify_card(card, *, engine_facts=None, kb_ids=None) -> list[str]:
    """Return a list of rejection reasons (empty == accepted).

    Never raises on malformed input.
    """
    try:
        return _verify_card(card, engine_facts=engine_facts, kb_ids=kb_ids)
    except Exception as exc:  # noqa: BLE001 - total validation contract
        return [f"invalid card: {type(exc).__name__}"]


def _verify_card(card, *, engine_facts, kb_ids) -> list[str]:
    errs: list[str] = []
    if not isinstance(card, dict):
        return ["response is not a JSON object"]

    if not isinstance(engine_facts, dict):
        return ["invalid engine facts: object required"]
    facts = engine_facts
    engine_level = facts.get("level")
    if not isinstance(engine_level, str) or engine_level not in LEVELS:
        return ["invalid engine facts: level required"]
    numbers = facts.get("numbers")
    if not isinstance(numbers, dict):
        return ["invalid engine facts: numbers object required"]
    for key, value in numbers.items():
        if (not isinstance(key, str) or isinstance(value, bool)
                or not isinstance(value, (int, float))):
            return ["invalid engine facts: numbers must be finite numeric values"]
        try:
            finite = math.isfinite(value)
        except (OverflowError, ValueError):
            finite = False
        if not finite:
            return ["invalid engine facts: numbers must be finite numeric values"]
    if "confidence" in facts and facts["confidence"] not in CONFIDENCE_LEVELS:
        return ["invalid engine facts: confidence"]
    tmpl = _template_card(facts)
    if not isinstance(tmpl, dict):
        return ["invalid engine facts: deterministic template unavailable"]

    kb: set[str] = set()
    if kb_ids is not None:
        try:
            for item in kb_ids:
                if isinstance(item, str):
                    kb.add(item)
        except TypeError:
            if isinstance(kb_ids, str):
                kb.add(kb_ids)

    missing = REQUIRED - set(card.keys())
    if missing:
        return [f"missing fields: {sorted(missing)}"]
    extra = set(card.keys()) - ALLOWED_FIELDS
    if extra:
        errs.append(f"unknown fields: {sorted(extra)}")

    # level (exact)
    level = card.get("level")
    if not isinstance(level, str) or level not in LEVELS:
        errs.append("bad level")
    elif engine_level is not None and level != engine_level:
        if LEVELS.index(level) < LEVELS.index(engine_level):
            errs.append("LLM lowered urgency below engine level")
        else:
            errs.append("LLM raised urgency above engine level")

    # headline
    headline = card.get("headline")
    if not isinstance(headline, str):
        errs.append("headline must be a string")
    elif len(headline) > LIMITS["headline"]:
        errs.append(f"headline too long (max {LIMITS['headline']})")

    # what_changed
    what_changed = card.get("what_changed")
    if not isinstance(what_changed, str):
        errs.append("what_changed must be a string")
    elif len(what_changed) > LIMITS["what_changed"]:
        errs.append(f"what_changed too long (max {LIMITS['what_changed']})")
    else:
        expected = tmpl.get("what_changed")
        if expected is not None and what_changed != expected:
            errs.append(f"what_changed must equal the deterministic template: {expected}")

    # why_it_matters
    why = card.get("why_it_matters")
    if not isinstance(why, str):
        errs.append("why_it_matters must be a string")
    elif len(why) > LIMITS["why_it_matters"]:
        errs.append(f"why_it_matters too long (max {LIMITS['why_it_matters']})")

    # confidence
    confidence = card.get("confidence")
    if not isinstance(confidence, str) or confidence not in CONFIDENCE_LEVELS:
        errs.append("bad confidence")
    elif confidence != tmpl.get("confidence"):
        errs.append("LLM changed confidence from engine confidence")

    # do_now
    do_now = card.get("do_now")
    if not isinstance(do_now, list):
        errs.append("do_now must be a list of strings")
    else:
        if not (1 <= len(do_now) <= 5):
            errs.append("do_now must have 1-5 steps")
        if not all(isinstance(step, str) for step in do_now):
            errs.append("do_now must be a list of strings")
        for step in do_now:
            if isinstance(step, str) and len(step) > LIMITS["do_now_item"]:
                errs.append(f"do_now step too long (max {LIMITS['do_now_item']})")

    # monitor
    monitor = card.get("monitor")
    if not isinstance(monitor, list) or not all(isinstance(x, str) for x in monitor):
        errs.append("monitor must be a list of strings")

    # escalate_if
    escalate_if = card.get("escalate_if")
    if not isinstance(escalate_if, list) or not all(isinstance(x, str) for x in escalate_if):
        errs.append("escalate_if must be a list of strings")

    # ground_message
    ground_message = card.get("ground_message")
    if not isinstance(ground_message, str):
        errs.append("ground_message must be a string")
    elif len(ground_message) > GROUND_MAX:
        errs.append(f"ground_message too long (max {GROUND_MAX})")

    # citations
    citations = card.get("citations")
    if not isinstance(citations, list) or not citations:
        errs.append("no citations")
    else:
        if not all(isinstance(c, str) for c in citations):
            errs.append("citations must be strings")
        else:
            bad = [c for c in citations if c not in kb]
            if bad:
                errs.append(f"unknown citations: {bad}")

    # Semantic guards.
    template_strings = _template_strings(tmpl)
    if isinstance(tmpl, dict):
        if isinstance(card.get("do_now"), list) and isinstance(tmpl.get("do_now"), list) \
                and card.get("do_now") != tmpl.get("do_now"):
            errs.append("do_now must equal the deterministic template")
        if isinstance(card.get("monitor"), list) and isinstance(tmpl.get("monitor"), list) \
                and card.get("monitor") != tmpl.get("monitor"):
            errs.append("monitor must equal the deterministic template")
        if isinstance(card.get("escalate_if"), list) and isinstance(tmpl.get("escalate_if"), list) \
                and card.get("escalate_if") != tmpl.get("escalate_if"):
            errs.append("escalate_if must equal the deterministic template")
        if isinstance(card.get("ground_message"), str) and isinstance(tmpl.get("ground_message"), str) \
                and card.get("ground_message") != tmpl.get("ground_message"):
            errs.append("ground_message must equal the deterministic template")
    for text in _visible_strings(card):
        if _has_digit(text) and text not in template_strings:
            errs.append(f"numeric content not allowed in this field: {text}")
        if PROBABILITY.search(text):
            errs.append(f"unsupported probability claim: {text}")

    visible_text = " ".join(_visible_strings(card))
    if DIAGNOSIS.search(visible_text):
        errs.append("diagnostic language")
    if DOSING.search(visible_text):
        errs.append("medication dose language")

    # De-duplicate.
    seen: set[str] = set()
    out: list[str] = []
    for e in errs:
        if e in seen:
            continue
        seen.add(e)
        out.append(e)
    return out


def _visible_strings(card: dict):
    for field in VISIBLE_FIELDS:
        value = card.get(field)
        if isinstance(value, str):
            yield value
        elif isinstance(value, (list, tuple)):
            for item in value:
                if isinstance(item, str):
                    yield item
