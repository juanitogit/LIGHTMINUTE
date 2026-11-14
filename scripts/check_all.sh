#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
PYTHON="${PYTHON:-python3}"
"$PYTHON" scripts/run_tests.py
"$PYTHON" scripts/check_ownership.py --overlaps
"$PYTHON" ml/validation/run_all.py
echo "All Python, ownership and validation checks passed."
