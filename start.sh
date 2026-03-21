#!/usr/bin/env bash
# Polaris — start / stop / logs (Docker or local)
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
  command -v npm >/dev/null 2>&1 || { err "npm not found."; exit 1; }
  [ -d node_modules ] || { info "Installing dependencies..."; npm install; ok "Dependencies installed"; }
  [ -d apps/backend/node_modules ] || { info "Workspace deps..."; npm install; }
  ok "Node $(node -v)"
}

run_docker() {
  check_docker
  hdr "Polaris — Docker"
  info "Starting backend + frontend (first run may build the image)..."
  echo ""
  dc up --build
}

run_docker_detached() {
  check_docker
  hdr "Polaris — Docker (background)"
  dc up -d --build
  echo ""
  ok "Running. Frontend: http://localhost:5173  |  Backend: http://localhost:3001"
  info "Stop with: ./start.sh stop   |   Logs: ./start.sh logs"
}

run_local() {
  check_local
  hdr "Polaris — Local"
  if [ ! -f apps/backend/data/polaris.db ] && [ ! -d apps/backend/data ]; then
    mkdir -p apps/backend/data
    (cd apps/backend && npx prisma migrate deploy && npx prisma generate) && ok "Database ready" || true
  fi
  info "Starting backend + frontend..."
  echo ""
  npm run dev
}

stop_all() {
  hdr "Stopping Polaris"
  dc down 2>/dev/null && ok "Docker containers stopped" || true
  pkill -f "tsx watch src/index.ts" 2>/dev/null || true
  pkill -f "vite" 2>/dev/null || true
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
  echo "  docker      Start with Docker (foreground)"
  echo "  up          Start with Docker in background (-d)"
  echo "  local       Start with local Node (npm run dev)"
  echo "  stop        Stop Docker containers"
  echo "  logs        Tail Docker logs"
  echo "  build       Rebuild Docker image"
  echo "  seed        Seed 90 days of sample data"
}

# Menu
menu() {
  echo ""
  echo -e "${BOLD}Polaris${NC}"
  echo "  1) Start (Docker)     — recommended, no Node needed"
  echo "  2) Start (Docker -d)  — run in background"
  echo "  3) Start (local)      — needs Node/npm, uses npm run dev"
  echo "  4) Stop"
  echo "  5) Logs (Docker)"
  echo "  6) Build Docker image"
  echo "  7) Seed sample data"
  echo "  0) Exit"
  echo ""
  read -rp "  Choice [0-7]: " choice
  echo ""
  case "$choice" in
    1) run_docker        ;;
    2) run_docker_detached ;;
    3) run_local         ;;
    4) stop_all         ;;
    5) show_logs         ;;
    6) build_docker      ;;
    7) seed_data         ;;
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
  -h|--help) usage; exit 0   ;;
  "")     menu              ;;
  *)      err "Unknown: $1"; usage; exit 1 ;;
esac
