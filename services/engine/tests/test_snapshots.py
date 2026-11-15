"""Snapshot imports must reject missing, tampered and inconsistent data."""
import json
import tempfile
from pathlib import Path

from tether_engine.ingest.snapshots import (
    SnapshotError,
    load_radiation_payload,
    radiation_points,
    sha256_bytes,
    verify_snapshot,
)


def test_snapshot_manifest_and_checksum_accept_verified_rows():
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / "snapshot.json"
        payload = b'[{"value": 1}, {"value": 2}]'
        path.write_bytes(payload)
        entry = {"sha256": sha256_bytes(payload), "rows_raw": 2}
        (path.parent / "manifest.json").write_text(json.dumps({"snapshots": [entry]}))
        assert verify_snapshot(str(path)) == entry


def test_snapshot_rejects_tampering_and_incorrect_row_count():
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / "snapshot.json"
        path.write_text('[{"value": 1}]')
        manifest = path.parent / "manifest.json"
        manifest.write_text(json.dumps([{"sha256": sha256_bytes(path.read_bytes()), "rows_raw": 2}]))
        try:
            verify_snapshot(str(path))
            raise AssertionError("incorrect row count accepted")
        except SnapshotError as exc:
            assert "manifest says 2" in str(exc)
        path.write_text('[{"value": 7}]')
        try:
            verify_snapshot(str(path))
            raise AssertionError("modified snapshot accepted")
        except SnapshotError as exc:
            assert "not in the manifest" in str(exc)


def test_snapshot_rejects_missing_manifest_and_non_list_json():
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / "snapshot.json"
        path.write_text('{"value": 1}')
        try:
            verify_snapshot(str(path))
            raise AssertionError("missing manifest accepted")
        except SnapshotError as exc:
            assert "no manifest" in str(exc)
        (path.parent / "manifest.json").write_text(json.dumps([{"sha256": sha256_bytes(path.read_bytes())}]))
        try:
            verify_snapshot(str(path))
            raise AssertionError("non-list snapshot accepted")
        except SnapshotError as exc:
            assert "expected a JSON list" in str(exc)


def test_missing_snapshot_is_rejected():
    with tempfile.TemporaryDirectory() as directory:
        try:
            verify_snapshot(str(Path(directory) / "absent.json"))
            raise AssertionError("missing snapshot accepted")
        except SnapshotError as exc:
            assert "snapshot not found" in str(exc)


def test_radiation_payload_rejects_missing_or_mislabelled_fields():
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / "panel.json"
        payload = {"synthetic": False, "label": "real-public", "points": [],
                   "current": None, "peak": None, "s_scale_max": 0}
        path.write_text(json.dumps(payload))
        assert load_radiation_payload(str(path)) == payload
        for changes, error in [({"synthetic": True}, "synthetic panel"),
                               ({"label": "invented"}, "not allowed")]:
            path.write_text(json.dumps({**payload, **changes}))
            try:
                load_radiation_payload(str(path))
                raise AssertionError("invalid label accepted")
            except SnapshotError as exc:
                assert error in str(exc)
        del payload["points"]
        path.write_text(json.dumps(payload))
        try:
            load_radiation_payload(str(path))
            raise AssertionError("missing fields accepted")
        except SnapshotError as exc:
            assert "points" in str(exc)


def test_radiation_points_filter_satellite_channel_and_sort():
    rows = [
        {"time_tag": "2026-01-02", "satellite": 18, "energy": ">=10 MeV", "flux": 11},
        {"time_tag": "2026-01-01", "satellite": 18, "energy": ">=10 MeV", "flux": 2},
        {"time_tag": "2026-01-01", "satellite": 17, "energy": ">=10 MeV", "flux": 50},
        {"time_tag": "2026-01-01", "satellite": 18, "energy": ">=100 MeV", "flux": 80},
    ]
    points = radiation_points(rows, satellite=18)
    assert [point["flux"] for point in points] == [2, 11]
    assert [point["s_scale"] for point in points] == [0, 1]
    assert radiation_points(rows, satellite=99) == []
    assert radiation_points(rows) == points
