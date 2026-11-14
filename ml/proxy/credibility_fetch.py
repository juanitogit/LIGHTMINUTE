"""Capture public-source availability and hashes without credentials or raw health logs.

Only URLs from opened official documentation are attempted. Cached bodies are local
and ignored by Git; provenance summaries are committed. No NASA key is needed for
these documented public endpoints. No access-controlled content is requested.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

HERE = Path(__file__).resolve().parent
SOURCES = {
    "mmash-page": "https://physionet.org/content/mmash/1.0.0/",
    "mmash-license": "https://physionet.org/files/mmash/1.0.0/LICENSE.txt",
    "mmash-sha256": "https://physionet.org/files/mmash/1.0.0/SHA256SUMS.txt",
    "osdr-api-docs": "https://visualization.osdr.nasa.gov/biodata/api/",
    "osdr-575-v2": "https://visualization.osdr.nasa.gov/biodata/api/v2/dataset/OSD-575/?format=json",
    "osdr-575-files-v2": "https://visualization.osdr.nasa.gov/biodata/api/v2/dataset/OSD-575/files/?format=json",
    "osdr-575-files-legacy": "https://osdr.nasa.gov/osdr/data/osd/files/575",
    "osdr-575-meta-legacy": "https://osdr.nasa.gov/osdr/data/osd/meta/575",
    "osdr-569-v2": "https://visualization.osdr.nasa.gov/biodata/api/v2/dataset/OSD-569/?format=json",
}


def fetch(name: str, url: str) -> dict:
    entry = {"id": name, "url": url, "accessed_at": datetime.now(timezone.utc).isoformat()}
    try:
        with urlopen(Request(url, headers={"User-Agent": "TETHER-public-research-proxy/1.0"}), timeout=25) as response:
            content = response.read(5_000_001)
            if len(content) > 5_000_000:
                raise ValueError("metadata response exceeds timebox size cap")
            cache = HERE / "cache" / (name + ".bin")
            cache.parent.mkdir(exist_ok=True)
            cache.write_bytes(content)
            entry.update(status=response.status, bytes=len(content), sha256=hashlib.sha256(content).hexdigest(),
                         content_type=response.headers.get("Content-Type"), cache=str(cache.relative_to(HERE)))
    except HTTPError as exc:
        entry.update(status=exc.code, error="HTTPError")
    except (URLError, TimeoutError, ValueError, OSError) as exc:
        entry.update(status=None, error=type(exc).__name__)
    return entry


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ids", nargs="+", choices=SOURCES, default=list(SOURCES))
    args = parser.parse_args()
    path = HERE / "credibility-provenance.json"
    prior = json.loads(path.read_text()) if path.exists() else []
    for name in args.ids:
        result = fetch(name, SOURCES[name])
        prior.append(result)
        path.write_text(json.dumps(prior, indent=2), encoding="utf-8")
        print(name, result.get("status"), result.get("error", "OK"), result.get("bytes", 0), flush=True)


if __name__ == "__main__":
    main()
