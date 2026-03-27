#!/usr/bin/env bash
# Polaris — start / stop / logs (Docker or local)
# Supports: Docker Compose (GPU services included) and local Node.js + Python
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colours
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
err()  { echo -e "${RED}✗${NC} $*"; }
info() { echo -e "${CYAN}→${NC} $*"; }
hdr()  { echo -e "\n${BOLD}$*${NC}\n"; }

# Docker Compose (supports both "docker compose" and "docker-compose")
dc() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  else
    docker-compose "$@"
  fi
}

check_docker() {
  command -v docker >/dev/null 2>&1 || { err "Docker not found. Install Docker Desktop."; exit 1; }
  docker info >/dev/null 2>&1 || { err "Docker daemon not running. Start Docker and try again."; exit 1; }
  ok "Docker ready"
}

check_local() {
  command -v node >/dev/null 2>&1 || { err "Node not found. Install Node 20+ or use: ./start.sh docker"; exit 1; }
  command -v npm  >/dev/null 2>&1 || { err "npm not found."; exit 1; }
  [ -d node_modules ] || { info "Installing dependencies..."; npm install; ok "Dependencies installed"; }
  [ -d apps/backend/node_modules ] || { info "Workspace deps..."; npm install; }
  ok "Node $(node -v)"
}

# ─────────────────────────────────────────────────────────────────────────────
# AI service checks (local mode only)
# ─────────────────────────────────────────────────────────────────────────────

check_ollama() {
  if ! command -v ollama >/dev/null 2>&1; then
    warn "Ollama not found — AI activity parsing will be unavailable."
    warn "Install from https://ollama.ai and run: ollama pull llama3.2:3b"
    return 0
  fi

  # Start Ollama server if not already running
  if ! curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; then
    info "Starting Ollama server in background..."
    ollama serve >/dev/null 2>&1 &
    sleep 3
  fi

  # Pull model if not already present
  if ! ollama list 2>/dev/null | grep -q "llama3.2:3b"; then
    info "Pulling llama3.2:3b model (~2GB, first run only)..."
    ollama pull llama3.2:3b
  fi

  ok "Ollama ready (llama3.2:3b)"
}

check_whisper() {
  if ! command -v python3 >/dev/null 2>&1 && ! command -v python >/dev/null 2>&1; then
    warn "Python 3 not found — Voice input will be unavailable."
    warn "Install Python 3.10+ or use Docker mode for full voice support."
    return 0
  fi

  local PY
  PY=$(command -v python3 || command -v python)

  local VENV_DIR="$SCRIPT_DIR/services/whisper/venv"
  if [ ! -d "$VENV_DIR" ]; then
    info "Creating Python virtual environment for Whisper..."
    "$PY" -m venv "$VENV_DIR"
  fi
  
  local VENV_PY="$VENV_DIR/bin/python"

  # Check if uvicorn (whisper service dep) is installed in the venv
  if ! "$VENV_PY" -c "import uvicorn" >/dev/null 2>&1; then
    info "Installing Whisper service dependencies..."
    "$VENV_PY" -m pip install -r services/whisper/requirements.txt --quiet
    ok "Whisper dependencies installed"
  fi

  # Start the Whisper FastAPI service in background if not already running
  if ! curl -sf http://localhost:8001/health >/dev/null 2>&1; then
    info "Starting Whisper service in background (port 8001)..."
    
    # Expose CUDA libraries from the pip environment to correctly run faster-whisper natively
    local NVIDIA_LIB="$VENV_DIR/lib/python$("$VENV_PY" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')/site-packages/nvidia"
    local CUDA_PATHS="$NVIDIA_LIB/cublas/lib:$NVIDIA_LIB/cudnn/lib"
    
    # Run from the services/whisper dir so relative paths resolve
    (cd "$SCRIPT_DIR/services/whisper" && LD_LIBRARY_PATH="$CUDA_PATHS:$LD_LIBRARY_PATH" "$VENV_PY" -m uvicorn main:app --host 0.0.0.0 --port 8001 >/tmp/polaris-whisper.log 2>&1) &
    echo $! > /tmp/polaris-whisper.pid
    # Give it time to load the model (can take 30-60 seconds on first run)
    info "Waiting for Whisper model to load (may take up to 60s on first run)..."
    local retries=0
    while [ $retries -lt 30 ]; do
      if curl -sf http://localhost:8001/health >/dev/null 2>&1; then
        ok "Whisper service ready"
        return 0
      fi
      sleep 2
      retries=$((retries + 1))
    done
    warn "Whisper service is slow to start — voice input may not work yet."
    warn "Check /tmp/polaris-whisper.log for details."
  else
    ok "Whisper service already running"
  fi
}

pull_models() {
  hdr "Pulling AI Models (first run)"
  check_ollama
  info "Whisper model (large-v3) will be downloaded on first voice use."
  ok "Models ready."
}

