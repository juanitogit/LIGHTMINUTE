#!/usr/bin/env python3
"""Snapshot NASA DONKI space-weather events and derive the tablet panel.

Why a snapshot: the public site is static and must work offline. The browser
reads `apps/crew-tablet/public/data/space-weather.json`; this script is the only
thing that talks to NASA.

NASA DONKI is an open, keyless CCMC service. No api.nasa.gov key is required or
sent. If `NASA_API_KEY` exists in the environment (or in a git-ignored `.env`),
it is never printed and never placed in a URL by this script.

Official documentation (read 2026-11-14):
  https://ccmc.gsfc.nasa.gov/DONKI/api/
  https://ccmc.gsfc.nasa.gov/tools/DONKI/

The service rejects date ranges over 60 days, so the 90-day window is split into
60-day chunks and merged. Rows are stored as returned; only the compact derived
file drops fields.

Usage:
  python scripts/fetch_nasa.py
  python scripts/fetch_nasa.py --offline
  python scripts/fetch_nasa.py --end 2026-11-14 --window-days 90
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SNAP_DIR = os.path.join(ROOT, "data", "snapshots")
MANIFEST = os.path.join(SNAP_DIR, "manifest.json")
OUT = os.path.join(ROOT, "apps", "crew-tablet", "public", "data", "space-weather.json")
RADIATION = os.path.join(ROOT, "apps", "crew-tablet", "public", "data", "radiation.json")

DOC_URL = "https://ccmc.gsfc.nasa.gov/DONKI/api/"
REFERENCE_URL = "https://ccmc.gsfc.nasa.gov/tools/DONKI/"
ENDPOINT = "https://ccmc.gsfc.nasa.gov/DONKI/WS/get/{type}"
LICENSE = (
    "NASA open data - CCMC DONKI. NASA does not endorse this project. "
    "See https://ccmc.gsfc.nasa.gov/data-policy"
)
USER_AGENT = "LIGHTMINUTE-space-apps/1.0 (build-time snapshot; contact: project repo)"
MAX_WINDOW_DAYS = 60  # enforced by DONKI itself: "Date range cannot exceed 60 days"
MAX_ATTEMPTS = 3

TYPES: dict[str, dict[str, str]] = {
    "SEP": {"id": "sepID", "time": "eventTime"},
    "FLR": {"id": "flrID", "time": "beginTime"},
    "CME": {"id": "activityID", "time": "startTime"},
    "GST": {"id": "gstID", "time": "startTime"},
}


def _utc_now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0)


def _iso(t: dt.datetime) -> str:
    return t.strftime("%Y-%m-%dT%H:%M:%SZ")


def _load_dotenv() -> None:
    """Tiny .env reader. The key is loaded only so local tooling can see it;
    DONKI calls never include it and nothing prints its value."""
    path = os.path.join(ROOT, ".env")
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key == "NASA_API_KEY" and key not in os.environ:
                os.environ[key] = value


def _chunks(start: dt.date, end: dt.date) -> list[tuple[dt.date, dt.date]]:
    out: list[tuple[dt.date, dt.date]] = []
    cursor = start
    while cursor <= end:
        stop = min(cursor + dt.timedelta(days=MAX_WINDOW_DAYS - 1), end)
        out.append((cursor, stop))
        cursor = stop + dt.timedelta(days=1)
    return out


def _request_json(url: str, timeout: float) -> tuple[list[dict[str, Any]], dict[str, str], int]:
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    for attempt in range(1, MAX_ATTEMPTS + 1):
        request = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:  # noqa: S310 - fixed https URL
                raw = response.read()
                payload = json.loads(raw)
                if not isinstance(payload, list):
                    raise ValueError("unexpected DONKI payload: expected a JSON array")
                rate = {
                    key: value
                    for key, value in response.headers.items()
                    if key.lower().startswith("x-ratelimit")
                }
                return payload, rate, response.status
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", "replace")[:300]
            retryable = exc.code == 429 or 500 <= exc.code < 600
            if retryable and attempt < MAX_ATTEMPTS:
                wait = float(exc.headers.get("Retry-After") or 2 ** attempt)
                print(f"  retry {attempt}/{MAX_ATTEMPTS - 1}: HTTP {exc.code}, waiting {wait:.0f}s")
                time.sleep(min(wait, 30.0))
                continue
            raise RuntimeError(f"HTTP {exc.code}: {body}") from exc
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            if attempt < MAX_ATTEMPTS:
                wait = 2 ** attempt
                print(f"  retry {attempt}/{MAX_ATTEMPTS - 1}: {type(exc).__name__}, waiting {wait}s")
                time.sleep(wait)
                continue
            raise RuntimeError(f"{type(exc).__name__}: {exc}") from exc
    raise RuntimeError("request failed after retries")


def _merge(rows: list[dict[str, Any]], type_name: str) -> list[dict[str, Any]]:
    id_key = TYPES[type_name]["id"]
    time_key = TYPES[type_name]["time"]
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        ident = str(row.get(id_key) or "")
        if ident and ident in seen:
            continue
        if ident:
            seen.add(ident)
        unique.append(row)
    unique.sort(key=lambda row: str(row.get(time_key) or ""))
    return unique


def _fetch_type(
    type_name: str,
    start: dt.date,
    end: dt.date,
    timeout: float,
    sleep_s: float,
) -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    request_urls: list[str] = []
    rate_limits: dict[str, str] = {}
    retrieved_at = ""
    chunks = _chunks(start, end)
    for index, (chunk_start, chunk_end) in enumerate(chunks):
        query = urllib.parse.urlencode(
            {"startDate": chunk_start.isoformat(), "endDate": chunk_end.isoformat()}
        )
        url = f"{ENDPOINT.format(type=type_name)}?{query}"
        print(f"  GET {url}")
        payload, rate, status = _request_json(url, timeout)
        rows.extend(payload)
        request_urls.append(url)
        rate_limits.update(rate)
        retrieved_at = _iso(_utc_now())
        print(f"    HTTP {status}, {len(payload)} rows")
        if index < len(chunks) - 1:
            time.sleep(sleep_s)

    merged = _merge(rows, type_name)
    raw = json.dumps(merged, ensure_ascii=False, indent=1).encode("utf-8") + b"\n"
    os.makedirs(SNAP_DIR, exist_ok=True)
    path = os.path.join(SNAP_DIR, f"nasa-donki-{type_name.lower()}.json")
    with open(path, "wb") as f:
        f.write(raw)
    digest = hashlib.sha256(raw).hexdigest()
    print(f"  snapshot {os.path.relpath(path, ROOT)} ({len(raw)} bytes, {len(merged)} rows)")
    return {
        "id": f"nasa-donki-{type_name.lower()}",
        "source": f"NASA DONKI {type_name} events (CCMC M2M_CATALOG)",
        "type": type_name,
        "endpoint": ENDPOINT.format(type=type_name),
        "request_urls": request_urls,
        "doc_url": DOC_URL,
        "retrieved_at": retrieved_at,
        "sha256": digest,
        "rows_raw": len(merged),
        "license": LICENSE,
        "snapshot": os.path.relpath(path, ROOT).replace(os.sep, "/"),
        "mode": "real",
        "window": {"start": start.isoformat(), "end": end.isoformat()},
        "api_key_sent": False,
        "rate_limit_headers": rate_limits,
        "note": "DONKI is keyless; no api_key parameter is required or sent.",
        "_rows": merged,
    }


def _load_manifest() -> list[dict[str, Any]]:
    if not os.path.exists(MANIFEST):
        return []
    with open(MANIFEST, encoding="utf-8") as f:
        loaded = json.load(f)
    if isinstance(loaded, list):
        return [item for item in loaded if isinstance(item, dict)]
    if isinstance(loaded, dict) and isinstance(loaded.get("snapshots"), list):
        return [item for item in loaded["snapshots"] if isinstance(item, dict)]
    return []


def _upsert_manifest(entries: list[dict[str, Any]]) -> None:
    stored = [
        {key: value for key, value in item.items() if not key.startswith("_")}
        for item in _load_manifest()
    ]
    ids = {item.get("id") for item in entries if item.get("id")}
    stored = [item for item in stored if item.get("id") not in ids]
    stored.extend(
        {key: value for key, value in item.items() if not key.startswith("_")}
        for item in entries
    )
    os.makedirs(SNAP_DIR, exist_ok=True)
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(stored, f, indent=1)
        f.write("\n")


def _offline_entry(type_name: str, manifest: list[dict[str, Any]]) -> dict[str, Any]:
    entry = next(
        (
            item
            for item in manifest
            if item.get("id") == f"nasa-donki-{type_name.lower()}"
            and item.get("mode") == "real"
            and item.get("snapshot")
        ),
        None,
    )
    if not entry:
        raise RuntimeError("no completed DONKI snapshot in manifest; run without --offline")
    path = os.path.join(ROOT, str(entry["snapshot"]).replace("/", os.sep))
    with open(path, encoding="utf-8") as f:
        rows = json.load(f)
    if not isinstance(rows, list):
        raise ValueError(f"{entry['snapshot']} is not a JSON array")
    return {**entry, "_rows": rows}


def _number(value: Any) -> float | None:
    return float(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else None


def _safe_link(value: Any) -> str | None:
    return value if isinstance(value, str) and value.startswith("https://") else None


def _compact_event(type_name: str, row: dict[str, Any]) -> dict[str, Any] | None:
    event_id = row.get(TYPES[type_name]["id"])
    event_time = row.get(TYPES[type_name]["time"])
    if not isinstance(event_id, str) or not isinstance(event_time, str):
        return None

    event: dict[str, Any] = {
        "id": event_id,
        "type": type_name,
        "time": event_time,
        "catalog": row.get("catalog") if isinstance(row.get("catalog"), str) else None,
        "link": _safe_link(row.get("link")),
    }

    if type_name == "FLR":
        event.update(
            {
                "peak": row.get("peakTime") if isinstance(row.get("peakTime"), str) else None,
                "end": row.get("endTime") if isinstance(row.get("endTime"), str) else None,
                "class": row.get("classType") if isinstance(row.get("classType"), str) else None,
                "location": row.get("sourceLocation") if isinstance(row.get("sourceLocation"), str) else None,
            }
        )
    elif type_name == "SEP":
        instruments = row.get("instruments")
        event["instruments"] = [
            item.get("displayName")
            for item in instruments
            if isinstance(item, dict) and isinstance(item.get("displayName"), str)
        ] if isinstance(instruments, list) else []
        event["location"] = row.get("sourceLocation") if isinstance(row.get("sourceLocation"), str) else None
    elif type_name == "CME":
        analyses = row.get("cmeAnalyses")
        analyses = [item for item in analyses if isinstance(item, dict)] if isinstance(analyses, list) else []
        accurate = next((item for item in analyses if item.get("isMostAccurate") is True), None)
        if accurate is None and analyses:
            accurate = analyses[0]
        event["speed_km_s"] = _number(accurate.get("speed")) if accurate else None
        event["half_angle_deg"] = _number(accurate.get("halfAngle")) if accurate else None
        event["location"] = row.get("sourceLocation") if isinstance(row.get("sourceLocation"), str) else None
    elif type_name == "GST":
        kp = row.get("allKpIndex")
        values = [
            _number(item.get("kpIndex"))
            for item in kp
            if isinstance(item, dict)
        ] if isinstance(kp, list) else []
        values = [value for value in values if value is not None]
        event["max_kp"] = max(values) if values else None

    return event


def _noaa_context() -> dict[str, Any]:
    if not os.path.exists(RADIATION):
        return {"status": "unavailable", "reason": "radiation.json is not present"}
    try:
        with open(RADIATION, encoding="utf-8") as f:
            radiation = json.load(f)
    except (OSError, json.JSONDecodeError) as exc:
        return {"status": "unavailable", "reason": f"radiation.json unreadable ({type(exc).__name__})"}
    points = radiation.get("points") if isinstance(radiation, dict) else None
    if not isinstance(radiation, dict) or radiation.get("synthetic") is not False or not isinstance(points, list) or not points:
        return {"status": "unavailable", "reason": "no real-public NOAA proton series is present"}
    first = points[0] if isinstance(points[0], dict) else {}
    last = points[-1] if isinstance(points[-1], dict) else {}
    return {
        "status": "ok",
        "source": radiation.get("source"),
        "source_url": radiation.get("source_url"),
        "retrieved_at": radiation.get("retrieved_at"),
        "window": {"start": first.get("ts"), "end": last.get("ts")},
        "s_scale_max": radiation.get("s_scale_max"),
        "s_scale_now": radiation.get("s_scale_now"),
        "note": (
            "NOAA GOES >=10 MeV proton flux classification, shown separately. "
            "It covers only the NOAA snapshot window and is not individual dose."
        ),
    }


def build_derived(
    entries: list[dict[str, Any]],
    start: dt.date,
    end: dt.date,
    generated_at: str,
) -> dict[str, Any]:
    events: list[dict[str, Any]] = []
    sources: list[dict[str, Any]] = []
    failures: list[dict[str, Any]] = []

    for entry in entries:
        sources.append(
            {
                key: value
                for key, value in entry.items()
                if key
                in {
                    "id",
                    "source",
                    "type",
                    "endpoint",
                    "doc_url",
                    "retrieved_at",
                    "sha256",
                    "rows_raw",
                    "license",
                    "snapshot",
                    "mode",
                    "window",
                    "api_key_sent",
                    "rate_limit_headers",
                    "note",
                }
            }
        )
        if entry.get("mode") != "real" or not isinstance(entry.get("_rows"), list):
            failures.append(
                {
                    "type": entry.get("type"),
                    "status": "failed",
                    "retrieved_at": entry.get("retrieved_at"),
                    "error": entry.get("error", "snapshot unavailable"),
                }
            )
            continue
        for row in entry["_rows"]:
            if isinstance(row, dict):
                compact = _compact_event(str(entry.get("type")), row)
                if compact:
                    events.append(compact)

    events.sort(key=lambda event: str(event.get("time") or ""), reverse=True)
    counts = {type_name: sum(1 for event in events if event["type"] == type_name) for type_name in TYPES}
    good = sum(1 for entry in entries if entry.get("mode") == "real")
    status = "ok" if good == len(TYPES) else "partial" if good else "unavailable"

    limitations = [
        "Solar particle and flare events are space-weather context, not individual dose.",
        "DONKI is an event database, not a forecast; these records are space-weather context only.",
        "SEP records in this API response carry no peak flux or class, so none is inferred.",
        "CME speed is the most-accurate analysis value when DONKI provides one; it is not a dose estimate.",
        "The NOAA S-scale is shown only for the real GOES proton snapshot window; no S-scale is inferred for other event dates.",
        "Event classes, times and links are reproduced as published by DONKI; no value is recalculated here.",
    ]

    return {
        "schema_version": 1,
        "generated_at": generated_at,
        "label": "real-public",
        "source": "NASA DONKI (CCMC) space-weather events",
        "doc_url": DOC_URL,
        "reference_url": REFERENCE_URL,
        "license": LICENSE,
        "window": {"start": start.isoformat(), "end": end.isoformat()},
        "status": status,
        "sources": sources,
        "counts": counts,
        "events": events,
        "noaa_context": _noaa_context(),
        "failures": failures,
        "limitations": limitations,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--offline", action="store_true", help="derive from local snapshots; no network")
    parser.add_argument("--end", default=_utc_now().date().isoformat(), help="window end date (UTC, YYYY-MM-DD)")
    parser.add_argument("--window-days", type=int, default=90, help="window length ending at --end")
    parser.add_argument("--timeout", type=float, default=60.0)
    parser.add_argument("--sleep", type=float, default=1.5, help="polite delay between requests (seconds)")
    parser.add_argument("--out", default=OUT)
    args = parser.parse_args()

    _load_dotenv()
    key_state = "present (not sent; DONKI is keyless)" if os.environ.get("NASA_API_KEY") else "absent (DONKI is keyless)"
    print(f"NASA_API_KEY: {key_state}")

    end = dt.date.fromisoformat(args.end)
    start = end - dt.timedelta(days=max(1, args.window_days))
    print(f"window: {start.isoformat()}..{end.isoformat()} (UTC, {args.window_days}-day difference)")

    generated_at = _iso(_utc_now())
    entries: list[dict[str, Any]] = []
    if args.offline:
        manifest = _load_manifest()
        for type_name in TYPES:
            try:
                entries.append(_offline_entry(type_name, manifest))
                print(f"{type_name}: offline snapshot loaded")
            except Exception as exc:
                entries.append(
                    {
                        "id": f"nasa-donki-{type_name.lower()}",
                        "type": type_name,
                        "endpoint": ENDPOINT.format(type=type_name),
                        "retrieved_at": generated_at,
                        "mode": "failed",
                        "error": str(exc)[:300],
                        "license": LICENSE,
                        "api_key_sent": False,
                    }
                )
    else:
        for type_name in TYPES:
            print(f"{type_name}:")
            try:
                entries.append(_fetch_type(type_name, start, end, args.timeout, args.sleep))
            except Exception as exc:
                print(f"  FAILED: {type(exc).__name__}: {exc}", file=sys.stderr)
                entries.append(
                    {
                        "id": f"nasa-donki-{type_name.lower()}",
                        "source": f"NASA DONKI {type_name} events (CCMC M2M_CATALOG)",
                        "type": type_name,
                        "endpoint": ENDPOINT.format(type=type_name),
                        "doc_url": DOC_URL,
                        "retrieved_at": generated_at,
                        "mode": "failed",
                        "error": str(exc)[:300],
                        "rows_raw": 0,
                        "license": LICENSE,
                        "snapshot": None,
                        "api_key_sent": False,
                        "note": "DONKI is keyless; no api_key parameter is required or sent.",
                    }
                )
            time.sleep(args.sleep)
        _upsert_manifest(entries)

    derived = build_derived(entries, start, end, generated_at)
    payload = json.dumps(derived, ensure_ascii=False, separators=(",", ":")).encode("utf-8") + b"\n"
    if len(payload) > 200 * 1024:
        print(f"ERROR: derived file is {len(payload)} bytes (limit 200 KiB)", file=sys.stderr)
        return 2
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "wb") as f:
        f.write(payload)

    print(
        f"panel: {os.path.relpath(args.out, ROOT).replace(os.sep, '/')} | "
        f"label={derived['label']} | status={derived['status']} | "
        f"events={len(derived['events'])} | bytes={len(payload)} | "
        f"counts={derived['counts']}"
    )
    if derived["failures"]:
        print(f"failures recorded: {derived['failures']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
