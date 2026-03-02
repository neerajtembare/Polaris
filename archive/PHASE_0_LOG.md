# Phase 0 — Foundation Log

**Branch:** `phase/0-foundation`  **Started:** 2026-03-02  
**Completed:** 2026-03-02  
**Status:** 🟢 Complete (archived)

---

## Goal

Stand up the full monorepo skeleton so that:
- `npm run dev` from root starts both backend and frontend
- Backend health endpoint confirms Fastify + SQLite/Prisma are working
- Frontend Vite app loads in browser
- All shared TypeScript types are in a shared package
- Database schema is migrated with Goals, Activities, Events tables

No user-facing features. Just infra.

---

## Milestones

| Step | Description | Status |
|------|-------------|--------|
| 0.1 | Project setup (monorepo, TypeScript, ESLint, git config) | ✅ Done |
| 0.2 | Backend setup (Fastify, health endpoint) | ✅ Done |
| 0.3 | Database setup (Prisma schema, SQLite migration) | ✅ Done |
| 0.4 | Frontend setup (Vite React, Tailwind, TanStack Query, routing) | ✅ Done |
| 0.5 | Shared package (shared TypeScript types) | ✅ Done |
| 0.6 | Dev workflow (root `npm run dev` starts everything) | ✅ Done |

---

## Session Log

### 2026-03-02 — Session 1
- [x] Created root monorepo: `package.json` (npm workspaces), `tsconfig.base.json`, `.gitignore`, `.prettierrc`
- [x] Backend: Fastify v5 + `@fastify/cors` + `@fastify/helmet` + Prisma + Zod + dotenv
- [x] Backend: `app.ts`, `index.ts`, `config/`, `lib/prisma.ts`, `routes/index.ts` (health endpoint)
- [x] Database: Prisma schema (Goal, Activity, Event), migration `20260302_init`, `polaris.db` created
- [x] Frontend: Vite + React 19 + Tailwind CSS + TanStack Query + Zustand + react-router-dom v7
- [x] Frontend: `main.tsx`, `App.tsx`, `pages/Dashboard.tsx`, Tailwind configured
- [x] Shared package: `@polaris/shared` — Goal, Activity, API response types
- [x] Root `npm run dev` starts backend :3001 + frontend :5173 via `concurrently`
- [x] TypeScript strict mode — zero errors on backend and frontend

---

## Decisions Made This Phase

| Decision | Choice | Reason |
|----------|--------|--------|
| Backend framework | Fastify v5 (not Express) | Defined in tech stack — typed schemas, JSON serialization, significantly faster |
| ORM | Prisma 6.x | Defined in tech stack — type-safe, schema-first, great DX |
| Database | SQLite via Prisma | Local-first; file lives at `apps/backend/data/polaris.db` |
| TS strictness | `exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true` | Strictest mode catches real bugs early; established a spread-guard pattern `...(x !== undefined && { key: x })` used throughout |
| Monorepo tooling | npm workspaces (no Turborepo) | Simplest approach for 2 apps + 1 shared package; avoids tooling overhead |
| Frontend meta-framework | Plain Vite + React (not Next.js) | Per tech stack; local-first app doesn't need SSR |
| Logger transport | Conditional object (not `undefined` prop) | Fastify v5 strict types reject `transport: undefined`; use ternary returning distinct `as const` objects |
| ESLint | Deferred to Phase 1 | Kept Phase 0 moving; ESLint config not blocking any dev work |

---

## Known Issues / Blockers

| Issue | Status |
|-------|--------|
| ESLint not configured | ⏳ Intentionally deferred — not blocking dev; carry to Phase 1 |
| VS Code language server shows ~12 false-positive errors | ℹ️ `tsc --noEmit` exits 0 on both workspaces. Prisma 6 `ActivityGetPayload` type is a language server caching artifact — not a real error |

---

## Files Created This Phase

| File | Purpose |
|------|---------|
| `package.json` (root) | Workspaces config, `concurrently` dev script |
| `tsconfig.base.json` | Shared strict TS config — all apps extend this |
| `.gitignore` | Excludes node_modules, dist, .env, *.db, prisma migrations |
| `.prettierrc` | Shared formatting config |
| `apps/backend/package.json` | `@polaris/backend` — Fastify, Prisma, Zod |
| `apps/backend/tsconfig.json` | Extends base, ESM (`NodeNext`) |
| `apps/backend/.env` | `DATABASE_URL`, `PORT=3001` (gitignored) |
| `apps/backend/src/index.ts` | Entry point — starts server |
| `apps/backend/src/app.ts` | Fastify factory + global error handler |
| `apps/backend/src/config/index.ts` | Reads env vars safely |
| `apps/backend/src/lib/prisma.ts` | PrismaClient singleton |
| `apps/backend/src/lib/errors.ts` | AppError, notFound(), badRequest() |
| `apps/backend/src/routes/index.ts` | Root router — /health + sub-routers |
| `apps/backend/prisma/schema.prisma` | Goal, Activity, Event models |
| `apps/frontend/package.json` | `@polaris/frontend` — Vite, React 19, Tailwind |
| `apps/frontend/tsconfig.json` | Bundler resolution, allowImportingTsExtensions |
| `apps/frontend/vite.config.ts` | Proxy /api + /health → :3001 |
| `apps/frontend/tailwind.config.js` | Content paths, dark default |
| `apps/frontend/src/main.tsx` | QueryClient + BrowserRouter + StrictMode |
| `apps/frontend/src/App.tsx` | Routes shell |
| `apps/frontend/src/pages/Dashboard.tsx` | Placeholder landing page |
| `packages/shared/src/types/goal.ts` | Goal, GoalTimeframe, GoalStatus, Create/Update inputs |
| `packages/shared/src/types/activity.ts` | Activity, ActivityType, ActivityCategory, ActivityStatus |
| `packages/shared/src/types/api.ts` | ApiSuccess, ApiSuccessPaginated, ApiError, ApiResponse |

---

## Done Criteria

- [x] `npm run dev` from root starts backend on :3001 and frontend on :5173
- [x] `GET /health` returns `{ status: "healthy", database: "connected" }`
- [x] Frontend loads in browser with basic shell (no white screen errors)
- [x] Prisma migration applied — `polaris.db` exists with goals/activities/events tables
- [x] TypeScript compiles with zero errors on both apps
- [ ] ESLint passes on both apps ← **intentionally deferred; carry to Phase 1**

**Archived** → `archive/PHASE_0_LOG.md`  
**Next** → `PHASE_1_LOG.md`

