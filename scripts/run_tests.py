#!/usr/bin/env python3
"""Dependency-free test runner (pytest works too). Usage: python scripts/run_tests.py"""
import sys, glob, importlib.util, os, traceback
root = os.path.join(os.path.dirname(__file__), "..", "services", "engine")
sys.path.insert(0, os.path.abspath(root))
fails = total = 0
for f in sorted(glob.glob(os.path.join(root, "tests", "test_*.py"))):
    spec = importlib.util.spec_from_file_location(os.path.basename(f)[:-3], f)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    for n in [n for n in dir(m) if n.startswith("test_")]:
        total += 1
        try:
            getattr(m, n)(); print("PASS", m.__name__, n)
        except Exception:
            fails += 1; print("FAIL", m.__name__, n); traceback.print_exc()
print(f"\n{total - fails}/{total} passed"); sys.exit(1 if fails else 0)
