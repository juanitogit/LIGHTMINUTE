"""Tiny deterministic crew simulator used by the validation harness.
Everything it produces is SYNTHETIC. Ground truth never reaches the engine."""
from __future__ import annotations

import random

# between-person (mean, sd), within-person sd, syndrome sign
INDICATORS = {
    "rest_hr":  {"between": (60.0, 6.0),  "within": 2.0,  "sign": +1},
    "temp_c":   {"between": (36.6, 0.2),  "within": 0.15, "sign": +1},
    "sleep_h":  {"between": (7.0, 0.5),   "within": 0.6,  "sign": -1},
    "pvt_ms":   {"between": (280.0, 20.0), "within": 15.0, "sign": +1},
}


def pop_stats(name: str) -> tuple[float, float]:
    m, b = INDICATORS[name]["between"]
    w = INDICATORS[name]["within"]
    return m, (b ** 2 + w ** 2) ** 0.5


def make_series(seed: int, n_days: int = 30, onset: int | None = None,
                effect: float = 0.0, ramp_days: int = 3, ind=INDICATORS) -> dict[str, list[float]]:
    """effect = shift in units of each indicator's WITHIN-person sd (syndrome direction)."""
    rnd = random.Random(seed)
    out = {}
    for name, cfg in ind.items():
        base = rnd.gauss(*cfg["between"])
        xs = []
        for d in range(n_days):
            shift = 0.0
            if onset is not None and d >= onset:
                shift = effect * cfg["within"] * cfg["sign"] * min(1.0, (d - onset + 1) / ramp_days)
            xs.append(base + shift + rnd.gauss(0, cfg["within"]))
        out[name] = xs
    return out
