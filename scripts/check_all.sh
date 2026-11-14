#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/run_tests.py
python3 scripts/check_ownership.py --overlaps
python3 scripts/audit_vault.py
python3 ml/validation/run_all.py
