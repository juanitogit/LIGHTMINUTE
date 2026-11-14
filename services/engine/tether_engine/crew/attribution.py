"""Crew-level attribution (threshold = alert level 2.33; with only 4 people a single-day
call is noisy -- production should require 2 consecutive days).

Crew-level attribution: one person drifting vs. everybody drifting.

If most of the crew shifts in the same window, suspect a SHARED exposure
(cabin CO2, temperature, a radiation event, schedule) -- or contagion -- and
check the habitat before blaming an individual. If only one person shifts,
treat it as individual. Per-person systems cannot do this; a crew-aware one can.
"""
from __future__ import annotations


def attribute(scores: dict[str, float], thr: float = 2.33,
              min_affected: int = 2, shared_fraction: float = 0.5) -> dict:
    affected = sorted(c for c, z in scores.items() if z >= thr)
    n = len(scores)
    if not affected:
        return {"mode": "none", "affected": [], "advice": "No crew-level pattern."}
    if len(affected) >= min_affected and len(affected) / n >= shared_fraction:
        return {"mode": "shared", "affected": affected,
                "advice": "Several crew shifted together: check cabin environment "
                          "(CO2, temperature, radiation event, schedule) first; "
                          "contagion is also possible."}
    return {"mode": "individual", "affected": affected,
            "advice": "Isolated shift: handle as an individual finding."}


class PersistentAttribution:
    """With only 4 people a single noisy day should not move the crew verdict.

    `attribute()` stays the stateless primitive; this wrapper requires the same
    call (same mode) on `required_days` consecutive days before it is reported.
    The affected list is taken from the most recent day. Pending calls surface as
    mode 'none' plus a note, so the UI never shows a crew-level pattern the data
    has not confirmed.
    """
    def __init__(self, required_days: int = 2, **kw):
        self.required_days, self.kw = required_days, kw
        self._pending: str | None = None
        self._streak = 0

    def step(self, scores: dict[str, float]) -> dict:
        raw = attribute(scores, **self.kw)
        if raw["mode"] == "none":
            self._pending, self._streak = None, 0
            return {**raw, "persistence": {"confirmed_days": 0,
                                            "required_days": self.required_days}}
        key = raw["mode"]
        if key == self._pending:
            self._streak += 1
        else:
            self._pending, self._streak = key, 1
        if self._streak >= self.required_days:
            return {**raw, "persistence": {"confirmed_days": self._streak,
                                            "required_days": self.required_days}}
        return {"mode": "none", "affected": [],
                "advice": (f"Candidate {raw['mode']} pattern (1 of "
                           f"{self.required_days} days); holding until it repeats."),
                "persistence": {"confirmed_days": self._streak,
                                "required_days": self.required_days}}
