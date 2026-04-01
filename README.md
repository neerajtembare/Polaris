# Polaris

Personal activity tracker. Log activities, track goals, see your streaks.

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | v20+ | Required for local mode |
| npm | v10+ | Bundled with Node |
| Docker | any recent | Required for Docker mode only |
| Python | 3.10+ | Optional — required only for voice input (`--with-ai`) |
| NVIDIA GPU + Toolkit | — | Optional — required only for `docker:ai` mode |

---

## Quick start

### Option A — Local (recommended for development)

```bash
# 1. First-time setup (run once after cloning)
./setup.sh

# 2. Start the app
npm run dev
```

Frontend: http://localhost:5173 — Backend: http://localhost:3001

### Option B — Docker (no Node needed)

```bash
# Core services only (backend + frontend)
./start.sh docker

# Or directly with Compose
docker compose up --build
```

### Option C — Docker with GPU AI features

Requires the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html).

```bash
./start.sh docker:ai

# Or directly with Compose
docker compose -f docker-compose.yml -f docker-compose.ai.yml up --build
```

This adds Whisper STT (port 8001) and Ollama LLM (port 11434).

---

## start.sh / start.ps1 reference

```
./start.sh [command] [flags]

  (none)              Start locally (same as 'local')
  local               Start with Node.js + npm run dev
  local --with-ai     Also start Ollama LLM + Whisper STT (CPU, base model)
  docker              Docker — core services (backend + frontend) only
  docker:ai           Docker — core + GPU AI services (needs NVIDIA Toolkit)
  stop                Stop local background processes
  seed                Seed 90 days of sample data
  check               Health-check all services
  logs                Tail Docker logs
```

Use `.\start.ps1` with the same commands on Windows PowerShell.

---

## Voice input (optional)

Voice input uses [Whisper](https://github.com/openai/whisper) for speech-to-text. It is **not required** — the app works fully without it. When unavailable, voice features gracefully return a "service unavailable" message.

| Mode | How it works |
|------|-------------|
| `local --with-ai` | Runs Whisper with `base` model on CPU — good enough for dev |
| `docker:ai` | Runs Whisper with `large-v3` model on GPU — best accuracy |

---

## Setup details (local mode)

`./setup.sh` does the following:

1. Checks Node v20+ and npm
2. Runs `npm install` for all workspaces
3. Builds the shared types package (`packages/shared`)
4. Creates `apps/backend/.env` with default values (if not present)
5. Applies database migrations and generates the Prisma client
6. Optionally seeds sample data (`./setup.sh --seed`)

> The SQLite database is stored at `apps/backend/data/polaris.db`.

---

## Other commands

| Command | Where | What it does |
|---------|-------|--------------|
| `npm run dev` | root | Start backend + frontend concurrently |
| `npm run build` | root | Build all packages |
| `npm run test` | root | Run all tests (Vitest) |
| `npm run typecheck` | root | TypeScript check (no emit) |
| `npm run lint` | `apps/backend` | ESLint |
| `npx prisma studio` | `apps/backend` | Open Prisma DB browser at localhost:5555 |
| `npx prisma migrate dev --name <name>` | `apps/backend` | Create a new migration |

---

## Project structure

```
apps/
  backend/        Fastify API (port 3001)
    prisma/       Schema + migrations
    src/
      routes/     API endpoints
      services/   Business logic
      controllers/
  frontend/       React + Vite (port 5173)
    src/
      pages/
      components/
      hooks/
      services/
packages/
  shared/         Shared TypeScript types
services/
  whisper/        Optional Whisper STT microservice (port 8001)
```

---

## API base URL

All endpoints are under `http://localhost:3001/api`:

- `GET/POST /api/goals`
- `GET/PATCH/DELETE /api/goals/:id`
- `GET /api/goals/:id/progress`
- `GET/POST /api/activities`
- `GET/PATCH/DELETE /api/activities/:id`
- `GET /api/activities/today`
- `GET /api/metrics/dashboard?period=week|month|year`

