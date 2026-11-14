#!/usr/bin/env python3
"""Ownership guard for parallel agents.
  python scripts/check_ownership.py --overlaps            # every repo file has exactly one owner
  python scripts/check_ownership.py A3 agent/a3 [base]    # branch touched only A3's paths
Ownership = path prefix match (directories end with '/'; other entries match as prefixes)."""
import json, os, subprocess, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OWN = json.load(open(os.path.join(ROOT, "agents", "OWNERS.json")))


def owners_of(path):
    return [a for a, c in OWN.items() if any(path.startswith(p) for p in c["own"])]


def all_files():
    out = []
    for r, ds, fs in os.walk(ROOT):
        ds[:] = [d for d in ds if d not in (".git", "__pycache__", "node_modules", ".dsh", ".claude")]
        for f in fs:
            out.append(os.path.relpath(os.path.join(r, f), ROOT).replace(os.sep, "/"))
    return sorted(out)


def check_overlaps():
    bad = 0
    for f in all_files():
        o = owners_of(f)
        if len(o) != 1:
            bad += 1; print(("UNOWNED " if not o else f"OVERLAP {o} ") + f)
    print("ownership map OK" if not bad else f"{bad} problem(s)"); return bad


def check_branch(agent, branch, base="main"):
    files = subprocess.check_output(["git", "diff", "--name-only", f"{base}...{branch}"], cwd=ROOT, text=True).split()
    bad = [f for f in files if agent not in owners_of(f)]
    for f in bad: print(f"VIOLATION {agent} touched {f} (owners: {owners_of(f) or 'none'})")
    print(f"{agent}: {len(files)} files, {len(bad)} violation(s)"); return len(bad)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--overlaps": sys.exit(1 if check_overlaps() else 0)
    sys.exit(1 if check_branch(*sys.argv[1:4]) else 0)
