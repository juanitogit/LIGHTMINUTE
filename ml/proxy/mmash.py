#!/usr/bin/env python3
"""Run the engine UNCHANGED on real wearable data (MMASH) and report what holds.

Why this experiment and not a "detection accuracy" claim: MMASH has ~24 h per
person and no labelled health events. What it can honestly test is the thing
our cards rely on -- whether a per-person 95% predictive interval actually
covers a person's real values -- and whether the engine's rule "never mix
contexts" is empirically justified.

Two conditions, same engine code:
  global     one BaselineModel per person over the whole day
  hourly     one BaselineModel per (person, hour of day)  -> separates circadian context

Outputs: ml/proxy/results.json and a markdown table on stdout.
Everything here is labelled PROXY: healthy volunteers, wearable HR, not crew data.
"""
from __future__ import annotations

import csv
import io
import json
import os
import statistics
import sys
import zipfile
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "services", "engine"))

from tether_engine.bayes import BaselineModel  # noqa: E402

ARCHIVE = os.path.join(ROOT, "data", "snapshots", "MMASH.zip")
WARM = 20          # observations skipped before scoring, so learning is not scored
HOUR_WARM = 10     # same, per hour-of-day bucket
PRIOR = (70.0, 14.0)   # deliberately weak adult HR prior (bpm)


def users(z: zipfile.ZipFile) -> list[str]:
    return sorted(
        {n.split("/")[1] for n in z.namelist() if n.startswith("DataPaper/user_") and "/Actigraph.csv" in n},
        key=lambda u: int(u.split("_")[1]),
    )


def minute_hr(z: zipfile.ZipFile, user: str) -> list[tuple[int, str, float, float]]:
    """(day, 'HH:MM', median HR in that minute, steps summed) from per-second rows."""
    path = f"DataPaper/{user}/Actigraph.csv"
    buckets: dict[tuple[int, str], list[float]] = {}
    steps: Counter = Counter()
    with z.open(path) as fh:
        reader = csv.DictReader(io.TextIOWrapper(fh, encoding="utf-8", errors="replace"))
        for row in reader:
            try:
                hr = float(row["HR"])
                day = int(float(row["day"]))
                st = float(row.get("Steps") or 0)
            except (TypeError, ValueError, KeyError):
                continue
            if hr <= 0:                     # 0 = device not reporting, not a heart rate
                continue
            key = (day, str(row["time"])[:5])
            buckets.setdefault(key, []).append(hr)
            steps[key] += st
    series = [(d, t, statistics.median(v), steps[(d, t)]) for (d, t), v in sorted(buckets.items())]
    return series


def coverage_global(series) -> tuple[int, int]:
    """(covered minutes, scored minutes) for one baseline per person."""
    m = BaselineModel(*PRIOR)
    cov = n = 0
    for i, (_, _, hr, _) in enumerate(series):
        sur = m.surprise(hr)             # judged before it joins its own baseline
        lo, hi = sur["ci95"]
        if i >= WARM:
            cov += int(lo <= hr <= hi)
            n += 1
        m.robust_update(hr)
    return cov, n


def coverage_hourly(series) -> tuple[int, int]:
    models: dict[int, BaselineModel] = {}
    seen: Counter = Counter()
    cov = n = 0
    for _, t, hr, _ in series:
        h = int(t[:2])
        m = models.setdefault(h, BaselineModel(*PRIOR))
        sur = m.surprise(hr)
        lo, hi = sur["ci95"]
        if seen[h] >= HOUR_WARM:
            cov += int(lo <= hr <= hi)
            n += 1
        seen[h] += 1
        m.robust_update(hr)
    return cov, n


