$envFile = Join-Path $PSScriptRoot ".env"
$envVars = @{}
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        if ($name -and $value) { $envVars[$name] = $value }
    }
}

$source = "\\wsl.localhost\Ubuntu\home\cashel\projects\desktop-agent-ui"
$target = $envVars["WINDOWS_REPO_PATH"]

if (-not $target) {
    Write-Host "WINDOWS_REPO_PATH not found in .env" -ForegroundColor Yellow
    $target = Read-Host "Please enter the target Windows path (e.g. C:\Users\...\Projects\desktop-agent-ui)"
    Add-Content $envFile "WINDOWS_REPO_PATH=$target"
}

Write-Host "Syncing WSL repo to Windows repo..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $target | Out-Null
robocopy $source $target /E /XD node_modules __pycache__ .git dist

if ($LASTEXITCODE -ge 8) {
  Write-Host "robocopy failed with exit code $LASTEXITCODE" -ForegroundColor Red
  exit $LASTEXITCODE
}

Set-Location $target

if (-not (Test-Path ".\node_modules\electron") -or -not (Test-Path ".\node_modules\electron-packager")) {
  Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
  npm install
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

Write-Host "Building Windows app executable..." -ForegroundColor Cyan
npm run pack:win
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Host "Done. Run dist\Desktop Agent-win32-x64\Desktop Agent.exe" -ForegroundColor Green
