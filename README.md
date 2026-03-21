# Polaris

Personal activity tracker. Log activities, track goals, see your streaks.

---

## Prerequisites

**Option A — Docker (no Node/npm needed)**  
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Docker Compose). Use the section **Running with Docker** below.

**Option B — Local Node**  
- **Node.js** v20+ (project uses v24 via nvm)
- **npm** v10+

If using nvm:
```bash
nvm install 24
nvm use 24
```

---

## Running with Docker

No need to install Node or npm.

**Option 1 — Start script (easiest)**

- **Windows (PowerShell):** `.\start.ps1` then choose 1, or `.\start.ps1 docker`
- **Mac/Linux / Git Bash:** `./start.sh` then choose 1, or `./start.sh docker`

**Option 2 — Compose directly**

```bash
docker compose up --build
```

- **Frontend:** http://localhost:5173  
- **Backend API:** http://localhost:3001  
- **Health:** http://localhost:3001/health  

The first run builds the image and runs DB migrations. Data is stored in a Docker volume (`polaris_data`) so it persists between runs.

To stop: `Ctrl+C` then `docker compose down` (or `./start.sh stop` / `.\start.ps1 stop`).

---

## Setup (local Node only)

Run the setup script (handles everything below automatically):

```bash
./setup.sh
```

Or manually:

```bash
npm install
cd apps/backend
npx prisma migrate deploy
npx prisma generate
cd ../..
```

> The SQLite database file is created at `apps/backend/data/polaris.db`.

---

## Running the app (local Node)

### Both at once (recommended)

From the repo root:

```bash
npm run dev
```

This starts backend on **http://localhost:3001** and frontend on **http://localhost:5173** concurrently.

### Backend only

```bash
cd apps/backend
npm run dev
```

### Frontend only

```bash
cd apps/frontend
npm run dev
```

---

## Other commands

| Command | Where | What it does |
|---------|-------|--------------|
| `npm run typecheck` | `apps/frontend` or `apps/backend` | TypeScript compile check (no emit) |
| `npm run lint` | `apps/frontend` | ESLint |
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
