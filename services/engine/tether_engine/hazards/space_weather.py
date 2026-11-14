"""Space-weather and radiation helpers.

NOAA S-scale (solar radiation storms) uses the >=10 MeV integral proton flux:
S1>=10, S2>=100, S3>=1e3, S4>=1e4, S5>=1e5 pfu. (Verify against swpc.noaa.gov.)
No dose LIMIT is hard-coded: the caller passes it from a cited KB entry.
"""
from __future__ import annotations

S_LEVELS = [(1e5, 5), (1e4, 4), (1e3, 3), (1e2, 2), (10.0, 1)]


def noaa_s_scale(flux_pfu_ge10mev: float) -> int:
    for thr, lvl in S_LEVELS:
        if flux_pfu_ge10mev >= thr:
            return lvl
    return 0


def latest_flux(rows: list[dict], energy_contains: str = "10 MeV") -> float | None:
    """Pick the newest flux for the >=10 MeV channel from a NOAA GOES JSON list.
    Row format ('time_tag','energy','flux') is UNVERIFIED -- check a real sample."""
    sel = [r for r in rows if energy_contains in str(r.get("energy", ""))]
    if not sel:
        return None
    return float(max(sel, key=lambda r: r["time_tag"])["flux"])


def dose_budget(cumulative_msv: float, limit_msv: float,
                days_elapsed: float, days_total: float) -> dict:
    used = cumulative_msv / limit_msv
    projected = cumulative_msv / max(days_elapsed, 1e-9) * days_total
    return {"fraction_used": used, "projected_msv": projected,
            "projected_fraction": projected / limit_msv}
