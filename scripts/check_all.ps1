param(
    [string]$Python = "python"
)

$ErrorActionPreference = "Stop"
Push-Location (Join-Path $PSScriptRoot "..")
try {
    foreach ($check in @("scripts/run_tests.py", "scripts/check_ownership.py", "ml/validation/run_all.py")) {
        $checkArguments = @($check)
        if ($check -eq "scripts/check_ownership.py") { $checkArguments += "--overlaps" }
        & $Python @checkArguments
        if ($LASTEXITCODE -ne 0) {
            throw "Check failed: $check (exit $LASTEXITCODE)"
        }
    }
    Write-Output "All Python, ownership and validation checks passed."
} finally {
    Pop-Location
}
