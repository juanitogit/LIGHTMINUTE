#!/usr/bin/env python3
"""Thin wrapper: run the real engine and write static JSON for the front ends.

  python scripts/export_demo_json.py                      # demo-data.json (cmo_fever, strong)
  python scripts/export_demo_json.py --all                # 3 scenarios x strong|mild + index
  python scripts/export_demo_json.py --scenario co2_creep --variant mild --days 24

All data is SYNTHETIC. The engine output is never recomputed in the browser.
"""
import argparse
import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(ROOT, "services", "engine"))

from tether_engine.pipeline import run_scenario
from tether_engine.simulate.scenarios import SCENARIOS, write_scenario

DATA_DIR = os.path.join(ROOT, "apps", "crew-tablet", "public", "data")


def _write(path: str, payload: dict) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(payload, f, indent=1)
    print("wrote", os.path.relpath(path, ROOT))


def _index(days: int, seed: int) -> dict:
    entries = []
    for name, spec in SCENARIOS.items():
        strong = run_scenario(name, seed=seed, days=days, variant="strong")
        entries.append({
            "name": name,
            "title": strong["title"],
            "description": strong["description"],
            "available": True,
            "source": "scenario-file",
            "meta": {"title": strong["title"],
                     "description": strong["description"],
                     "onset_day": spec["onset_day"],
                     "delay_profile": strong["delay_profile"]},
            "crew": sorted(strong["crew"]),
            "crew_roles": {c: v["role"] for c, v in strong["crew"].items()},
            "days": days,
            "onset_day": spec["onset_day"],
            "variant": "strong",
            "file": f"scenario-{name}.json",
            "mild_file": f"scenario-{name}-mild.json",
            "indicators": strong["indicators"],
            "delay_profile": strong["delay_profile"],
        })
    return {"synthetic": True,
            "note": "Synthetic data. Not a medical device.",
            "seed": seed, "scenarios": entries}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--scenario", default="cmo_fever", choices=sorted(SCENARIOS))
    ap.add_argument("--variant", default="strong", choices=["strong", "mild"])
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--days", type=int, default=24)
    ap.add_argument("--all", action="store_true",
                    help="write every scenario (strong + mild) and scenario-index.json")
    ap.add_argument("--out", default=os.path.join(
        ROOT, "apps", "crew-tablet", "public", "demo-data.json"))
    a = ap.parse_args()

    if a.all:
        for name in SCENARIOS:
            for variant in ("strong", "mild"):
                suffix = "" if variant == "strong" else f"-{variant}"
                _write(os.path.join(DATA_DIR, f"scenario-{name}{suffix}.json"),
                       run_scenario(name, seed=a.seed, days=a.days, variant=variant))
                # Ground truth sidecar for validation; the engine never reads it.
                write_scenario(name, variant=variant, seed=a.seed, days=a.days,
                               root=os.path.join(ROOT, "data", "synthetic"))
        _write(os.path.join(DATA_DIR, "scenario-index.json"), _index(a.days, a.seed))

    _write(a.out, run_scenario(a.scenario, seed=a.seed, days=a.days, variant=a.variant))


if __name__ == "__main__":
    main()
