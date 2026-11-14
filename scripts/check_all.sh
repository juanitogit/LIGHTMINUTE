#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
python3 scripts/run_tests.py | tail -1
python3 scripts/check_ownership.py --overlaps
python3 ml/validation/run_all.py >/dev/null 2>&1 && echo "validation ok" || echo "validation FAILED"
