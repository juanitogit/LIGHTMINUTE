#!/usr/bin/env bash
# Integrator only (A7, in the main checkout). Usage: bash scripts/merge_agents.sh 1 2 3 ...
set -euo pipefail
cd "$(dirname "$0")/.."
for n in "$@"; do
  python3 scripts/check_ownership.py "A$n" "agent/a$n" main || { echo "SKIP a$n (ownership violation)"; continue; }
  git merge --no-ff -m "merge agent/a$n" "agent/a$n" || { echo "CONFLICT in a$n: abort and report"; git merge --abort; continue; }
  python3 scripts/run_tests.py | tail -1
done
