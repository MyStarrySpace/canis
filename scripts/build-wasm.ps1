# Build WASM for the graph engine
# Run from repo root: .\scripts\build-wasm.ps1

$ErrorActionPreference = "Stop"

Write-Host "Building WASM..." -ForegroundColor Cyan
wasm-pack build crates/canis --target web --out-dir ../../pkg

Write-Host "Building TypeScript..." -ForegroundColor Cyan
npx tsup

Write-Host "Done!" -ForegroundColor Green
Write-Host "WASM: pkg/canis_bg.wasm"
Write-Host "JS:   dist/index.js"