def night_vs_afternoon(series) -> tuple[float | None, int]:
    """Circadian amplitude the model has no term for: 01-05h vs 13-17h median HR."""
    night, afternoon = [], []
    for _, t, hr, _ in series:
        h = int(t[:2])
        if 1 <= h < 5:
            night.append(hr)
        elif 13 <= h < 17:
            afternoon.append(hr)
    if not night or not afternoon:
        return None, 0
    return statistics.median(night) - statistics.median(afternoon), len(night) + len(afternoon)


def main() -> int:
    if not os.path.exists(ARCHIVE):
        print(f"missing {ARCHIVE}: run python scripts/fetch_mmash.py", file=sys.stderr)
        return 2
    z = zipfile.ZipFile(ARCHIVE)
    per_user, diffs = [], []
    tot_cov_g = tot_n_g = tot_cov_h = tot_n_h = 0
    for u in users(z):
        series = minute_hr(z, u)
        if len(series) < WARM + 30:
            continue
        cov_g, n_g = coverage_global(series)
        cov_h, n_h = coverage_hourly(series)
        diff, _ = night_vs_afternoon(series)
        if diff is not None:
            diffs.append(diff)
        tot_cov_g += cov_g
        tot_n_g += n_g
        tot_cov_h += cov_h
        tot_n_h += n_h
        per_user.append({
            "user": u,
            "minutes": len(series),
            "mean_hr": round(statistics.fmean(s[2] for s in series), 1),
            "coverage_global": round(cov_g / n_g, 3) if n_g else None,
            "n_global": n_g,
            "coverage_hourly": round(cov_h / n_h, 3) if n_h else None,
            "n_hourly": n_h,
            "night_minus_afternoon_bpm": None if diff is None else round(diff, 2),
        })

    payload = {
        "label": "proxy",
        "synthetic": False,
        "source": "MMASH 1.0.0 (PhysioNet): 22 healthy adults, ~24 h per person",
        "source_url": "https://physionet.org/content/mmash/1.0.0/",
        "what_is_run": "tether_engine.bayes.BaselineModel, unchanged, on per-minute wearable HR",
        "design": {
            "warmup_minutes_global": WARM,
            "warmup_minutes_per_hour": HOUR_WARM,
            "prior_mean_sd": list(PRIOR),
            "signal": "median Actigraph HR per clock minute (0 values dropped)",
        },
        "users": len(per_user),
        "minutes_scored": {"global": tot_n_g, "hourly": tot_n_h},
        "coverage_95": {
            "global": round(tot_cov_g / tot_n_g, 3) if tot_n_g else None,
            "hourly": round(tot_cov_h / tot_n_h, 3) if tot_n_h else None,
            "nominal": 0.95,
        },
        "night_minus_afternoon_median_bpm": round(statistics.median(diffs), 2) if diffs else None,
        "per_user": per_user,
        "caveats": [
            "Healthy volunteers, not astronauts; wearable optical HR, not clinical ECG.",
            "One day per person: this tests interval honesty and context, not detection.",
            "Minutes are autocorrelated, so 'coverage across minutes' is not an iid sample; treat it as descriptive.",
            "No labelled events exist here, so no recall or delay is claimed from this dataset.",
        ],
    }
    with open(os.path.join(HERE, "results.json"), "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=1)

    print(f"users: {len(per_user)} | minutes scored: global={tot_n_g} hourly={tot_n_h}")
    print(f"95% interval coverage  global={payload['coverage_95']['global']:.1%}  "
          f"hourly={payload['coverage_95']['hourly']:.1%}  (nominal 95.0%)")
    print(f"night - afternoon median HR: {payload['night_minus_afternoon_median_bpm']} bpm "
          f"(the model has no circadian term)")
    print("\n| user | minutes | mean HR | coverage global | coverage hourly | night-aft (bpm) |")
    print("|---|---|---|---|---|---|")
    for r in per_user:
        print(f"| {r['user']} | {r['minutes']} | {r['mean_hr']} | {r['coverage_global']:.0%} | "
              f"{r['coverage_hourly']:.0%} | {r['night_minus_afternoon_bpm']} |")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
