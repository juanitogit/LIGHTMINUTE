"""Randomized invariants for the deterministic Decision Card verifier."""
import sys
from pathlib import Path

from hypothesis import given, settings
from hypothesis import strategies as st

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "services" / "engine"))
from tether_engine.llm.verifier import verify_card

LEVELS = ("info", "watch", "act", "escalate")


def card(level, headline="Reading reviewed"):
    return {"headline": headline, "what_changed": "Reading changed", "why_it_matters": "Review the pattern",
            "confidence": "moderate", "level": level, "do_now": ["Review the reading"],
            "monitor": ["Record the reading"], "escalate_if": ["Follow onboard guidance"],
            "ground_message": "Review the reading", "citations": ["SOURCE"]}


@settings(max_examples=1200, deadline=None, derandomize=True)
@given(st.integers(min_value=0, max_value=3), st.integers(min_value=0, max_value=3))
def test_lower_urgency_is_rejected(engine_index, output_index):
    if output_index >= engine_index:
        return
    errors = verify_card(card(LEVELS[output_index]),
                         engine_facts={"level": LEVELS[engine_index], "numbers": {}}, kb_ids={"SOURCE"})
    assert any("lowered" in error for error in errors), errors


@settings(max_examples=1200, deadline=None, derandomize=True)
@given(st.integers(min_value=10, max_value=999999))
def test_fabricated_numbers_in_headline_are_rejected(number):
    errors = verify_card(card("info", f"Observed value {number}"),
                         engine_facts={"level": "info", "numbers": {}}, kb_ids={"SOURCE"})
    assert any("number" in error for error in errors), errors


if __name__ == "__main__":
    test_lower_urgency_is_rejected()
    test_fabricated_numbers_in_headline_are_rejected()
    print("Property checks passed: urgency ordering and invented headline numbers")
