# Local demo and verification runbook

Run from `tether-kit/project`, the folder containing `AGENTS.md`. This is a
synthetic decision-support prototype, not a medical device. Do not push, publish,
change repository visibility or submit anything until the owner explicitly authorizes it.

## Windows PowerShell setup

Use Python 3.12 to match CI, Node 22 and npm. Python runtime packages are declared
in `services/engine/pyproject.toml`; the tablet has `package-lock.json`. Python
dependencies are not locked, so record the actual versions used in the check report.

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e 'services/engine[dev]'
Push-Location apps/crew-tablet
npm ci
if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
Pop-Location
```

If Python 3.12 is unavailable, install it through the normal user-managed process
or document the alternative interpreter and validate it. Do not reuse a broken
venv as evidence of passing checks. Activation is optional: using the executable
explicitly avoids changing PowerShell execution policy.

## Verification before rehearsal

```powershell
.\.venv\Scripts\python.exe --version
.\.venv\Scripts\python.exe -m pip freeze
& ./scripts/check_all.ps1 -Python '.\.venv\Scripts\python.exe'
```

The script stops on a failing Python suite, ownership check or full validation.
Full validation regenerates benchmark files; review those diffs. The ownership
check includes tracked and new non-ignored files, not `.venv`, `node_modules`
or build output. Run remaining integration checks separately:

```powershell
$env:PYTHONPATH = 'services/engine'
$env:LLM_PROVIDER = 'none'
.\.venv\Scripts\python.exe -m tether_engine.llm.redteam
node apps/ground-console/src/audit.test.mjs
Push-Location apps/crew-tablet
npm run build
Pop-Location
```

Check each command's exit code before proceeding. Record command, interpreter,
date, commit and result; never substitute historical passing counts for a run.
On bash, use `PYTHON=.venv/bin/python bash scripts/check_all.sh` and the same
integration commands with the appropriate interpreter path.

## Start the demo in separate terminals

Terminal 1, API in template mode (no provider key or provider network required):

```powershell
$env:LLM_PROVIDER = 'none'
.\.venv\Scripts\python.exe -m uvicorn tether_engine.api.main:app --app-dir services/engine --host 127.0.0.1 --port 8000
```

Terminal 2, tablet:

```powershell
Set-Location apps/crew-tablet
npm run dev -- --host 127.0.0.1
```

Open the exact URL Vite prints (normally `http://127.0.0.1:5173`). If the port is
occupied, Vite may choose another port. API health is
`http://127.0.0.1:8000/api/health`; confirm provider `none`.

Terminal 3, static console and protocol runner:

```powershell
.\.venv\Scripts\python.exe -m http.server 8130 --bind 127.0.0.1
```

Open `http://127.0.0.1:8130/apps/ground-console/` and
`http://127.0.0.1:8130/packages/protocol-runner/demo.html`.
Stop each server with Ctrl+C in its own terminal. If a port is occupied, choose
a free port or stop your own earlier server; do not terminate unrelated processes.

## Rehearsal acceptance

- Select all three scenarios; compare normal and onset days, crew and six indicators.
- Show Glance, Why and Act, including the three lenses and source labels.
- For the scripted CMO demo, inspect days 15–18; do not describe the signal as monotonic.
- Run a protocol, undo a step and exercise the cannot-do branch.
- Check Radiation and Validation with actual JSON, not only their empty states.
- Review console delay/consent previews and the audit tamper demonstration.
- Repeat at mobile width and with keyboard navigation.
- Stop the API, reload the tablet and confirm static scenario/template fallback.
- Test missing optional JSON states separately, restoring files afterwards.

## Plan B

Open `apps/crew-tablet/prototype/three-lens.html` directly from disk: its embedded
scenario needs no server or network. Keep a copy of the repository and the script
available locally. The React app's static-data fallback is not proof of a fully
installed offline PWA: test reload without network separately before promising it.
Double-click the console and runner demos as an additional file-URL check; report
that check independently from the HTTP rehearsal.

## Provider mode and handover

Only use a provider key already configured through the user's normal secret
management. Never print it, commit it, place it in a browser prompt or include it
in screenshots. Provider mode remains optional; an unexecuted live call must be
reported as unverified. Team names, final video, hosting, official event details,
clinical review and permission to push must come from their responsible owners.
