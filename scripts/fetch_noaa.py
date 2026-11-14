#!/usr/bin/env python3
"""Snapshot NOAA SWPC GOES integral proton flux and derive the radiation panel.

A5 deliverable. Why a snapshot and not a live fetch in the app:
hackathon networks fail, and a checksummed snapshot is what makes a claim
reproducible. The app reads `apps/crew-tablet/public/data/radiation.json`;
this script is the only thing that talks to the network.

Usage:
  python scripts/fetch_noaa.py                 # fetch, snapshot, derive panel
  python scripts/fetch_noaa.py --offline       # derive from the newest local snapshot
  python scripts/fetch_noaa.py --timeout 15    # tighter network budget

Outputs:
  data/snapshots/goes-protons-<retrieved_at>.json   raw payload, untouched
  data/snapshots/manifest.json                      url, retrieved_at, sha256, rows, license
  apps/crew-tablet/public/data/radiation.json       UI panel (timeline + NOAA S-scale)

If the network is unavailable, the panel is generated as a clearly labelled
SYNTHETIC replay with the same shape. Never silently: `synthetic: true` and a
`why` field explain it, and the manifest records the fallback.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import sys
from collections import Counter
from urllib.request import Request, urlopen

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(ROOT, "services", "engine"))

from tether_engine.hazards.space_weather import noaa_s_scale  # noqa: E402

URL = "https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json"
CHANNEL = ">=10 MeV"
SOURCE = "NOAA SWPC GOES primary integral protons (1-day JSON)"
LICENSE = "Public domain (U.S. Government work; NOAA SWPC open data)"
SNAP_DIR = os.path.join(ROOT, "data", "snapshots")
MANIFEST = os.path.join(SNAP_DIR, "manifest.json")
PANEL = os.path.join(ROOT, "apps", "crew-tablet", "public", "data", "radiation.json")


def _utc_now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0)


def _iso(t: dt.datetime) -> str:
    return t.strftime("%Y-%m-%dT%H:%M:%SZ")


def fetch(url: str, timeout: float) -> bytes:
    req = Request(url, headers={"User-Agent": "LIGHTMINUTE-space-apps/1.0 (snapshot script)"})
    with urlopen(req, timeout=timeout) as r:  # noqa: S310 - fixed https URL
        return r.read()


def parse_channel(raw: bytes, channel: str = CHANNEL) -> tuple[int | None, list[dict], int]:
    """Return (satellite, points, total_rows). Points are time-ordered and use
    one satellite only: mixing GOES-18 and GOES-19 would look like a real change."""
    rows = json.loads(raw)
    if not isinstance(rows, list) or not rows:
        raise ValueError("unexpected NOAA payload: expected a non-empty list")
    for r in rows[:5]:
        missing = {"time_tag", "flux", "energy"} - set(r)
        if missing:
            raise ValueError(f"unexpected NOAA row keys, missing {sorted(missing)}: {r}")
    sel = [r for r in rows if str(r.get("energy", "")).strip() == channel]
    if not sel:
        energies = sorted({str(r.get("energy")) for r in rows})
        raise ValueError(f"channel {channel!r} not found in {energies}")
    sat = Counter(r.get("satellite") for r in sel).most_common(1)[0][0]
    sel = [r for r in sel if r.get("satellite") == sat]
    sel.sort(key=lambda r: str(r["time_tag"]))
    points = [
        {
            "ts": str(r["time_tag"]),
            "flux": round(float(r["flux"]), 4),
            "s_scale": noaa_s_scale(float(r["flux"])),
        }
        for r in sel
    ]
    return sat, points, len(rows)


def synthetic_points() -> list[dict]:
    """Deterministic SYNTHETIC S1-class replay (same shape as the real panel).
    Used only when the network is unavailable, and always labelled."""
    start = dt.datetime(2026, 11, 1, tzinfo=dt.timezone.utc)
    peaks = {"h": 9.0, "sigma": 2.2}
    points = []
    for hour in range(24):
        bump = 40.0 * pow(2.718281828, -0.5 * ((hour - peaks["h"]) / peaks["sigma"]) ** 2)
        flux = 0.2 + bump  # pfu, >=10 MeV
        points.append(
            {
                "ts": _iso(start + dt.timedelta(hours=hour)),
                "flux": round(flux, 4),
                "s_scale": noaa_s_scale(flux),
            }
        )
    return points


def build_panel(points: list[dict], *, retrieved_at: str, satellite: int | None,
                mode: str, why: str | None = None) -> dict:
    peak = max(points, key=lambda p: p["flux"])
    current = points[-1]
    return {
        "synthetic": mode != "real",
        "label": "real-public" if mode == "real" else "synthetic",
        "source": SOURCE,
        "source_url": URL,
        "retrieved_at": retrieved_at,
        "license": LICENSE,
        "channel": CHANNEL,
        "satellite": satellite,
        "units": "pfu (protons cm^-2 s^-1 sr^-1)",
        "points": points,
        "current": current,
        "peak": peak,
        "s_scale_now": current["s_scale"],
        "s_scale_max": max(p["s_scale"] for p in points),
        "thresholds_pfu": {"S1": 10, "S2": 100, "S3": 1000, "S4": 10000, "S5": 100000},
        "why": why or "Fetched live from NOAA SWPC and checksummed in data/snapshots/.",
        "note": (
            "NOAA S-scale applied to the >=10 MeV integral proton flux. "
            "Context only: it modulates wording and priors, it never raises an "
            "alert by itself. No dose limit is hard-coded here."
        ),
    }


def write_snapshot(raw: bytes, retrieved_at: str) -> str:
    os.makedirs(SNAP_DIR, exist_ok=True)
    name = f"goes-protons-{retrieved_at.replace(':', '').replace('-', '')}.json"
    path = os.path.join(SNAP_DIR, name)
    with open(path, "wb") as f:
        f.write(raw)
    return path


def append_manifest(entry: dict) -> None:
    os.makedirs(SNAP_DIR, exist_ok=True)
    items: list[dict] = []
    if os.path.exists(MANIFEST):
        with open(MANIFEST, encoding="utf-8") as f:
            loaded = json.load(f)
        items = loaded if isinstance(loaded, list) else loaded.get("snapshots", [])
    items = [i for i in items if i.get("sha256") != entry["sha256"]]
    items.append(entry)
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=1)
        f.write("\n")


def newest_snapshot() -> str | None:
    if not os.path.isdir(SNAP_DIR):
        return None
    files = sorted(
        (
            os.path.join(SNAP_DIR, n)
            for n in os.listdir(SNAP_DIR)
            if n.startswith("goes-protons-") and n.endswith(".json")
        ),
        key=os.path.getmtime,
    )
    return files[-1] if files else None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true", help="derive the panel from the newest local snapshot")
    ap.add_argument("--timeout", type=float, default=30.0)
    ap.add_argument("--out", default=PANEL)
    a = ap.parse_args()

    retrieved_at = _iso(_utc_now())
    if a.offline:
        path = newest_snapshot()
        if not path:
            print("no snapshot available for --offline", file=sys.stderr)
            return 2
        with open(path, "rb") as f:
            raw = f.read()
        print(f"offline: using {os.path.relpath(path, ROOT)}")
        sat, points, total = parse_channel(raw)
        mode, why = "real", "Derived from the local NOAA snapshot; no network used."
    else:
        try:
            raw = fetch(URL, a.timeout)
            sat, points, total = parse_channel(raw)
            path = write_snapshot(raw, retrieved_at)
            mode, why = "real", "Fetched live from NOAA SWPC and checksummed in data/snapshots/."
            print(f"snapshot: {os.path.relpath(path, ROOT)} ({len(raw)} bytes, {total} rows)")
        except Exception as exc:  # network or schema failure: degrade loudly, never fake it
            print(f"WARNING: NOAA fetch failed ({type(exc).__name__}: {exc})", file=sys.stderr)
            points, sat, total = synthetic_points(), None, len(synthetic_points())
            path = ""
            mode = "synthetic-fallback"
            why = f"NOAA fetch failed at {retrieved_at} ({type(exc).__name__}); synthetic S1 replay shown."

    panel = build_panel(points, retrieved_at=retrieved_at, satellite=sat, mode=mode, why=why)
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(panel, f, indent=1)
        f.write("\n")

    if path:
        with open(path, "rb") as f:
            digest = hashlib.sha256(f.read()).hexdigest()
        append_manifest(
            {
                "source": SOURCE,
                "url": URL,
                "retrieved_at": retrieved_at,
                "sha256": digest,
                "rows_raw": total,
                "rows_used": len(points),
                "channel": CHANNEL,
                "satellite": sat,
                "license": LICENSE,
                "snapshot": os.path.relpath(path, ROOT).replace(os.sep, "/"),
                "mode": mode,
            }
        )

    print(
        f"panel: {os.path.relpath(a.out, ROOT)} | label={panel['label']} | "
        f"points={len(points)} | S-max={panel['s_scale_max']} | peak={panel['peak']['flux']} pfu"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
