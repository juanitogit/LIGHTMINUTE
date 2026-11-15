"""Offline provenance checks; no credentials or external services required."""
import hashlib
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def strict_json(path):
    def bad_constant(value):
        raise ValueError(f"non-finite JSON value: {value}")
    return json.loads(path.read_text(encoding="utf-8"), parse_constant=bad_constant)


class NASAProvenance(unittest.TestCase):
    def test_existing_donki_snapshot_hashes_and_metadata(self):
        manifest = strict_json(ROOT / "data/snapshots/manifest.json")
        rows = [item for item in manifest if item.get("id", "").startswith("nasa-donki-")]
        self.assertEqual({item["type"] for item in rows}, {"SEP", "FLR", "CME", "GST"})
        noaa = next(item for item in manifest if item.get("source", "").startswith("NOAA SWPC GOES"))
        self.assertEqual(hashlib.sha256((ROOT / noaa["snapshot"]).read_bytes()).hexdigest(), noaa["sha256"])
        for item in rows:
            self.assertFalse(item.get("api_key_sent", False))
            self.assertTrue(all("api_key=" not in url.lower() for url in item.get("request_urls", [])))
            for key, value in item.items():
                if any(secret in key.lower() for secret in ("secret", "token", "api_key")):
                    self.assertIn(value, (None, False, ""), f"unexpected credential field {key}")
            self.assertEqual(hashlib.sha256((ROOT / item["snapshot"]).read_bytes()).hexdigest(), item["sha256"])
            self.assertEqual(len(strict_json(ROOT / item["snapshot"])), item["rows_raw"])

    def test_derived_weather_is_small_valid_json(self):
        path = ROOT / "apps/crew-tablet/public/data/space-weather.json"
        self.assertLess(path.stat().st_size, 200 * 1024)
        data = strict_json(path)
        self.assertIsInstance(data["sources"], list)
        self.assertTrue(data["sources"])
        self.assertIsInstance(data["events"], list)

    def test_osdr_file_provenance_matches_documented_digest(self):
        records = strict_json(ROOT / "ml/proxy/credibility-provenance.json")
        record = next(item for item in records if item.get("id") == "osdr-575-cmp")
        self.assertEqual(record["sha256"], "5eb1e7f025dd8443a9e70111e62bc32afae3432753024489c5c013e401d709d9")
        self.assertEqual(record["status"], 200)
        self.assertIn("OSD-575", record["url"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
