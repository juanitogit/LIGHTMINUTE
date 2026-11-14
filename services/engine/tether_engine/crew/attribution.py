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
