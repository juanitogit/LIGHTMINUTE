"""Programmatic access to checksummed public-data snapshots (A5).

Rule from the space-data-ingest skill: the app reads snapshots committed with a
manifest (url, retrieved_at, sha256, license, row count); it never reads a live
URL except for an optional badge. A snapshot whose checksum or schema does not
match is rejected loudly -- a silent fallback would turn a broken download into
a fake finding.
"""
from __future__ import annotations

import hashlib
import json
import os

from ..hazards.space_weather import noaa_s_scale

MANIFEST_NAME = "manifest.json"


class SnapshotError(ValueError):
    """Raised when a snapshot is missing, unlisted or fails verification."""


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: str) -> str:
    with open(path, "rb") as f:
        return sha256_bytes(f.read())


def load_manifest(snapshot_path: str) -> list[dict]:
    manifest = os.path.join(os.path.dirname(os.path.abspath(snapshot_path)), MANIFEST_NAME)
    if not os.path.exists(manifest):
        raise SnapshotError(f"no manifest next to {snapshot_path}")
    with open(manifest, encoding="utf-8") as f:
        loaded = json.load(f)
    return loaded if isinstance(loaded, list) else list(loaded.get("snapshots", []))


def verify_snapshot(snapshot_path: str) -> dict:
    """Return the manifest entry for a snapshot, after checking sha256 and row count."""
    if not os.path.exists(snapshot_path):
        raise SnapshotError(f"snapshot not found: {snapshot_path}")
    actual = sha256_file(snapshot_path)
    for entry in load_manifest(snapshot_path):
        if entry.get("sha256") == actual:
            with open(snapshot_path, encoding="utf-8") as f:
                rows = json.load(f)
            if not isinstance(rows, list):
                raise SnapshotError(f"{snapshot_path}: expected a JSON list")
            expected = entry.get("rows_raw")
            if expected is not None and expected != len(rows):
                raise SnapshotError(
                    f"{snapshot_path}: {len(rows)} rows, manifest says {expected}"
                )
            return entry
    raise SnapshotError(f"{snapshot_path}: sha256 {actual[:12]}... is not in the manifest")


def load_radiation_payload(path: str) -> dict:
    """Load the UI panel produced by scripts/fetch_noaa.py and sanity-check it."""
    with open(path, encoding="utf-8") as f:
        payload = json.load(f)
    required = {"synthetic", "label", "points", "current", "peak", "s_scale_max"}
    missing = required - set(payload)
    if missing:
        raise SnapshotError(f"{path}: missing {sorted(missing)}")
    if payload["label"] not in {"real-public", "proxy", "synthetic"}:
        raise SnapshotError(f"{path}: label {payload['label']!r} is not allowed")
    if payload["synthetic"] and payload["label"] == "real-public":
        raise SnapshotError(f"{path}: synthetic panel labelled real-public")
    return payload


def radiation_points(rows: list[dict], channel: str = ">=10 MeV",
                     satellite: int | None = None) -> list[dict]:
    """Normalise NOAA GOES rows (verified format: time_tag, satellite, flux, energy)
    into time-ordered points with the NOAA S-scale applied."""
    sel = [r for r in rows if str(r.get("energy", "")).strip() == channel]
    if satellite is not None:
        sel = [r for r in sel if r.get("satellite") == satellite]
    if not sel:
        return []
    sat = satellite if satellite is not None else sel[0].get("satellite")
    sel = [r for r in sel if r.get("satellite") == sat]
    sel.sort(key=lambda r: str(r["time_tag"]))
    return [
        {
            "ts": str(r["time_tag"]),
            "flux": round(float(r["flux"]), 4),
            "s_scale": noaa_s_scale(float(r["flux"])),
        }
        for r in sel
    ]
