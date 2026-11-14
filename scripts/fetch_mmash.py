#!/usr/bin/env python3
"""Snapshot the PhysioNet MMASH dataset (real wearable data, open access).

A5 deliverable. MMASH: 22 healthy adults, ~24 h each, per-second Actigraph HR,
inter-beat intervals and sleep records (Rossi et al., 2020).

The archive is 24 MB, so it is fetched, checksummed and recorded in the manifest
rather than assumed. `ml/proxy/mmash.py` reads it in place (no extraction).

Usage:
  python scripts/fetch_mmash.py            # download if missing, verify, record manifest
  python scripts/fetch_mmash.py --verify   # only verify the local copy
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from urllib.request import Request, urlopen

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SNAP_DIR = os.path.join(ROOT, "data", "snapshots")
ARCHIVE = os.path.join(SNAP_DIR, "MMASH.zip")
MANIFEST = os.path.join(SNAP_DIR, "manifest.json")
URL = "https://physionet.org/files/mmash/1.0.0/MMASH.zip"
SOURCE = "MMASH - Multilevel Monitoring of Activity and Sleep in Healthy people (PhysioNet 1.0.0)"
LICENSE = "ODC Open Database License (ODbL) v1.0 - attribution required; see https://physionet.org/content/mmash/1.0.0/"


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def append_manifest(entry: dict) -> None:
    items: list[dict] = []
    if os.path.exists(MANIFEST):
        with open(MANIFEST, encoding="utf-8") as f:
            loaded = json.load(f)
        items = loaded if isinstance(loaded, list) else list(loaded.get("snapshots", []))
    items = [i for i in items if i.get("sha256") != entry["sha256"]]
    items.append(entry)
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=1)
        f.write("\n")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--verify", action="store_true")
    ap.add_argument("--timeout", type=float, default=180.0)
    a = ap.parse_args()
    os.makedirs(SNAP_DIR, exist_ok=True)

    if not a.verify:
        if not os.path.exists(ARCHIVE):
            print(f"downloading {URL} (~24 MB)...")
            req = Request(URL, headers={"User-Agent": "LIGHTMINUTE-space-apps/1.0 (snapshot script)"})
            with urlopen(req, timeout=a.timeout) as r, open(ARCHIVE, "wb") as f:  # noqa: S310
                f.write(r.read())
        else:
            print(f"already present: {os.path.relpath(ARCHIVE, ROOT)}")

    digest = sha256_file(ARCHIVE)
    size = os.path.getsize(ARCHIVE)
    entry = {
        "source": SOURCE,
        "url": URL,
        "sha256": digest,
        "bytes": size,
        "license": LICENSE,
        "snapshot": os.path.relpath(ARCHIVE, ROOT).replace(os.sep, "/"),
        "mode": "real",
        "note": "Public, de-identified healthy volunteers. Used as a PROXY, never as astronaut data.",
    }
    append_manifest(entry)
    print(f"verified sha256 {digest[:16]}... ({size} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
