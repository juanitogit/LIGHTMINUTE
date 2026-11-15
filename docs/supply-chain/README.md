# Supply-chain snapshot

Generated on 2026-11-14 in the America/Bogota time zone. This is a point-in-time
inventory, not a guarantee that dependencies contain no vulnerabilities.

- In `apps/crew-tablet`: `npm sbom --sbom-format cyclonedx` generated
  `npm-cyclonedx.json`, with 116 components; `npm audit --json` generated
  `npm-audit.json`, reporting zero known vulnerabilities at execution time.
- `uvx pip-audit -r <temporary-requirements> -f json -o docs/supply-chain/python-audit.json`
  generated the Python audit. The temporary requirements were extracted from
  `services/engine/pyproject.toml` with Python `tomllib` and contain only its
  declared runtime dependencies. The resolver reported 30 dependencies and zero
  known vulnerabilities. Dependencies are unpinned; this describes the resolved
  environment at audit time, not a reproducible lock of production installations.

Install-time scripts and advisory coverage require separate review. SBOM and
audit outputs can change with the registry, dependency updates and new advisories.
