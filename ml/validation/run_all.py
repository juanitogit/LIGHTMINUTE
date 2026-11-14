#!/usr/bin/env python3
"""Head-to-head on SYNTHETIC crews at an EQUAL false-alarm budget.

Methods (all re-implemented here; none copied from other teams):
  A  population rule      max_i |x-pop_mean|/pop_sd        (what threshold dashboards do)
  B  N-of-1 z             max_i |z_i| vs own baseline
  B2 N-of-1 CUSUM         max_i CUSUM_i
  C  N-of-1 syndrome      directional multi-indicator score (needs a clinical-prior direction)

Each threshold is calibrated on TUNING seeds to a fixed daily false-alarm rate, then
every method is evaluated on disjoint REPORT seeds.

Beyond the head-to-head tables this harness reports the three things a judge should
ask about (A5):
  - calibration: do the 95% intervals actually cover 95% on healthy days?
  - missing data: what happens when 20% or 40% of readings never arrive?
  - baseline length: how much personal history is needed before the shift?

Run: python ml/validation/run_all.py
Writes: docs/validation.md, ml/validation/results.json,
        apps/crew-tablet/public/data/validation.json
"""
import json
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "services", "engine"))
import numpy as np
from tether_engine.bayes import BaselineModel, CUSUM, SyndromeScore
from tether_engine.simulate.mini import INDICATORS, make_series, pop_stats

NAMES = list(INDICATORS)
METHODS = ("A", "B", "B2", "C")
DAYS, ONSET, WARM, Q = 30, 14, 7, 0.015      # Q = target false alarms per crew-day (~0.1/crew-week)
EXPERIMENT_SEEDS = 120                        # robustness cells: fewer seeds, wider intervals


def scores(seed, effect=0.0, *, missing_p=0.0, onset=ONSET, want_calib=False):
    """Per-day score for every method, plus (optional) interval coverage counts.

    missing_p drops readings before the engine sees them. A dropped reading does
    not update any baseline and is not scored; the syndrome vector uses a neutral
    z=0 for it (conservative: it lowers the score) and the covariance is only
    learned on days with no imputation.
    """
    data = make_series(seed, n_days=DAYS, onset=onset if effect else None, effect=effect)
    models = {n: BaselineModel(*pop_stats(n)) for n in NAMES}
    cus = {n: CUSUM() for n in NAMES}
    syn = SyndromeScore([INDICATORS[n]["sign"] for n in NAMES])
    rng = random.Random(seed * 7919 + 13)     # independent of the data stream
    out = {m: [] for m in METHODS}
    calib = {n: [0, 0] for n in NAMES}        # [covered, total]
    prev = {m: 0.0 for m in METHODS}

    for d in range(DAYS):
        zs, cs, pa, z_full = [], [], [], []
        observed = imputed = 0
        for n in NAMES:
            if missing_p and rng.random() < missing_p:
                z_full.append(0.0)
                imputed += 1
                continue
            x = data[n][d]
            sur = models[n].surprise(x)
            if want_calib and d >= WARM:
                lo, hi = sur["ci95"]
                calib[n][0] += int(lo <= x <= hi)
                calib[n][1] += 1
            z = sur["z"]
            zs.append(z)
            z_full.append(z)
            cs.append(max(cus[n].step(z)["hi"], cus[n].lo))
            mean, sd = pop_stats(n)
            pa.append(abs(x - mean) / sd)
            models[n].robust_update(x)
            observed += 1
        if not observed:                       # every sensor down: carry the last state
            for m in METHODS:
                out[m].append(prev[m])
            continue
        z_dir = syn.score(z_full)["z_dir"]
        if not imputed:
            syn.observe(z_full)
        vals = {"A": max(pa), "B": max(abs(z) for z in zs), "B2": max(cs), "C": z_dir}
        for m, v in vals.items():
            out[m].append(v)
            prev[m] = v
    return out, calib


