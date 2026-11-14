#!/usr/bin/env python3
"""Sensitivity: what a 24 h term does to intervals and alarms — with the
forgetting defect of `nof1.py` separated out.

`ml/diagnostics/forgetting_drift.py` showed that the pre-fix model lost
calibration as updates accumulate (alpha was not discounted), so a circadian
experiment run only on that model would attribute the defect to the rhythm.
Every condition is therefore measured twice: `legacy` (the old undiscounted
update rule, kept in forgetting_drift.py) and `fixed` (nof1.BaselineModel as it
ships since 2026-11-14).

Conditions (same streams, same seeds):
  flat            no daily term
  circ_global     one baseline per person, 24 h term included
  circ_hourly     one baseline per (person, hour of day), 24 h term included

Run: python ml/sensitivity/circadian.py
"""
from __future__ import annotations

import json
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "services", "engine"))
sys.path.insert(0, os.path.join(ROOT, "ml", "diagnostics"))

from tether_engine.bayes import BaselineModel  # noqa: E402
from forgetting_drift import LegacyUndiscountedBaseline  # noqa: E402

DAYS, HOURS = 21, 24
SAMPLES = DAYS * HOURS
SEEDS = 60
THRESHOLD_Z = 3.09      # ~0.1 false alarms/crew-week when the model is calibrated
INDICATORS = {
    "rest_hr": {"mean": 62.0, "sd": 2.0, "amp": 8.0},
    "temp_c": {"mean": 36.6, "sd": 0.15, "amp": 0.30},
    "pvt_ms": {"mean": 280.0, "sd": 15.0, "amp": 25.0},
}
VARIANTS = {"legacy": LegacyUndiscountedBaseline, "fixed": BaselineModel}


def series(name: str, seed: int, *, circadian: bool) -> list[float]:
    cfg = INDICATORS[name]
    rnd = random.Random(seed)
    base = cfg["mean"] + rnd.gauss(0, 1.0)
    out = []
    for i in range(SAMPLES):
        hour = i % 24
        term = cfg["amp"] * math.sin(2 * math.pi * (hour - 9) / 24) if circadian else 0.0
        out.append(base + term + rnd.gauss(0, cfg["sd"]))
    return out


def run(xs: list[float], factory, prior_mean: float, *, hourly: bool) -> tuple[float, int, float]:
    """Return (coverage of the 95% band, n scored, alarms per crew-week)."""
    cov = n = hits = 0
    if hourly:
        models: dict[int, object] = {}
        seen: dict[int, int] = {}
        for i, x in enumerate(xs):
            h = i % 24
            m = models.setdefault(h, factory(prior_mean, 10.0))
            sur = m.surprise(x)
            lo, hi = sur["ci95"]
            if seen.get(h, 0) >= 5:
                cov += int(lo <= x <= hi)
                n += 1
                hits += int(abs(sur["z"]) > THRESHOLD_Z)
            seen[h] = seen.get(h, 0) + 1
            m.robust_update(x)
    else:
        m = factory(prior_mean, 10.0)
        for i, x in enumerate(xs):
            sur = m.surprise(x)
            lo, hi = sur["ci95"]
            if i >= 30:
                cov += int(lo <= x <= hi)
                n += 1
                hits += int(abs(sur["z"]) > THRESHOLD_Z)
            m.robust_update(x)
    weeks = SAMPLES / (24 * 7)
    return (cov / n if n else 0.0), n, hits / weeks


def main() -> int:
    results = {"seeds": SEEDS, "threshold_z": THRESHOLD_Z, "per_indicator": {}}
    for name, cfg in INDICATORS.items():
        out = {}
        for variant, factory in VARIANTS.items():
            cells = {}
            for condition in ("flat_global", "circ_global", "circ_hourly"):
                cov = n = alarms = 0.0
                for seed in range(SEEDS):
                    circ = condition != "flat_global"
                    hourly = condition == "circ_hourly"
                    xs = series(name, 3_000 + seed if circ else 1_000 + seed, circadian=circ)
                    c, k, a = run(xs, factory, cfg["mean"], hourly=hourly)
                    cov += c * k
                    n += k
                    alarms += a
                cells[condition] = {
                    "coverage_95": round(cov / n, 3) if n else None,
                    "alarms_per_week": round(alarms / SEEDS, 2),
                    "n": int(n),
                }
            out[variant] = cells
        results["per_indicator"][name] = out

    results["note"] = (
        "Same streams and seeds across variants; the only differences are the 24 h term "
        "(flat vs circ) and the context split (global vs hourly). Alarms are counted at "
        f"|z| > {THRESHOLD_Z}, a threshold that is calibrated only when the model is."
    )
    with open(os.path.join(HERE, "results.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, indent=1)

    for variant in VARIANTS:
        print(f"\n== model: {variant} (nominal coverage 95%)")
        print(f"{'indicator':10} {'flat cov':>9} {'circ cov':>9} {'circ/h cov':>11} "
              f"{'flat alarms/w':>14} {'circ alarms/w':>14} {'circ/h alarms/w':>16}")
        for name, cells in results["per_indicator"].items():
            c = cells[variant]
            print(f"{name:10} {c['flat_global']['coverage_95']:9.0%} {c['circ_global']['coverage_95']:9.0%} "
                  f"{c['circ_hourly']['coverage_95']:11.0%} {c['flat_global']['alarms_per_week']:14.1f} "
                  f"{c['circ_global']['alarms_per_week']:14.1f} {c['circ_hourly']['alarms_per_week']:16.2f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
