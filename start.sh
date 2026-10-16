#!/usr/bin/env bash
# Polaris — start / stop / check
#
# Usage:
#   ./start.sh                    start locally (Node.js + npm run dev)
#   ./start.sh local              same as above
#   ./start.sh local --with-ai    also start Ollama LLM + Whisper STT (CPU)
#   ./start.sh docker             start with Docker — core services only
#   ./start.sh docker:ai          start with Docker + GPU AI overlay
#   ./start.sh stop               stop local background processes
#   ./start.sh seed               seed sample data into the database
#   ./start.sh check              health-check all services
#   ./start.sh logs               tail Docker logs
#
# First run?  ./setup.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Colours ────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
err()  { echo -e "${RED}✗${NC} $*"; }
info() { echo -e "${CYAN}→${NC} $*"; }

# Docker Compose wrapper — supports both v2 ("docker compose") and legacy "docker-compose"
dc() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  else
    docker-compose "$@"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Prerequisite checks
# ─────────────────────────────────────────────────────────────────────────────

check_docker() {
  command -v docker >/dev/null 2>&1 || { err "Docker not found. Install Docker Desktop."; exit 1; }
  docker info >/dev/null 2>&1       || { err "Docker daemon not running. Start Docker first."; exit 1; }
  ok "Docker ready"
}

ensure_local_deps() {
  command -v node >/dev/null 2>&1 || { err "Node not found. Run ./setup.sh first, or use: ./start.sh docker"; exit 1; }
  command -v npm  >/dev/null 2>&1 || { err "npm not found. Run ./setup.sh first."; exit 1; }
  [ -d node_modules ] || { info "Installing dependencies…"; npm install; ok "Dependencies installed"; }
  ok "Node $(node -v)"
}

