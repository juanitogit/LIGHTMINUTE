"""Guards for the build-time NASA DONKI snapshot and its derived panel.

These tests never call NASA. They verify the committed provenance and the
promises the UI relies on: real-public label, no api key, compact file, explicit
failures and no invented dose/S-scale fields.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DERIVED = ROOT / "apps" / "crew-tablet" / "public" / "data" / "space-weather.json"
MANIFEST = ROOT / "data" / "snapshots" / "manifest.json"
TYPES = {"SEP", "FLR", "CME", "GST"}


def _load(path: Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def test_space_weather_panel_is_real_public_compact_and_keyless():
    assert DERIVED.exists(), "space-weather.json is missing"
    raw = DERIVED.read_text(encoding="utf-8")
    assert len(raw.encode("utf-8")) < 200 * 1024
    assert "api_key=" not in raw
    data = json.loads(raw)
    assert data["label"] == "real-public"
    assert data["status"] in {"ok", "partial"}
    assert data["window"]["start"] == "2026-08-16" or data["window"]["start"]
    assert data["events"], "no DONKI events in the committed window"
    assert {event["type"] for event in data["events"]} <= TYPES
    assert all(event["id"] and event["time"] for event in data["events"])
    assert all("s_scale" not in event and "dose" not in event for event in data["events"])
    for event_type, expected in data["counts"].items():
        assert expected == sum(1 for event in data["events"] if event["type"] == event_type)
    times = [event["time"] for event in data["events"]]
    assert times == sorted(times, reverse=True), "events must be newest first"
    assert any("not individual dose" in item for item in data["limitations"])
    noaa = data["noaa_context"]
    if noaa.get("status") == "ok":
        assert isinstance(noaa.get("s_scale_max"), (int, float))
        assert "not individual dose" in str(noaa.get("note", ""))


def test_donki_sources_are_provenanced_and_manifest_checksums_match():
    manifest = _load(MANIFEST)
    entries = [item for item in manifest if str(item.get("id", "")).startswith("nasa-donki-")]
    assert {item.get("type") for item in entries} == TYPES
    for entry in entries:
        assert entry.get("mode") == "real", entry
        assert entry.get("api_key_sent") is False
        assert "api_key" not in str(entry.get("endpoint", ""))
        assert all("api_key" not in url for url in entry.get("request_urls", []))
        assert entry.get("license", "").startswith("NASA open data")
        path = ROOT / str(entry["snapshot"])
        raw = path.read_bytes()
        assert hashlib.sha256(raw).hexdigest() == entry["sha256"]
        rows = json.loads(raw)
        assert len(rows) == entry["rows_raw"]


def test_failed_donki_sources_are_explicit_not_substituted():
    data = _load(DERIVED)
    failed_types = {item["type"] for item in data.get("failures", [])}
    for failure in data.get("failures", []):
        assert failure.get("status") == "failed"
        assert failure.get("error")
        assert failure["type"] not in {
            source["type"] for source in data["sources"] if source.get("mode") == "real"
        }
    assert data["status"] == ("ok" if not failed_types else "partial")
