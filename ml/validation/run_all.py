#!/usr/bin/env python3
"""Head-to-head on SYNTHETIC crews at an EQUAL false-alarm budget.

Methods (all re-implemented here; none copied from other teams):
  A  population rule      max_i |x-pop_mean|/pop_sd        (what threshold dashboards do)
  B  N-of-1 z             max_i |z_i| vs own baseline
  B2 N-of-1 CUSUM         max_i CUSUM_i
  C  N-of-1 syndrome      directional multi-indicator score (needs a clinical-prior direction)
Each threshold is calibrated on TUNING seeds to a fixed daily false-alarm rate, then every
method is evaluated on disjoint REPORT seeds. Run: python ml/validation/run_all.py
"""
import os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "services", "engine"))
import numpy as np
from tether_engine.bayes import BaselineModel, CUSUM, SyndromeScore
from tether_engine.simulate.mini import INDICATORS, make_series, pop_stats

NAMES = list(INDICATORS)
DAYS, ONSET, WARM, Q = 30, 14, 7, 0.015      # Q = target false alarms per crew-day (~0.1/crew-week)


def scores(seed, effect=0.0):
    data = make_series(seed, n_days=DAYS, onset=ONSET if effect else None, effect=effect)
    models = {n: BaselineModel(*pop_stats(n)) for n in NAMES}
    cus = {n: CUSUM() for n in NAMES}
    syn = SyndromeScore([INDICATORS[n]["sign"] for n in NAMES])
    out = {m: [] for m in ("A", "B", "B2", "C")}
    for d in range(DAYS):
        zs, cs, pa = [], [], []
        for n in NAMES:
            x = data[n][d]
            z = models[n].surprise(x)["z"]
            zs.append(z); cs.append(max(cus[n].step(z)["hi"], cus[n].lo))
            pa.append(abs(x - pop_stats(n)[0]) / pop_stats(n)[1])
            models[n].robust_update(x)
        out["A"].append(max(pa)); out["B"].append(max(abs(z) for z in zs))
        out["B2"].append(max(cs)); out["C"].append(syn.score(zs)["z_dir"])
        syn.observe(zs)
    return out


def calibrate(n_seeds=400):
    pool = {m: [] for m in ("A", "B", "B2", "C")}
    for s in range(n_seeds):
        sc = scores(10_000 + s)
        for m in pool: pool[m] += sc[m][WARM:]
    return {m: float(np.quantile(v, 1 - Q)) for m, v in pool.items()}


def evaluate(thr, effect, n_seeds=500, horizon=10):
    delays = {m: [] for m in thr}
    for s in range(n_seeds):
        sc = scores(50_000 + s, effect)
        for m, t in thr.items():
            hit = next((d - ONSET for d in range(ONSET, DAYS) if sc[m][d] > t), None)
            delays[m].append(hit)
    res = {}
    for m, v in delays.items():
        det = [x for x in v if x is not None and x < horizon]
        res[m] = {"recall": len(det) / len(v), "median_delay_days": float(np.median(det)) if det else None}
    return res


def fa_rate(thr, n_seeds=500):
    r = {m: 0 for m in thr}; n = 0
    for s in range(n_seeds):
        sc = scores(90_000 + s)
        n += DAYS - WARM
        for m, t in thr.items(): r[m] += sum(x > t for x in sc[m][WARM:])
    return {m: 7.0 * c / n for m, c in r.items()}   # per crew-week


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


if __name__ == "__main__":
    labels = {"A": "A  Population threshold", "B": "B  N-of-1 z-score", "B2": "B2 N-of-1 CUSUM", "C": "C  N-of-1 syndrome (directional)"}
    md = ["# Validation (SYNTHETIC crews)\n",
          "Equal false-alarm budget (~0.1 per crew-week); thresholds tuned on separate seeds; "
          "500 simulated crew members per effect size; onset day 14; recall = detected within 10 days. "
          "Effect sizes are shifts in units of within-person sd.\n"]
    allres = {}
    base = {n: INDICATORS[n]["between"] for n in NAMES}
    for scale, title in ((1.0, "Scenario 1: homogeneous crew (between-person sd x1)"),
                         (2.5, "Scenario 2: heterogeneous crew (between-person sd x2.5, e.g. athletes + deconditioned)")):
        for n in NAMES: INDICATORS[n]["between"] = (base[n][0], base[n][1] * scale)
        thr = calibrate(); fa = fa_rate(thr)
        res = {"mild(0.8 sd)": evaluate(thr, 0.8), "moderate(1.6 sd)": evaluate(thr, 1.6), "strong(3.0 sd)": evaluate(thr, 3.0)}
        md += table(title, thr, fa, res, labels) + [""]
        allres[scale] = {"thresholds": thr, "fa_per_week": fa, "results": res}
    md += ["## Limitations (read before quoting any number)",
           "- Synthetic data from our own simulator; effect applied in the syndrome direction.",
           "- Method C knows the syndrome direction (a clinical prior); it is blind to other directions. B/B2 are direction-agnostic.",
           "- Gaussian noise, independent indicators, 4 indicators, no circadian/exercise context. Real data will be harder.",
           "- Single-indicator N-of-1 (B) is NOT dramatically better than a population rule when crews are homogeneous; the gains come from CUSUM, the syndrome score and heterogeneity.",
           "- NOT clinical validation. Next: run unchanged on Inspiration4 / MMASH proxies and report what fails."]
    here = os.path.dirname(__file__)
    open(os.path.join(here, "..", "..", "docs", "validation.md"), "w").write("\n".join(md) + "\n")
    json.dump(allres, open(os.path.join(here, "results.json"), "w"), indent=1)
    print("\n".join(md))
