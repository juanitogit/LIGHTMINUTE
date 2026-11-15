"""Repeat the previously observed MMASH proxy with explicit timestamps."""
import hashlib
import json
import platform
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import numpy
import scipy

from credibility_analysis import ROOT, mmash


def main():
    engine = ROOT / "services/engine/tether_engine/bayes/nof1.py"
    result = {
        "label": "real-public proxy; exploratory, not independent or clinical",
        "run_utc": datetime.now(timezone.utc).isoformat(),
        "revision": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
        "engine_sha256": hashlib.sha256(engine.read_bytes()).hexdigest(),
        "environment": {"python": platform.python_version(), "numpy": numpy.__version__, "scipy": scipy.__version__},
        "mmash": mmash(timestamped=True),
    }
    out = Path(__file__).with_name("cadence-check-results.json")
    out.write_text(json.dumps(result, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps(result["mmash"]["pooled"], indent=2))
    print("Output:", out)


if __name__ == "__main__":
    main()