ensure_env() {
  if [ ! -f apps/backend/.env ]; then
    warn "apps/backend/.env not found — creating defaults."
    warn "Run ./setup.sh for a full first-time setup."
    cat > apps/backend/.env <<'ENVEOF'
DATABASE_URL="postgresql://polaris:polaris@localhost:5432/polaris_dev"
PORT=3001
NODE_ENV=development

WHISPER_URL=http://localhost:8001
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
AI_PROVIDER=ollama
ENVEOF
    ok "Created apps/backend/.env"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Optional AI services (local mode, non-blocking — app works without them)
# ─────────────────────────────────────────────────────────────────────────────

start_ollama() {
  local OLLAMA_CMD
  OLLAMA_CMD=$(command -v ollama 2>/dev/null || command -v ollama.exe 2>/dev/null || true)
  local OLLAMA_MODEL_LOCAL
  OLLAMA_MODEL_LOCAL=$(grep OLLAMA_MODEL apps/backend/.env 2>/dev/null | cut -d= -f2 | tr -d '"' | tr -d ' ' || echo 'llama3.2:3b')
  [ -z "$OLLAMA_MODEL_LOCAL" ] && OLLAMA_MODEL_LOCAL="llama3.2:3b"

  if curl -sf --max-time 2 http://localhost:11434/api/tags >/dev/null 2>&1; then
    ok "Ollama server is running (http://localhost:11434)"
    if [ -n "$OLLAMA_CMD" ] && ! curl -sf --max-time 2 http://localhost:11434/api/tags | grep -q "\"name\":\"${OLLAMA_MODEL_LOCAL}"; then
      info "Pulling ${OLLAMA_MODEL_LOCAL} model (first run only)…"
      "$OLLAMA_CMD" pull "${OLLAMA_MODEL_LOCAL}"
    fi
    ok "Ollama ready (${OLLAMA_MODEL_LOCAL})"
    return 0
  fi

  if [ -z "$OLLAMA_CMD" ]; then
    warn "Ollama not running and command not found — AI local inference unavailable (install: https://ollama.ai)"
    return 0
  fi
  info "Starting Ollama server in background…"
  "$OLLAMA_CMD" serve >/dev/null 2>&1 &
  sleep 3

  if ! "$OLLAMA_CMD" list 2>/dev/null | grep -q "${OLLAMA_MODEL_LOCAL}"; then
    info "Pulling ${OLLAMA_MODEL_LOCAL} model (first run only)…"
    "$OLLAMA_CMD" pull "${OLLAMA_MODEL_LOCAL}"
  fi
  ok "Ollama ready (${OLLAMA_MODEL_LOCAL})"
}

start_whisper() {
  local PY
  PY=$(command -v python3 2>/dev/null || command -v python 2>/dev/null || true)
  if [ -z "$PY" ]; then
    warn "Python 3 not found — voice input unavailable (install Python 3.10+)"
    return 0
  fi

  local VENV_DIR="$SCRIPT_DIR/services/whisper/venv"
  if [ ! -d "$VENV_DIR" ]; then
    info "Creating Python venv for Whisper…"
    "$PY" -m venv "$VENV_DIR"
  fi
  local VENV_PY="$VENV_DIR/bin/python"

  if ! "$VENV_PY" -c "import uvicorn" >/dev/null 2>&1; then
    info "Installing Whisper service dependencies (this downloads ~1.5GB of PyTorch/CUDA wheels, please wait)..."
    "$VENV_PY" -m pip install -r services/whisper/requirements.txt
    ok "Whisper dependencies installed"
  fi

  if curl -sf --max-time 2 http://localhost:8001/health >/dev/null 2>&1; then
    ok "Whisper already running (port 8001)"
    return 0
  fi

  info "Starting Whisper service in background (CPU, base model — logs: /tmp/polaris-whisper.log)…"
  # Use CPU + base model for local dev (fast to load, no GPU required)
  (cd "$SCRIPT_DIR/services/whisper" && \
    WHISPER_MODEL=base WHISPER_DEVICE=cpu WHISPER_COMPUTE_TYPE=int8 \
    "$VENV_PY" -m uvicorn main:app --host 0.0.0.0 --port 8001 \
    >/tmp/polaris-whisper.log 2>&1) &
  echo $! > /tmp/polaris-whisper.pid

  local retries=0
  while [ $retries -lt 30 ]; do
    if curl -sf --max-time 2 http://localhost:8001/health >/dev/null 2>&1; then
      ok "Whisper ready (base model, CPU)"
      return 0
    fi
    sleep 2; retries=$((retries + 1))
  done
  warn "Whisper slow to start — voice may not be ready yet (check /tmp/polaris-whisper.log)"
}

# ─────────────────────────────────────────────────────────────────────────────
# Commands
# ─────────────────────────────────────────────────────────────────────────────

cmd_local() {
  ensure_local_deps
  ensure_env
  if [[ "${1:-}" == "--with-ai" ]]; then
    echo ""
    info "Starting optional AI services…"
    start_ollama
    start_whisper
  fi
  echo ""
  # Show AI service status before launching
  local w_ok o_ok
  curl -sf --max-time 2 http://localhost:8001/health    >/dev/null 2>&1 && w_ok=1 || w_ok=0
  curl -sf --max-time 2 http://localhost:11434/api/tags >/dev/null 2>&1 && o_ok=1 || o_ok=0
  echo "  AI service status:"
  [ "$w_ok" -eq 1 ] && echo -e "  ${GREEN}✓${NC} Whisper  http://localhost:8001  (voice input active)" \
                     || echo -e "  ${YELLOW}!${NC} Whisper  not running              (voice input disabled — run with --with-ai)"
  [ "$o_ok" -eq 1 ] && echo -e "  ${GREEN}✓${NC} Ollama   http://localhost:11434 (AI parsing active)" \
                     || echo -e "  ${YELLOW}!${NC} Ollama   not running              (AI parsing disabled — run with --with-ai)"
  echo ""
  info "Starting backend + frontend…"
  npm run dev
}

cmd_menu() {
  echo ""
  echo -e "  ${CYAN}Polaris — Start Menu${NC}"
  echo ""
  echo "  1) Local   (Node.js, no AI)"
  echo "  2) Local + AI   (Node.js + Whisper STT + Ollama LLM)"
  echo "  3) Docker  (core services only)"
  echo "  4) Docker + AI  (GPU — requires NVIDIA Container Toolkit)"
  echo "  5) Check service status"
  echo "  6) Stop local processes"
  echo "  q) Quit"
  echo ""
  printf "  Choose [1-6/q]: "
  read -r choice
  echo ""
  case "$choice" in
    1) cmd_local ;;
    2) cmd_local --with-ai ;;
    3) cmd_docker ;;
    4) cmd_docker_ai ;;
    5) cmd_check ;;
    6) cmd_stop ;;
    q|Q) echo "Bye."; exit 0 ;;
    *) err "Invalid choice: $choice"; exit 1 ;;
  esac
}

