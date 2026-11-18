# Run from this repository's preview branch. Serves files only on this PC.
param([int]$Port = 8766)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Test-Path 'home.html')) { throw 'home.html not found.' }
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  throw 'Python is required. Install Python 3 and retry.'
}
Write-Host "LOCAL PREVIEW: http://127.0.0.1:$Port/home.html"
Write-Host 'Press Ctrl+C to stop. Do not sign in or submit fight changes during read-only testing.'
python -m http.server $Port --bind 127.0.0.1
