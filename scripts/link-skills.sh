#!/usr/bin/env bash
# Make the same skills visible to DeepSeek Harness (dsh), Claude Code and Codex-style agents.
# dsh scans <project>/.dsh/skills, ~/.agents/skills (direct children only); Claude Code scans .claude/skills.
set -euo pipefail
cd "$(dirname "$0")/.."
for target in .dsh/skills .claude/skills; do
  mkdir -p "$target"
  for d in .agents/skills/*/; do
    n=$(basename "$d"); rm -rf "$target/$n"; cp -r "$d" "$target/$n"
  done
done
echo "Skills synced to .dsh/skills and .claude/skills (reload your agent session)."
