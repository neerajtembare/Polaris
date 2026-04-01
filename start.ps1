# Polaris — start / stop / check (Windows PowerShell)
#
# Usage:
#   .\start.ps1                    start locally (Node.js + npm run dev)
#   .\start.ps1 local              same as above
#   .\start.ps1 local --with-ai    also start Ollama LLM + Whisper STT (CPU)
#   .\start.ps1 docker             start with Docker — core services only
#   .\start.ps1 docker:ai          start with Docker + GPU AI overlay
#   .\start.ps1 stop               stop local background processes
#   .\start.ps1 seed               seed sample data into the database
#   .\start.ps1 check              health-check all services
#   .\start.ps1 logs               tail Docker logs
#
# First run?  .\setup.sh

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Write-Ok   { param($msg) Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "! $msg" -ForegroundColor Yellow }
function Write-Err  { param($msg) Write-Host "✗ $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "→ $msg" -ForegroundColor Cyan }

# ─── prerequisite checks ────────────────────────────────────────────────────

function Ensure-LocalDeps {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Err "Node not found. Run .\setup.sh first, or use: .\start.ps1 docker"; exit 1
    }
    if (-not (Test-Path "node_modules")) {
        Write-Info "Installing dependencies…"; npm install
    }
    Write-Ok "Node $(node -v)"
}

