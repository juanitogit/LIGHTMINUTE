"""Three-lens verdict: Earth rule vs. Space-adapted rule vs. YOUR baseline.

Borrowed idea (re-implemented): show Earth and space verdicts side by side.
Our addition: a personal lens with uncertainty, and a named pattern when the
lenses disagree -- that disagreement is where the insight is.
"""
from __future__ import annotations

from .protocols.thresholds import Rule, Threshold


def _band(rule: Rule | None, x: float) -> str:
    if rule is None:
        return "no_rule"
    if rule.low is not None and x < rule.low:
        return "low"
    if rule.high is not None and x > rule.high:
        return "high"
    return "normal"


def _personal(s: dict | None, alpha: float = 0.01, min_n: int = 7) -> str:
    if s is None or s["n_seen"] < min_n:
        return "learning"
    if s["p_two_sided"] < alpha:
        return "unusual_high" if s["z"] > 0 else "unusual_low"
    return "typical"


def three_lens(th: Threshold, x: float, personal_surprise: dict | None) -> dict:
    earth, space, me = _band(th.earth, x), _band(th.space, x), _personal(personal_surprise)
    if me == "learning":
        pattern = "learning_baseline"
    elif earth == "normal" and me.startswith("unusual"):
        pattern = "hidden_in_range"          # normal for the population, unusual for YOU
    elif earth in ("high", "low") and space == "normal":
        pattern = "space_adapted_normal"     # Earth rule would false-alarm
    elif earth in ("high", "low") and me == "typical":
        pattern = "expected_for_you"         # your own normal sits outside the Earth range
    elif earth in ("high", "low") and me.startswith("unusual"):
        pattern = "concordant_alert"
    elif earth in ("normal", "no_rule") and me == "typical":
        pattern = "concordant_normal"
    else:
        pattern = "mixed"
    return {"earth": earth, "space": space, "personal": me, "pattern": pattern}