cmd_docker() {
  check_docker
  info "Starting core services (backend + frontend)…"
  info "Voice/AI features are disabled in core mode. Use 'docker:ai' for GPU support."
  echo ""
  dc up --build
}

cmd_docker_ai() {
  check_docker
  info "Starting all services with GPU AI support (Whisper + Ollama)…"
  info "Requires NVIDIA Container Toolkit — see docker-compose.ai.yml for details."
  echo ""
  dc -f docker-compose.yml -f docker-compose.ai.yml up --build
}

cmd_stop() {
  info "Stopping local Polaris processes…"
  pkill -f "tsx watch src/index.ts" 2>/dev/null && ok "Backend stopped"  || true
  pkill -f "vite"                   2>/dev/null && ok "Frontend stopped" || true
  if [ -f /tmp/polaris-whisper.pid ]; then
    kill "$(cat /tmp/polaris-whisper.pid)" 2>/dev/null && ok "Whisper stopped" || true
    rm -f /tmp/polaris-whisper.pid
  fi
  pkill -f "uvicorn main:app" 2>/dev/null || true
  ok "Done. (To stop Docker containers: docker compose down)"
}

cmd_seed() {
  ensure_local_deps
  info "Seeding sample data…"
  npm run db:seed --workspace=apps/backend 2>/dev/null || \
    (cd apps/backend && npx tsx prisma/seed.ts)
  ok "Sample data seeded"
}

cmd_check() {
  local b_ok f_ok w_ok o_ok
  echo ""
  echo "  Service health:"
  curl -sf --max-time 2 http://localhost:3001/health    >/dev/null 2>&1 && b_ok=1 || b_ok=0
  curl -sf --max-time 2 http://localhost:5173           >/dev/null 2>&1 && f_ok=1 || f_ok=0
  curl -sf --max-time 2 http://localhost:8001/health    >/dev/null 2>&1 && w_ok=1 || w_ok=0
  curl -sf --max-time 2 http://localhost:11434/api/tags >/dev/null 2>&1 && o_ok=1 || o_ok=0
  [ "$b_ok" -eq 1 ] && echo -e "  ${GREEN}✓${NC} Backend  http://localhost:3001" \
                     || echo -e "  ${RED}✗${NC} Backend  http://localhost:3001 (not running)"
  [ "$f_ok" -eq 1 ] && echo -e "  ${GREEN}✓${NC} Frontend http://localhost:5173" \
                     || echo -e "  ${RED}✗${NC} Frontend http://localhost:5173 (not running)"
  [ "$w_ok" -eq 1 ] && echo -e "  ${GREEN}✓${NC} Whisper  http://localhost:8001" \
                     || echo -e "  ${YELLOW}!${NC} Whisper  http://localhost:8001 (optional — not running)"
  [ "$o_ok" -eq 1 ] && echo -e "  ${GREEN}✓${NC} Ollama   http://localhost:11434" \
                     || echo -e "  ${YELLOW}!${NC} Ollama   http://localhost:11434 (optional — not running)"
  echo ""
}

cmd_logs() {
  check_docker
  dc logs -f
}

usage() {
  echo ""
  echo "  Usage: ./start.sh [command] [flags]"
  echo ""
  echo "  Commands:"
  echo "    (none)              Show interactive start menu"
  echo "    local               Start with Node.js + npm run dev"
  echo "    local --with-ai     Also start Ollama LLM + Whisper STT (CPU, base model)"
  echo "    docker              Docker — core services (backend + frontend) only"
  echo "    docker:ai           Docker — core + GPU AI services (needs NVIDIA Toolkit)"
  echo "    stop                Stop local background processes"
  echo "    seed                Seed 90 days of sample data"
  echo "    check               Health-check all services"
  echo "    logs                Tail Docker logs"
  echo ""
  echo "  First run?  ./setup.sh"
  echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

case "${1:-menu}" in
  menu)        cmd_menu ;;
  local)       cmd_local "${2:-}" ;;
  docker)      cmd_docker ;;
  docker:ai)   cmd_docker_ai ;;
  stop)        cmd_stop ;;
  seed)        cmd_seed ;;
  check)       cmd_check ;;
  logs)        cmd_logs ;;
  help|--help|-h) usage ;;
  *)
    err "Unknown command: $1"
    usage
    exit 1
    ;;
esac