function Ensure-Env {
    if (-not (Test-Path "apps\backend\.env")) {
        Write-Warn "apps/backend/.env not found — creating defaults. Run .\setup.sh for full setup."
        Set-Content "apps\backend\.env" "DATABASE_URL=`"file:./data/polaris.db`"`nPORT=3001`nNODE_ENV=development"
        Write-Ok "Created apps/backend/.env"
    }
    New-Item -ItemType Directory -Force "apps\backend\data" | Out-Null
}

# ─── optional AI services (local mode, non-blocking) ────────────────────────

function Start-Ollama {
    if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
        Write-Warn "Ollama not installed — AI parsing unavailable (https://ollama.ai)"; return
    }
    try { Invoke-RestMethod http://localhost:11434/api/tags -TimeoutSec 2 | Out-Null }
    catch {
        Write-Info "Starting Ollama server…"
        Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep 3
    }
    $models = & ollama list 2>$null
    if (-not ($models -match "llama3.2:3b")) {
        Write-Info "Pulling llama3.2:3b model (~2GB, first run only)…"
        & ollama pull llama3.2:3b
    }
    Write-Ok "Ollama ready (llama3.2:3b)"
}

function Start-Whisper {
    $pyCmd = Get-Command python -ErrorAction SilentlyContinue
    if (-not $pyCmd) { $pyCmd = Get-Command python3 -ErrorAction SilentlyContinue }
    if (-not $pyCmd) { Write-Warn "Python not found — voice input unavailable (install Python 3.10+)"; return }
    $python  = $pyCmd.Source
    $venvDir = Join-Path $PSScriptRoot "services\whisper\venv"
    if (-not (Test-Path $venvDir)) {
        Write-Info "Creating Python venv for Whisper…"
        & $python -m venv $venvDir
    }
    $venvPy = if (Test-Path "$venvDir\Scripts\python.exe") { "$venvDir\Scripts\python.exe" } else { "$venvDir\bin\python" }

    $importCheck = & $venvPy -c "import uvicorn" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Info "Installing Whisper dependencies…"
        & $venvPy -m pip install -r services\whisper\requirements.txt --quiet
    }

    try {
        $h = Invoke-RestMethod http://localhost:8001/health -TimeoutSec 2
        if ($h.status -eq "ok") { Write-Ok "Whisper already running (port 8001)"; return }
    } catch {}

    Write-Info "Starting Whisper service in background (CPU, base model)…"
    $logFile = "$env:TEMP\polaris-whisper.log"
    $whisperDir = Join-Path $PSScriptRoot "services\whisper"
    $env:WHISPER_MODEL = "base"
    $env:WHISPER_DEVICE = "cpu"
    $env:WHISPER_COMPUTE_TYPE = "int8"
    $proc = Start-Process $venvPy `
        -ArgumentList "-m uvicorn main:app --host 0.0.0.0 --port 8001" `
        -WorkingDirectory $whisperDir `
        -WindowStyle Hidden `
        -RedirectStandardOutput $logFile `
        -PassThru
    $proc.Id | Out-File "$env:TEMP\polaris-whisper.pid"

    $retries = 0
    while ($retries -lt 15) {
        try {
            if ((Invoke-RestMethod http://localhost:8001/health -TimeoutSec 2).status -eq "ok") {
                Write-Ok "Whisper ready (base model, CPU)"; return
            }
        } catch {}
        Start-Sleep 2; $retries++
    }
    Write-Warn "Whisper slow to start — check $logFile"
}

# ─── commands ────────────────────────────────────────────────────────────────

function Invoke-Local {
    param([string]$Flag = "")
    Ensure-LocalDeps
    Ensure-Env
    if ($Flag -eq "--with-ai") {
        Write-Host ""
        Write-Info "Starting optional AI services…"
        Start-Ollama
        Start-Whisper
    }
    Write-Host ""
    Write-Info "Starting backend + frontend…"
    npm run dev
}

function Invoke-Docker {
    Write-Info "Starting core services (backend + frontend)…"
    Write-Info "Voice/AI features disabled in core mode. Use 'docker:ai' for GPU support."
    Write-Host ""
    docker compose up --build
}

function Invoke-DockerAi {
    Write-Info "Starting all services with GPU AI support (Whisper + Ollama)…"
    Write-Info "Requires NVIDIA Container Toolkit — see docker-compose.ai.yml for details."
    Write-Host ""
    docker compose -f docker-compose.yml -f docker-compose.ai.yml up --build
}

function Invoke-Stop {
    Write-Info "Stopping local Polaris processes…"
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        $_.Path -match "tsx|vite" -or (Get-WmiObject Win32_Process -Filter "ProcessId=$($_.Id)" -ErrorAction SilentlyContinue).CommandLine -match "tsx|vite"
    } | ForEach-Object { Stop-Process $_ -Force -ErrorAction SilentlyContinue }
    $pidFile = "$env:TEMP\polaris-whisper.pid"
    if (Test-Path $pidFile) {
        $whisperPid = Get-Content $pidFile
        Stop-Process -Id $whisperPid -Force -ErrorAction SilentlyContinue
        Remove-Item $pidFile -Force
        Write-Ok "Whisper stopped"
    }
    Write-Ok "Done. (To stop Docker containers: docker compose down)"
}

function Invoke-Seed {
    Ensure-LocalDeps
    Write-Info "Seeding sample data…"
    Push-Location apps\backend
    npx tsx prisma/seed.ts
    Pop-Location
    Write-Ok "Sample data seeded"
}

function Invoke-Check {
    function Test-Service { param($url, $label, [bool]$required)
        try {
            Invoke-RestMethod $url -TimeoutSec 3 | Out-Null
            Write-Ok "$label"
        } catch {
            if ($required) { Write-Err "$label (not running)" }
            else { Write-Warn "$label (optional — not running)" }
        }
    }
    Write-Host ""
    Write-Host "  Service health:"
    Test-Service "http://localhost:3001/health"    "Backend  http://localhost:3001" $true
    Test-Service "http://localhost:5173"            "Frontend http://localhost:5173" $true
    Test-Service "http://localhost:8001/health"     "Whisper  http://localhost:8001" $false
    Test-Service "http://localhost:11434/api/tags"  "Ollama   http://localhost:11434" $false
    Write-Host ""
}

function Invoke-Logs { docker compose logs -f }

function Show-Usage {
    Write-Host ""
    Write-Host "  Usage: .\start.ps1 [command] [flags]"
    Write-Host ""
    Write-Host "  Commands:"
    Write-Host "    (none)              Start locally (same as 'local')"
    Write-Host "    local               Start with Node.js + npm run dev"
    Write-Host "    local --with-ai     Also start Ollama LLM + Whisper STT (CPU, base model)"
    Write-Host "    docker              Docker — core services (backend + frontend) only"
    Write-Host "    docker:ai           Docker — core + GPU AI services (needs NVIDIA Toolkit)"
    Write-Host "    stop                Stop local background processes"
    Write-Host "    seed                Seed 90 days of sample data"
    Write-Host "    check               Health-check all services"
    Write-Host "    logs                Tail Docker logs"
    Write-Host ""
    Write-Host "  First run?  .\setup.sh"
    Write-Host ""
}

# ─── entry point ─────────────────────────────────────────────────────────────

$cmd  = if ($args.Count -gt 0) { $args[0] } else { "local" }
$flag = if ($args.Count -gt 1) { $args[1] } else { "" }

switch ($cmd) {
    "local"      { Invoke-Local $flag }
    "docker"     { Invoke-Docker }
    "docker:ai"  { Invoke-DockerAi }
    "stop"       { Invoke-Stop }
    "seed"       { Invoke-Seed }
    "check"      { Invoke-Check }
    "logs"       { Invoke-Logs }
    { $_ -in "help", "--help", "-h" } { Show-Usage }
    default      { Write-Err "Unknown command: $cmd"; Show-Usage; exit 1 }
}
