# Safety fault-injection harness

From the repository root run `.venv/Scripts/python.exe tests/fault_injection/run.py`. Use a Python environment with the engine and FastAPI testing dependencies installed. The browser cases use the existing crew-tablet build, its Playwright dependency, Node, and installed Chrome. To prepare that build, use the tablet's documented build command. The run uses temporary mission storage, a local HTTP server, generated readings and simulated provider responses. It does not call a model or require real credentials.

Individual cases assert the safe behavior and retain the actual output, including exceptions. Exit status is nonzero when any case fails or cannot run. The script writes the run table and JSON into `docs/safety/`; reproduce in a clean checkout when preserving a prior result. The baseline repository tests run separately with `.venv/Scripts/python.exe scripts/run_tests.py`.

See [hazards](../../docs/safety/hazard-analysis.md) for the meaning and limits of each assertion.
