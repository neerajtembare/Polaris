#!/usr/bin/env bash
# Polaris — one-time setup for local development
# Run once after cloning. Then start the app with: npm run dev
#
# Optional flags:
#   --seed    Populate the database with 90 days of sample data

set -euo pipefail

# ── Colours ────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*"; exit 1; }
info() { echo -e "${CYAN}→${NC} $*"; }

echo ""
echo "  ✦ Polaris — setup"
echo "  ─────────────────"
echo ""

# ── 1. Node.js v20+ ────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  fail "Node.js not found. Install Node v20+ from https://nodejs.org and re-run."
fi
NODE_MAJOR=$(node -e "process.stdout.write(String(process.versions.node.split('.')[0]))")
if [ "$NODE_MAJOR" -lt 20 ]; then
  fail "Node.js v20+ required (found v$(node -v)). Upgrade and re-run."
fi
ok "Node.js $(node -v)"

# ── 2. npm ─────────────────────────────────────────────────────────────────
if ! command -v npm &>/dev/null; then
  fail "npm not found."
fi
ok "npm $(npm -v)"

# ── 3. Install workspace dependencies ──────────────────────────────────────
echo ""
info "Installing workspace dependencies…"
npm install
ok "Dependencies installed"

# ── 4. Build shared types package ──────────────────────────────────────────
info "Building shared types package…"
npm run build --workspace=packages/shared
ok "Shared types built"

# ── 5. Create backend .env ─────────────────────────────────────────────────
if [ ! -f apps/backend/.env ]; then
  cat > apps/backend/.env <<'ENVEOF'
DATABASE_URL="file:./data/polaris.db"
PORT=3001
NODE_ENV=development
ENVEOF
  ok "Created apps/backend/.env"
else
  ok "apps/backend/.env already exists — skipped"
fi

# ── 6. Create data directory ───────────────────────────────────────────────
mkdir -p apps/backend/data
ok "Data directory ready"

# ── 7. Apply database migrations ───────────────────────────────────────────
echo ""
info "Applying database migrations…"
(cd apps/backend && npx prisma migrate deploy)
ok "Migrations applied"

info "Generating Prisma client…"
(cd apps/backend && npx prisma generate)
ok "Prisma client generated"

# ── 8. Seed sample data (optional) ─────────────────────────────────────────
if [[ "${1:-}" == "--seed" ]]; then
  echo ""
  info "Seeding sample data…"
  npm run db:seed --workspace=apps/backend 2>/dev/null || \
    (cd apps/backend && npx tsx prisma/seed.ts)
  ok "Sample data seeded"
fi

# ── Done ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "  Start the app:        npm run dev"
echo "  With AI voice/LLM:    ./start.sh local --with-ai"
echo "  Via Docker (core):    ./start.sh docker"
echo ""