def calibrate(n_seeds=400):
    pool = {m: [] for m in METHODS}
    for s in range(n_seeds):
        sc, _ = scores(10_000 + s)
        for m in pool:
            pool[m] += sc[m][WARM:]
    return {m: float(np.quantile(v, 1 - Q)) for m, v in pool.items()}


def evaluate(thr, effect, n_seeds=500, horizon=10, *, onset=ONSET, missing_p=0.0):
    delays = {m: [] for m in thr}
    for s in range(n_seeds):
        sc, _ = scores(50_000 + s, effect, missing_p=missing_p, onset=onset)
        for m, t in thr.items():
            hit = next((d - onset for d in range(onset, DAYS) if sc[m][d] > t), None)
            delays[m].append(hit)
    res = {}
    for m, v in delays.items():
        det = [x for x in v if x is not None and x < horizon]
        res[m] = {
            "recall": len(det) / len(v),
            "median_delay_days": float(np.median(det)) if det else None,
        }
    return res


def fa_rate(thr, n_seeds=500, *, missing_p=0.0):
    r = {m: 0 for m in thr}
    n = 0
    for s in range(n_seeds):
        sc, _ = scores(90_000 + s, missing_p=missing_p)
        n += DAYS - WARM
        for m, t in thr.items():
            r[m] += sum(x > t for x in sc[m][WARM:])
    return {m: 7.0 * c / n for m, c in r.items()}   # per crew-week


def calibration(n_seeds=EXPERIMENT_SEEDS):
    cov = {n: [0, 0] for n in NAMES}
    for s in range(n_seeds):
        _, c = scores(70_000 + s, want_calib=True)
        for n in NAMES:
            cov[n][0] += c[n][0]
            cov[n][1] += c[n][1]
    by = {n: {"coverage": cov[n][0] / cov[n][1], "n": cov[n][1]} for n in NAMES}
    total = sum(c[1] for c in cov.values())
    pooled = sum(c[0] for c in cov.values()) / total
    return {"overall_coverage": pooled, "n": total, "by_indicator": by}


def robustness_missing(thr, n_seeds=EXPERIMENT_SEEDS):
    rows = []
    for frac in (0.0, 0.2, 0.4):
        rec = evaluate(thr, 1.6, n_seeds=n_seeds, missing_p=frac)
        fa = fa_rate(thr, n_seeds=n_seeds, missing_p=frac)
        rows.append({
            "missing_fraction": frac,
            "recall_moderate": {m: rec[m]["recall"] for m in METHODS},
            "fa_per_week": fa,
        })
    return rows


def robustness_baseline(thr, n_seeds=EXPERIMENT_SEEDS):
    rows = []
    for days in (3, 7, 14):
        rec = evaluate(thr, 1.6, n_seeds=n_seeds, onset=days)
        rows.append({"baseline_days": days, "recall_moderate": {m: rec[m]["recall"] for m in METHODS}})
    return rows


def table(title, thr, fa, results, labels):
    md = [f"## {title}\n",
          "| Method | FA / crew-week | " + " | ".join(f"recall {k}" for k in results) + " | median delay moderate (d) |",
          "|---|---|" + "---|" * (len(results) + 1)]
    for m in thr:
        row = [labels[m], f"{fa[m]:.2f}"] + [f"{results[k][m]['recall']*100:.0f}%" for k in results]
        d = results["moderate(1.6 sd)"][m]["median_delay_days"]
        row.append("-" if d is None else f"{d:.0f}")
        md.append("| " + " | ".join(row) + " |")
    return md


