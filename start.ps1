# Polaris — start / stop (Windows, PowerShell)
# Usage: .\start.ps1 [docker|up|local|stop|logs|models]
#
# GPU support requires NVIDIA Container Toolkit for Docker services.
# Local mode requires Node 20+, Python 3.10+ and Ollama installed on Windows.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

function Write-Ok    { param($msg) Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Warn  { param($msg) Write-Host "! $msg" -ForegroundColor Yellow }
function Write-Info  { param($msg) Write-Host "→ $msg" -ForegroundColor Cyan }
function Write-Hdr   { param($msg) Write-Host "`n$msg`n" -ForegroundColor White }

# ─────────────────────────────────────────────────────────────────────────────
# AI service checks (local mode only)
# ─────────────────────────────────────────────────────────────────────────────

function Check-Ollama {
    $ollamaCmd = Get-Command ollama -ErrorAction SilentlyContinue
    if (-not $ollamaCmd) {
        Write-Warn "Ollama not found — AI activity parsing will be unavailable."
        Write-Warn "Install from https://ollama.ai and run: ollama pull llama3.2:3b"
        return
    }

    # Start Ollama if not already running
    try { Invoke-RestMethod http://localhost:11434/api/tags -TimeoutSec 2 | Out-Null }
    catch {
        Write-Info "Starting Ollama server..."
        Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep 3
    }

    # Pull model if missing
    $models = ollama list 2>$null
    if (-not ($models -match "llama3.2:3b")) {
        Write-Info "Pulling llama3.2:3b model (~2GB, first run only)..."
        ollama pull llama3.2:3b
    }

    Write-Ok "Ollama ready (llama3.2:3b)"
}

function Check-Whisper {
    $pyCmd = Get-Command python -ErrorAction SilentlyContinue
    if (-not $pyCmd) { $pyCmd = Get-Command python3 -ErrorAction SilentlyContinue }
    if (-not $pyCmd) {
        Write-Warn "Python not found — Voice input will be unavailable."
        Write-Warn "Install Python 3.10+ or use Docker mode for full voice support."
        return
    }

    $python = $pyCmd.Source

    $venvDir = Join-Path $PSScriptRoot "services\whisper\venv"
    if (-not (Test-Path $venvDir)) {
        Write-Info "Creating Python virtual environment for Whisper..."
        & $python -m venv $venvDir
    }

    $venvPython = if (Test-Path (Join-Path $venvDir "Scripts\python.exe")) { Join-Path $venvDir "Scripts\python.exe" } else { Join-Path $venvDir "bin\python" }
    if (-not (Test-Path $venvPython)) { $venvPython = $python }

    # Install dependencies if needed
    try { & $venvPython -c "import uvicorn" 2>$null | Out-Null }
    catch {
        Write-Info "Installing Whisper service dependencies..."
        & $venvPython -m pip install -r services/whisper/requirements.txt --quiet
        Write-Ok "Whisper dependencies installed"
    }

    # Check if already running
    try {
        $resp = Invoke-RestMethod http://localhost:8001/health -TimeoutSec 2
        if ($resp.status -eq "ok") { Write-Ok "Whisper service already running"; return }
    } catch {}

    Write-Info "Starting Whisper service in background (port 8001)..."
    $whisperDir = Join-Path $PSScriptRoot "services\whisper"
    $logFile    = "$env:TEMP\polaris-whisper.log"
    $proc = Start-Process $venvPython `
        -ArgumentList "-m uvicorn main:app --host 0.0.0.0 --port 8001" `
        -WorkingDirectory $whisperDir `
        -WindowStyle Hidden `
        -RedirectStandardOutput $logFile `
        -PassThru
    $proc.Id | Out-File "$env:TEMP\polaris-whisper.pid"

    Write-Info "Waiting for Whisper model to load (may take up to 60s on first run)..."
    $retries = 0
    while ($retries -lt 30) {
        try {
            $resp = Invoke-RestMethod http://localhost:8001/health -TimeoutSec 2
            if ($resp.status -eq "ok") { Write-Ok "Whisper service ready"; return }
        } catch {}
        Start-Sleep 2
        $retries++
    }
    Write-Warn "Whisper service is slow to start — voice may not work yet."
    Write-Warn "Check $logFile for details."
}

function Pull-Models {
    Write-Hdr "Pulling AI Models (first run)"
    Check-Ollama
    Write-Info "Whisper model (large-v3) downloads on first voice use."
    Write-Ok "Models ready."
}

# ─────────────────────────────────────────────────────────────────────────────
# Run modes
# ─────────────────────────────────────────────────────────────────────────────

function Start-Docker {
    Write-Hdr "Polaris — Docker (includes GPU Whisper + Ollama)"
    docker compose up --build
}

function Start-DockerDetached {
    docker compose up -d --build
    Write-Host ""
    Write-Ok "Running."
    Write-Host "  Frontend: http://localhost:5173"
    Write-Host "  Backend:  http://localhost:3001"
    Write-Host "  Whisper:  http://localhost:8001"
    Write-Host "  Ollama:   http://localhost:11434"
    Write-Info "Stop: .\start.ps1 stop   |   Logs: .\start.ps1 logs"
}

function Start-Local {
    Write-Hdr "Polaris — Local"

    # Check Node
    try { node --version | Out-Null } catch {
        Write-Host "Node not found. Install Node 20+ or use: .\start.ps1 docker" -ForegroundColor Red; exit 1
    }

    # Install Node deps if needed
    if (-not (Test-Path "node_modules")) {
        Write-Info "Installing dependencies..."
        npm install
    }

    # Ensure backend .env exists
    if (-not (Test-Path "apps\backend\.env")) {
        Set-Content -Path "apps\backend\.env" -Value "DATABASE_URL=`"file:../data/polaris.db`"`nAI_PROVIDER=`"ollama`""
        Write-Ok "Created apps/backend/.env"
    }

    # Set up DB unconditionally
    if (-not (Test-Path "apps\backend\data")) {
        New-Item -ItemType Directory -Force "apps\backend\data" | Out-Null
    }
    Push-Location apps\backend
    npx prisma db push --skip-generate 2>$null | Out-Null
    npx prisma generate 2>$null | Out-Null
    Pop-Location
    Write-Ok "Database schema synced"

    # Start AI services (non-blocking — app works without them)
    Check-Ollama
    Check-Whisper

    Write-Info "Starting backend + frontend..."
    Write-Host ""
    npm run dev
}

function Stop-All {
    Write-Hdr "Stopping Polaris"
    docker compose down 2>$null
    Write-Ok "Docker containers stopped (if running)"

    # Stop local Whisper service
    $pidFile = "$env:TEMP\polaris-whisper.pid"
    if (Test-Path $pidFile) {
        $pid = Get-Content $pidFile
        try { Stop-Process -Id $pid -Force; Write-Ok "Whisper service stopped" } catch {}
        Remove-Item $pidFile -Force
    }

    Write-Ok "Done."
}

function Show-Logs {
    docker compose logs -f
}

function Show-Menu {
    Write-Host ""
    Write-Host "Polaris" -ForegroundColor Cyan
    Write-Host "  1) Start (Docker)      — recommended, includes GPU AI services"
    Write-Host "  2) Start (Docker -d)   — run in background"
    Write-Host "  3) Start (local)       — needs Node/npm + Python"
    Write-Host "  4) Stop"
    Write-Host "  5) Logs"
    Write-Host "  6) Seed sample data"
    Write-Host "  7) Pull AI models      — Ollama llama3.2:3b + Whisper"
    Write-Host "  0) Exit"
    Write-Host ""
    $choice = Read-Host "  Choice [0-7]"
    switch ($choice) {
        "1" { Start-Docker }
        "2" { Start-DockerDetached }
        "3" { Start-Local }
        "4" { Stop-All }
        "5" { Show-Logs }
        "6" {
            Write-Info "Seeding sample data..."
            docker compose exec backend sh -c "cd apps/backend && npx tsx prisma/seed.ts"
            Write-Ok "Done. Refresh the dashboard to see data."
        }
        "7" { Pull-Models }
        "0" { exit 0 }
        default { Write-Host "Invalid." -ForegroundColor Yellow; Show-Menu }
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

$cmd = $args[0]
switch ($cmd) {
    "docker" { Start-Docker }
    "up"     { Start-DockerDetached }
    "local"  { Start-Local }
    "stop"   { Stop-All }
    "logs"   { Show-Logs }
    "models" { Pull-Models }
    default  { Show-Menu }
}
