#!/usr/bin/env bash
set -euo pipefail

# ── Colours ────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*"; exit 1; }

echo ""
echo "  ✦ Polaris — setup"
echo "  ─────────────────"
echo ""

# ── 1. Node.js ─────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  fail "Node.js not found. Install Node v20+ (https://nodejs.org) then re-run."
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

# ── 3. Install dependencies ────────────────────────────────────────────────
echo ""
echo "Installing dependencies…"
npm install
ok "Dependencies installed"

# ── 4. Prisma — generate client ────────────────────────────────────────────
echo ""
echo "Setting up database…"

# Ensure the data directory exists
mkdir -p apps/backend/data

cd apps/backend

npx prisma migrate deploy
ok "Migrations applied"

npx prisma generate
ok "Prisma client generated"

cd ../..

# ── Done ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}All done!${NC} Start the app with:"
echo ""
echo "  npm run dev"
echo ""