def main():
    labels = {"A": "A  Population threshold", "B": "B  N-of-1 z-score",
              "B2": "B2 N-of-1 CUSUM", "C": "C  N-of-1 syndrome (directional)"}
    md = ["# Validation (SYNTHETIC crews)\n",
          "Equal false-alarm budget (~0.1 per crew-week); thresholds tuned on separate seeds; "
          "500 simulated crew members per effect size; onset day 14; recall = detected within 10 days. "
          "Effect sizes are shifts in units of within-person sd.\n",
          "Reproduce with `python ml/validation/run_all.py` (writes this file, `results.json` and "
          "`apps/crew-tablet/public/data/validation.json`).\n"]
    allres = {}
    base = {n: INDICATORS[n]["between"] for n in NAMES}
    for scale, title in ((1.0, "Scenario 1: homogeneous crew (between-person sd x1)"),
                         (2.5, "Scenario 2: heterogeneous crew (between-person sd x2.5, e.g. athletes + deconditioned)")):
        for n in NAMES:
            INDICATORS[n]["between"] = (base[n][0], base[n][1] * scale)
        thr = calibrate()
        fa = fa_rate(thr)
        res = {"mild(0.8 sd)": evaluate(thr, 0.8),
               "moderate(1.6 sd)": evaluate(thr, 1.6),
               "strong(3.0 sd)": evaluate(thr, 3.0)}
        md += table(title, thr, fa, res, labels) + [""]
        allres[scale] = {"thresholds": thr, "fa_per_week": fa, "results": res}

    # Interval calibration (homogeneous crew; noise is the same in both, so one scale is enough)
    for n in NAMES:
        INDICATORS[n]["between"] = base[n]
    cal = calibration()
    md += ["## Calibration: do the 95% intervals mean anything?\n",
           f"Healthy report seeds, days {WARM + 1}-{DAYS}, nominal coverage 95%, "
           f"n = {cal['n']} indicator-days.\n",
           "| Indicator | 95% coverage | n |", "|---|---|---|"]
    for n in NAMES:
        md.append(f"| {n} | {cal['by_indicator'][n]['coverage']*100:.0f}% | {cal['by_indicator'][n]['n']} |")
    md.append(f"| **Pooled** | **{cal['overall_coverage']*100:.0f}%** | {cal['n']} |")
    md.append("")

    # Robustness: thresholds keep the values calibrated above (no re-tuning per condition).
    thr_h = allres[1.0]["thresholds"]
    miss = robustness_missing(thr_h)
    md += ["## Robustness 1: missing readings\n",
           f"Readings dropped at random before the engine sees them (40% approximates a failing wearable). "
           f"Thresholds are NOT re-tuned per condition, so this measures degradation. "
           f"{EXPERIMENT_SEEDS} report seeds per cell.\n",
           "| Missing | A recall moderate | B recall moderate | B2 recall moderate | C recall moderate | C FA / crew-week |",
           "|---|---|---|---|---|---|"]
    for row in miss:
        r = row["recall_moderate"]
        md.append(f"| {int(row['missing_fraction']*100)}% | {r['A']*100:.0f}% | {r['B']*100:.0f}% | "
                  f"{r['B2']*100:.0f}% | {r['C']*100:.0f}% | {row['fa_per_week']['C']:.2f} |")
    md.append("")

    base_len = robustness_baseline(thr_h)
    md += ["## Robustness 2: how much personal history before the shift\n",
           "The shift starts after k days of personal data (k = 3/7/14). Recall = detected within 10 days "
           f"of that onset; {EXPERIMENT_SEEDS} report seeds per cell. Moderate effect (1.6 sd).\n",
           "| Personal history at onset | A | B | B2 | C |", "|---|---|---|---|---|"]
    for row in base_len:
        r = row["recall_moderate"]
        md.append(f"| {row['baseline_days']} days | {r['A']*100:.0f}% | {r['B']*100:.0f}% | "
                  f"{r['B2']*100:.0f}% | {r['C']*100:.0f}% |")
    md.append("")

    limitations = [
        "Synthetic data from our own simulator; effect applied in the syndrome direction.",
        "Method C knows the syndrome direction (a clinical prior); it is blind to other directions. B/B2 are direction-agnostic.",
        "Gaussian noise, independent indicators, 4 indicators, no circadian/exercise context. Real data will be harder.",
        "Single-indicator N-of-1 (B) is NOT dramatically better than a population rule when crews are homogeneous; the gains come from CUSUM, the syndrome score and heterogeneity.",
        "Missing readings are imputed as a neutral z=0 for the syndrome score, and its covariance is learned only on complete healthy days; a real dropout pattern (whole sensors failing for days) is harsher than random drops.",
        "Robustness cells use 120 report seeds, so their percentages carry wide intervals; treat differences under ~10 points as unresolved.",
        "NOT clinical validation. Next: run unchanged on Inspiration4 / MMASH proxies and report what fails.",
    ]
    md += ["## Real data and model variants (separate scripts, same engine)",
           "- Proxy run on MMASH wearable HR: `python ml/proxy/mmash.py` -> `ml/proxy/README.md`.",
           "- Forgetting-factor diagnostic and proposed fix: `python ml/diagnostics/forgetting_drift.py`.",
           "- Circadian sensitivity, with the forgetting defect separated out: `python ml/sensitivity/circadian.py`.",
           ""]
    md += ["## Limitations (read before quoting any number)"] + [f"- {x}" for x in limitations]

    here = os.path.dirname(__file__)
    with open(os.path.join(here, "..", "..", "docs", "validation.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md) + "\n")

    allres["calibration"] = cal
    allres["missing_data"] = miss
    allres["baseline_length"] = base_len
    allres["limitations"] = limitations
    with open(os.path.join(here, "results.json"), "w", encoding="utf-8") as f:
        json.dump(allres, f, indent=1, default=float)

    # UI-friendly copy: same numbers, only fields a page needs.
    scenarios = []
    for scale, title in ((1.0, "Homogeneous crew"), (2.5, "Heterogeneous crew (between-person sd x2.5)")):
        entry = allres[scale]
        scenarios.append({
            "id": "homogeneous" if scale == 1.0 else "heterogeneous",
            "title": title,
            "between_person_sd_multiplier": scale,
            "methods": [
                {
                    "id": m,
                    "name": labels[m],
                    "fa_per_week": round(entry["fa_per_week"][m], 3),
                    "recall": {
                        "mild": round(entry["results"]["mild(0.8 sd)"][m]["recall"], 3),
                        "moderate": round(entry["results"]["moderate(1.6 sd)"][m]["recall"], 3),
                        "strong": round(entry["results"]["strong(3.0 sd)"][m]["recall"], 3),
                    },
                    "median_delay_moderate_days": entry["results"]["moderate(1.6 sd)"][m]["median_delay_days"],
                }
                for m in METHODS
            ],
        })
    payload = {
        "synthetic": True,
        "label": "synthetic",
        "generated_by": "ml/validation/run_all.py",
        "design": {
            "false_alarm_budget_per_crew_week": Q * 7,
            "tuning_seeds": 400,
            "report_seeds": 500,
            "experiment_seeds": EXPERIMENT_SEEDS,
            "days": DAYS,
            "onset_day": ONSET,
            "warmup_days": WARM,
            "detection_horizon_days": 10,
            "effect_unit": "within-person sd",
        },
        "scenarios": scenarios,
        "calibration": {
            "nominal": 0.95,
            "overall_coverage": round(cal["overall_coverage"], 3),
            "n": cal["n"],
            "by_indicator": {n: round(v["coverage"], 3) for n, v in cal["by_indicator"].items()},
        },
        "missing_data": [
            {
                "missing_fraction": row["missing_fraction"],
                "recall_moderate": {m: round(v, 3) for m, v in row["recall_moderate"].items()},
                "fa_per_week": {m: round(v, 3) for m, v in row["fa_per_week"].items()},
            }
            for row in miss
        ],
        "baseline_length": [
            {"baseline_days": row["baseline_days"],
             "recall_moderate": {m: round(v, 3) for m, v in row["recall_moderate"].items()}}
            for row in base_len
        ],
        "limitations": limitations,
        "note": "Synthetic crews only. Not a medical device, not clinical validation.",
    }
    out = os.path.join(here, "..", "..", "apps", "crew-tablet", "public", "data", "validation.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=1)
        f.write("\n")

    print("\n".join(md))
    print(f"\nwrote docs/validation.md, ml/validation/results.json, "
          f"{os.path.relpath(out, os.path.join(here, '..', '..')).replace(os.sep, '/')}")


if __name__ == "__main__":
    main()
