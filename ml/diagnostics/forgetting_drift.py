#!/usr/bin/env python3
"""Diagnostic: the baseline model used to become over-confident as updates accumulate.

Found while running the real-data proxy check (MMASH gave 21.6% coverage of a
nominal 95% interval, and a flat synthetic series reproduced the collapse once
we moved from daily to hourly updates).

Cause, in `tether_engine/bayes/nof1.py::update` (the old rule, kept here as
`LegacyUndiscountedBaseline`):
    kappa <- lam*kappa + 1
    beta  <- lam*beta  + ...
    alpha <- alpha + 0.5          <-- NOT discounted
With lambda < 1 the two first moments forget old evidence, but alpha kept
growing by 0.5 per update, so df = 2*alpha grew without bound while the scale
sqrt(beta*(kappa+1)/(alpha*kappa)) shrank. The Student-t became a very narrow
Gaussian: exactly the "honest tails with few observations" property the model is
documented to have, lost after a few hundred updates.

Fixed on 2026-11-14 in `nof1.py` (A1's file, patch validated here first):

    alpha <- alpha0 + (alpha - alpha0)*lam + 0.5

which has the fixed point alpha0 + 0.5/(1-lam) -> df ~ 50 with the defaults, so
the interval width no longer depends on how long the stream has been running.

This script keeps the old update rule around so the defect stays reproducible and
the fix stays measured; it rewrites `results.json` and fails loudly if the fixed
model stops covering.

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
NOMINAL = 0.95


class LegacyUndiscountedBaseline(BaselineModel):
    """The model as it was before the fix: alpha is never discounted."""

    def update(self, x: float) -> None:
        p, lam = self.post, self.lam
        k0, b0 = p.kappa * lam, p.beta * lam
        k1 = k0 + 1.0
        self.post = NIG(mu0=(k0 * p.mu0 + x) / k1, kappa=k1,
                        alpha=p.alpha + 0.5,
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


def factories() -> dict:
    # Same weak adult-HR prior as ml/proxy/mmash.py, so the real-data numbers match.
    return {
        "legacy": lambda: LegacyUndiscountedBaseline(70.0, 14.0),
        "fixed": lambda: BaselineModel(70.0, 14.0),
    }


def mmash_comparison(factories: dict):
    """Same comparison on the real MMASH per-minute HR series, if the archive exists."""
    try:
        import zipfile

        from mmash import minute_hr, users  # type: ignore

        archive = os.path.join(ROOT, "data", "snapshots", "MMASH.zip")
        if not os.path.exists(archive):
            return {"skipped": "data/snapshots/MMASH.zip not present"}
        z = zipfile.ZipFile(archive)
        totals = {k: [0, 0] for k in factories}
        for u in users(z):
            series = minute_hr(z, u)
            if len(series) < WARM + 30:
                continue
            for key, factory in factories.items():
                m = factory()
                c = n = 0
                for i, (_, _, hr, _) in enumerate(series):
                    lo, hi = m.surprise(hr)["ci95"]
                    if i >= WARM:
                        c += int(lo <= hr <= hi)
                        n += 1
                    m.robust_update(hr)
                totals[key][0] += c
                totals[key][1] += n
        out = {k: round(c / n, 3) for k, (c, n) in totals.items() if n}
        out["minutes"] = totals["fixed"][1]
        return out
    except Exception as exc:  # pragma: no cover - diagnostics must not crash the suite
        return {"error": f"{type(exc).__name__}: {exc}"}


def main() -> int:
    f = factories()
    rows = []
    for updates in (23, 200, 500, 2000):
        row = {"updates": updates}
        for name, factory in f.items():
            cov, df = coverage_stream(updates, factory)
            row[name] = {"coverage_95": round(cov, 3), "df_after": round(df, 1)}
        rows.append(row)

    mmash = mmash_comparison(f)

    payload = {"nominal_coverage": NOMINAL, "flat_series": rows, "mmash_minute_hr": mmash,
               "fix": "alpha <- alpha0 + (alpha - alpha0)*lam + 0.5 (applied 2026-11-14)",
               "note": "Coverage of the 95% predictive interval; flat series are N(60,2). "
                       "'legacy' is the old undiscounted-alpha update, kept to reproduce the defect."}
    with open(os.path.join(HERE, "results.json"), "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=1)

    print(f"{'updates':>8} | {'coverage legacy':>15} | {'df after':>9} | "
          f"{'coverage fixed':>15} | {'df after':>9}")
    for r in rows:
        print(f"{r['updates']:>8} | {r['legacy']['coverage_95']:15.0%} | {r['legacy']['df_after']:9.1f} | "
              f"{r['fixed']['coverage_95']:15.0%} | {r['fixed']['df_after']:9.1f}")
    if mmash and "error" not in mmash and "skipped" not in mmash:
        print(f"\nMMASH per-minute HR ({mmash['minutes']} minutes): "
              f"legacy {mmash['legacy']:.1%} -> fixed {mmash['fixed']:.1%} (nominal {NOMINAL:.0%})")
    else:
        print(f"\nMMASH check skipped: {mmash}")

    # The fix has to hold for arbitrarily long streams, not just look better.
    long_run = next(r for r in rows if r["updates"] == 2000)["fixed"]["coverage_95"]
    legacy_long = next(r for r in rows if r["updates"] == 2000)["legacy"]["coverage_95"]
    ok = long_run >= 0.90 and legacy_long <= 0.50
    print(f"\n2000 updates: fixed {long_run:.0%} vs legacy {legacy_long:.0%} "
          f"(nominal {NOMINAL:.0%}) -> {'PASS' if ok else 'FAIL'}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