# ─────────────────────────────────────────────────────────────────────────────
# Run modes
# ─────────────────────────────────────────────────────────────────────────────

run_docker() {
  check_docker
  hdr "Polaris — Docker (includes Whisper + Ollama with GPU)"
  info "Starting all services (first run builds images and pulls models)..."
  echo ""
  dc up --build
}

run_docker_detached() {
  check_docker
  hdr "Polaris — Docker (background)"
  dc up -d --build
  echo ""
  ok "Running."
  echo "  Frontend: http://localhost:5173"
  echo "  Backend:  http://localhost:3001"
  echo "  Whisper:  http://localhost:8001"
  echo "  Ollama:   http://localhost:11434"
  info "Stop with: ./start.sh stop   |   Logs: ./start.sh logs"
}

run_local() {
  check_local
  hdr "Polaris — Local"

  # Ensure backend .env exists
  if [ ! -f apps/backend/.env ]; then
    echo "DATABASE_URL=\"file:../data/polaris.db\"" > apps/backend/.env
    echo "AI_PROVIDER=\"ollama\"" >> apps/backend/.env
    ok "Created apps/backend/.env"
  fi

  # Set up DB unconditionally to ensure schema is synchronized
  if [ ! -d apps/backend/data ]; then
    mkdir -p apps/backend/data
  fi
  (cd apps/backend && npx prisma db push --skip-generate >/dev/null 2>&1 && npx prisma generate >/dev/null 2>&1) && ok "Database schema synced" || true

  # Start AI services in background (non-blocking — app still works without them)
  check_ollama
  check_whisper

  info "Starting backend + frontend..."
  echo ""
  npm run dev
}

stop_all() {
  hdr "Stopping Polaris"
  dc down 2>/dev/null && ok "Docker containers stopped" || true
  pkill -f "tsx watch src/index.ts" 2>/dev/null || true
  pkill -f "vite" 2>/dev/null || true

  # Stop local Whisper service
  if [ -f /tmp/polaris-whisper.pid ]; then
    local pid
    pid=$(cat /tmp/polaris-whisper.pid)
    kill "$pid" 2>/dev/null && ok "Whisper service stopped" || true
    rm -f /tmp/polaris-whisper.pid
  fi

  # Stop local Ollama (optional — user may want it running for other things)
  # pkill -f "ollama serve" 2>/dev/null || true

  ok "Done."
}

show_logs() {
  check_docker
  hdr "Docker logs (Ctrl+C to exit)"
  dc logs -f
}

build_docker() {
  check_docker
  hdr "Building Docker image"
  dc build --no-cache
  ok "Build complete."
}

seed_data() {
  check_docker
  hdr "Seeding sample data"
  info "Running seed script inside backend container..."
  dc exec backend sh -c "cd /app/apps/backend && npx tsx prisma/seed.ts"
  ok "Seed complete. Refresh the dashboard to see data."
}

# Usage
usage() {
  echo "Usage: $0 [command]"
  echo ""
  echo "  (no args)   Menu"
  echo "  docker      Start with Docker (foreground) — includes GPU Whisper + Ollama"
  echo "  up          Start with Docker in background (-d)"
  echo "  local       Start with local Node + Python (npm run dev)"
  echo "  stop        Stop all services (Docker + local background processes)"
  echo "  logs        Tail Docker logs"
  echo "  build       Rebuild Docker image"
  echo "  seed        Seed 90 days of sample data"
  echo "  models      Pull AI models (Ollama + Whisper) for local mode"
}

# Menu
menu() {
  echo ""
  echo -e "${BOLD}Polaris${NC}"
  echo "  1) Start (Docker)     — recommended, includes GPU AI services"
  echo "  2) Start (Docker -d)  — run in background"
  echo "  3) Start (local)      — needs Node/npm + Python, uses npm run dev"
  echo "  4) Stop"
  echo "  5) Logs (Docker)"
  echo "  6) Build Docker image"
  echo "  7) Seed sample data"
  echo "  8) Pull AI models     — Ollama llama3.2:3b + Whisper"
  echo "  0) Exit"
  echo ""
  read -rp "  Choice [0-8]: " choice
  echo ""
  case "$choice" in
    1) run_docker        ;;
    2) run_docker_detached ;;
    3) run_local         ;;
    4) stop_all         ;;
    5) show_logs         ;;
    6) build_docker      ;;
    7) seed_data         ;;
    8) pull_models       ;;
    0) exit 0            ;;
    *) warn "Invalid: $choice"; menu ;;
  esac
}

# Entry
case "${1:-}" in
  docker) run_docker        ;;
  up)     run_docker_detached ;;
  local)  run_local         ;;
  stop)   stop_all          ;;
  logs)   show_logs         ;;
  build)  build_docker      ;;
  seed)   seed_data         ;;
  models) pull_models       ;;
  -h|--help) usage; exit 0   ;;
  "")     menu              ;;
  *)      err "Unknown: $1"; usage; exit 1 ;;
esac
