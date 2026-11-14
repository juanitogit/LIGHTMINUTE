#!/usr/bin/env bash
# One isolated checkout per agent => agents cannot overwrite each other's files.
# Run once from the repo root after `git init && git add -A && git commit -m init`.
set -euo pipefail
cd "$(dirname "$0")/.."
git rev-parse --verify main >/dev/null 2>&1 || git branch -M main
for n in 1 2 3 4 5 6 7; do
  [ -d "../tether-a$n" ] || git worktree add "../tether-a$n" -b "agent/a$n"
done
python3 scripts/check_ownership.py --overlaps
echo "Worktrees ready: ../tether-a1 ... ../tether-a7. Open one agent session inside each."
