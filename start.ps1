# Polaris — start / stop (Windows, PowerShell)
# Usage: .\start.ps1 [docker|up|stop|logs]

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Show-Menu {
    Write-Host ""
    Write-Host "Polaris" -ForegroundColor Cyan
    Write-Host "  1) Start (Docker)      — recommended"
    Write-Host "  2) Start (Docker -d)   — run in background"
    Write-Host "  3) Stop"
    Write-Host "  4) Logs"
    Write-Host "  5) Seed sample data"
    Write-Host "  0) Exit"
    Write-Host ""
    $choice = Read-Host "  Choice [0-5]"
    switch ($choice) {
        "1" { Start-Docker }
        "2" { Start-DockerDetached }
        "3" { Stop-All }
        "4" { Show-Logs }
        "5" { Seed-Data }
        "0" { exit 0 }
        default { Write-Host "Invalid." -ForegroundColor Yellow; Show-Menu }
    }
}

function Start-Docker {
    docker compose up --build
}

function Start-DockerDetached {
    docker compose up -d --build
    Write-Host "`nRunning. Frontend: http://localhost:5173  |  Backend: http://localhost:3001" -ForegroundColor Green
    Write-Host "Stop: .\start.ps1 stop   |   Logs: .\start.ps1 logs"
}

function Stop-All {
    docker compose down
    Write-Host "Done." -ForegroundColor Green
}

function Show-Logs {
    docker compose logs -f
}

function Seed-Data {
    Write-Host "`nSeeding sample data into the running backend container..." -ForegroundColor Cyan
    docker compose exec backend sh -c "cd apps/backend && npx tsx prisma/seed.ts"
    Write-Host "`nDone. Refresh the dashboard to see data." -ForegroundColor Green
}

$cmd = $args[0]
switch ($cmd) {
    "docker" { Start-Docker }
    "up"    { Start-DockerDetached }
    "stop"  { Stop-All }
    "logs"  { Show-Logs }
    "seed"  { Seed-Data }
    default { Show-Menu }
}
