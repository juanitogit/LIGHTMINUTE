#!/usr/bin/env python3
"""Diagnostic: the baseline model becomes over-confident as updates accumulate.

Found while running the real-data proxy check (MMASH gave 21.6% coverage of a
nominal 95% interval, and a flat synthetic series reproduced the collapse once
we moved from daily to hourly updates).

Cause, in `tether_engine/bayes/nof1.py::update`:
    kappa <- lam*kappa + 1
    beta  <- lam*beta  + ...
    alpha <- alpha + 0.5          <-- NOT discounted
With lambda < 1 the two first moments forget old evidence, but alpha keeps
growing by 0.5 per update, so df = 2*alpha grows without bound while the scale
sqrt(beta*(kappa+1)/(alpha*kappa)) shrinks. The Student-t becomes a very narrow
Gaussian: exactly the "honest tails with few observations" property the model is
documented to have, lost after a few hundred updates.

A1 owns that file, so this script only *measures* the defect and verifies the
proposed fix locally (subclass, no edit):

    alpha <- alpha0 + (alpha - alpha0)*lam + 0.5

Run: python ml/diagnostics/forgetting_drift.py
"""
from __future__ import annotations

import json
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "services", "engine"))
sys.path.insert(0, os.path.join(ROOT, "ml", "proxy"))

from tether_engine.bayes.nof1 import NIG, BaselineModel  # noqa: E402

WARM = 20


class DiscountedAlphaBaseline(BaselineModel):
    """Same model, with alpha discounted like kappa and beta (proposed fix)."""

    def __init__(self, *a, prior_var_n: float = 0.5, **kw):
        super().__init__(*a, prior_var_n=prior_var_n, **kw)
        self.alpha0 = 1.0 + prior_var_n / 2.0

    def update(self, x: float) -> None:
        p, lam = self.post, self.lam
        k0, b0 = p.kappa * lam, p.beta * lam
        k1 = k0 + 1.0
        a1 = self.alpha0 + (p.alpha - self.alpha0) * lam + 0.5
        self.post = NIG(mu0=(k0 * p.mu0 + x) / k1, kappa=k1, alpha=a1,
                        beta=b0 + 0.5 * k0 * (x - p.mu0) ** 2 / k1)
        self.n_seen += 1


def coverage_stream(n_updates: int, factory, seeds: int = 40, sd: float = 2.0,
                    mean: float = 60.0) -> tuple[float, float]:
    """Coverage of the 95% interval on a flat (no circadian) healthy series."""
    cov = n = 0
    df_last = 0.0
    for s in range(seeds):
        rnd = random.Random(500 + s)
        m = factory()
        for i in range(n_updates):
            x = rnd.gauss(mean, sd)
            sur = m.surprise(x)
            lo, hi = sur["ci95"]
            if i >= WARM:
                cov += int(lo <= x <= hi)
                n += 1
            m.robust_update(x)
        df_last = max(df_last, m.predictive()[2])
    return (cov / n if n else 0.0), df_last


def main() -> int:
    # Same weak adult-HR prior as ml/proxy/mmash.py, so the real-data numbers match.
    factories = {
        "current": lambda: BaselineModel(70.0, 14.0),
        "alpha_discounted": lambda: DiscountedAlphaBaseline(70.0, 14.0),
    }
    rows = []
    for updates in (23, 200, 500, 2000):
        row = {"updates": updates}
        for name, f in factories.items():
            cov, df = coverage_stream(updates, f)
            row[name] = {"coverage_95": round(cov, 3), "df_after": round(df, 1)}
        rows.append(row)

    # Real data: the same comparison on MMASH per-minute HR.
    mmash = None
    try:
        import zipfile

        from mmash import coverage_global, minute_hr, users  # type: ignore

        archive = os.path.join(ROOT, "data", "snapshots", "MMASH.zip")
        if os.path.exists(archive):
            z = zipfile.ZipFile(archive)
            cov_c = n_c = cov_f = n_f = 0
            for u in users(z):
                series = minute_hr(z, u)
                if len(series) < WARM + 30:
                    continue
                for key, factory in (("current", factories["current"]),
                                     ("fixed", factories["alpha_discounted"])):
                    m = factory()
                    c = n = 0
                    for i, (_, _, hr, _) in enumerate(series):
                        sur = m.surprise(hr)
                        lo, hi = sur["ci95"]
                        if i >= WARM:
                            c += int(lo <= hr <= hi)
                            n += 1
                        m.robust_update(hr)
                    if key == "current":
                        cov_c += c
                        n_c += n
                    else:
                        cov_f += c
                        n_f += n
            mmash = {"current": round(cov_c / n_c, 3), "alpha_discounted": round(cov_f / n_f, 3),
                     "minutes": n_c}
    except Exception as exc:  # pragma: no cover - diagnostics must not crash the suite
        mmash = {"error": f"{type(exc).__name__}: {exc}"}

    payload = {"nominal_coverage": 0.95, "flat_series": rows, "mmash_minute_hr": mmash,
               "note": "Coverage of the 95% predictive interval; flat series are N(60,2)."}
    with open(os.path.join(HERE, "results.json"), "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=1)

    print(f"{'updates':>8} | {'coverage current':>17} | {'df after':>9} | "
          f"{'coverage alpha-disc':>20} | {'df after':>9}")
    for r in rows:
        print(f"{r['updates']:>8} | {r['current']['coverage_95']:17.0%} | {r['current']['df_after']:9.1f} | "
              f"{r['alpha_discounted']['coverage_95']:20.0%} | {r['alpha_discounted']['df_after']:9.1f}")
    if mmash and "error" not in mmash:
        print(f"\nMMASH per-minute HR ({mmash['minutes']} minutes): "
              f"current {mmash['current']:.1%} -> alpha-discounted {mmash['alpha_discounted']:.1%} "
              f"(nominal 95%)")
    else:
        print(f"\nMMASH check skipped: {mmash}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
