"""Quality control: drop what cannot be modelled, and say what was dropped.

Sensor dropouts, NaNs and physically impossible values are normal in space
operations. Bad points are removed BEFORE any Bayesian update (a garbage point
would otherwise contaminate the personal baseline) and every removal is logged so
the crew can see how much data the verdict is based on.

The bounds below are PLAUSIBILITY limits -- sanity checks on the instrument, not
clinical thresholds. Nothing here decides urgency.
"""
from __future__ import annotations

import logging
import math

log = logging.getLogger(__name__)

PLAUSIBLE: dict[str, tuple[float, float]] = {
    "rest_hr": (20.0, 250.0),
    "temp_c": (30.0, 43.0),
    "sleep_h": (0.0, 24.0),
    "pvt_ms": (100.0, 2000.0),
    "co2_ppm": (200.0, 20000.0),
    "headache_score": (0.0, 10.0),
}


def clean_value(name: str, value) -> tuple[float | None, str | None]:
    """Return (usable value, reason dropped). Never raises on odd input."""
    if value is None:
        return None, "missing"
    try:
        x = float(value)
    except (TypeError, ValueError):
        return None, "not_a_number"
    if math.isnan(x) or math.isinf(x):
        return None, "not_finite"
    lo, hi = PLAUSIBLE.get(name, (-math.inf, math.inf))
    if x < lo or x > hi:
        return None, "impossible"
    return x, None


def clean_readings(readings: dict | None) -> tuple[dict[str, float], list[dict]]:
    """Clean one person-day of readings.

    `readings` may be None or partial: unknown indicators pass through (the KB
    loader is the gate for those), known ones are range-checked.
    """
    cleaned: dict[str, float] = {}
    issues: list[dict] = []
    for name, value in (readings or {}).items():
        x, reason = clean_value(name, value)
        if reason is None:
            cleaned[name] = x
        else:
            issues.append({"indicator": name, "value": value, "reason": reason})
    return cleaned, issues


def log_drops(issues: list[dict], day: int, crew: str) -> None:
    for i in issues:
        log.info("qc drop day=%s crew=%s indicator=%s reason=%s value=%r",
                 day, crew, i["indicator"], i["reason"], i["value"])


# Stuck-value (frozen sensor) rule, FI-11.
# A channel is STUCK when its last STUCK_MIN_RUN consecutive daily readings are
# identical after rounding to 0.01. Values are compared after rounding because
# sensors report to a fixed resolution. Missing days (None) break the run, so a
# dropout is never counted as "the same value".
# STUCK_MIN_RUN = 5 is a DEMO PARAMETER, not a validated sensor specification:
# it is unverified against real device behaviour and must not be presented as one.
# The flag is informational only. It does not change the engine level or urgency.
STUCK_MIN_RUN = 5


def trailing_run(history: list[float | None]) -> int:
    """Length of the run of identical readings that ends at the latest day.

    Returns 0 when the latest day is missing. Never raises on odd input.
    """
    if not history or history[-1] is None:
        return 0
    last = round(float(history[-1]), 2)
    run = 0
    for x in reversed(history):
        if x is None or round(float(x), 2) != last:
            break
        run += 1
    return run


def is_stuck(history: list[float | None], min_run: int = STUCK_MIN_RUN) -> bool:
    return trailing_run(history) >= min_run
