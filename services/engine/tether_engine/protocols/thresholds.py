"""Every threshold must declare where it came from.

status: 'verified' (needs an http source) | 'demo-parameter' | 'earth-standard'.
Anything unlabelled is rejected, so nothing unconfirmed can be shown as fact.
"""
from __future__ import annotations

import json
from dataclasses import dataclass

OK_STATUS = {"verified", "demo-parameter", "earth-standard"}


@dataclass
class Rule:
    low: float | None
    high: float | None
    status: str
    source: str


@dataclass
class Threshold:
    indicator: str
    unit: str
    hrp_risk: str
    hazard: str
    earth: Rule | None
    space: Rule | None


def _rule(d):
    if d is None:
        return None
    if d.get("status") not in OK_STATUS:
        raise ValueError(f"unlabelled threshold: {d}")
    if d["status"] == "verified" and not str(d.get("source", "")).startswith("http"):
        raise ValueError(f"'verified' needs an http source: {d}")
    return Rule(d.get("low"), d.get("high"), d["status"], d.get("source", ""))


def load_thresholds(path: str) -> dict[str, Threshold]:
    out = {}
    with open(path, encoding="utf-8") as source:
        rows = json.load(source)
    for r in rows:
        for k in ("hrp_risk", "hazard"):          # no orphan indicators
            if not r.get(k):
                raise ValueError(f"{r['indicator']}: missing {k}")
        out[r["indicator"]] = Threshold(r["indicator"], r["unit"], r["hrp_risk"],
                                        r["hazard"], _rule(r.get("earth")), _rule(r.get("space")))
    return out
