$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "Starting the lightweight MediFlow + HealOps Compose stack..." -ForegroundColor Cyan
Write-Host "This builds the project images, then starts the default services." -ForegroundColor Gray

Push-Location $root
try {
    docker compose up -d --build
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Compose failed with exit code $LASTEXITCODE. Check Docker Desktop and the build output above."
    }
    docker compose ps
    Start-Process "http://localhost:3001"
    Start-Process "http://localhost:8091"
    Write-Host "MediFlow: http://localhost:3001" -ForegroundColor Green
    Write-Host "HealOps:  http://localhost:8091" -ForegroundColor Green
}
finally {
    Pop-Location
}
