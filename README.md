# Polaris

Personal activity tracker. Log activities, track goals, see your streaks.

---

## Prerequisites

- **Node.js** v20+ (project uses v24 via nvm)
- **npm** v10+

If using nvm:
```bash
nvm install 24
nvm use 24
```

---

## Setup

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

## Running the app

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
