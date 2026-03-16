# Polaris — Expert Architecture & Code Review

**Reviewer perspective:** Senior developer / software architect  
**Scope:** Backend (Fastify + Prisma), frontend (React + Vite + TanStack Query), shared types, and working logic  
**Date:** March 2026  

---

## Executive Summary

Polaris is a well-intentioned, doc-driven monorepo with a clear **Routes → Controllers → Services → Prisma** backend and a **React + TanStack Query** frontend. The ADL (Architecture Decision Log) is a strong asset. Several **contract and type mismatches** between frontend and backend cause real bugs (including a broken Dashboard goal-progress section), and there are clear opportunities to improve consistency, testability, and long-term maintainability.

---

## 1. What’s Working Well

### 1.1 Backend layering and ADL

- **Strict layering** is applied: routes define schemas and delegate to controllers; controllers map HTTP to service calls; services own all Prisma usage. This matches ADR-013 and is easy to reason about.
- **Centralized error handling**: `AppError` + `handleError` in controllers and a global Fastify error handler give a consistent `{ success, error: { code, message, details? } }` envelope.
- **Event logging** for goals and activities is implemented in services and is non-fatal (log and continue), which is appropriate for audit/analytics.
- **ADL (08_architecture_decision_log.md)** documents technology and design choices (Fastify, Prisma, soft delete, computed progress, event sourcing, etc.) and will help future you or contributors.

### 1.2 Frontend structure

- **Single API client** in `services/api.ts` with a clear `ApiRequestError` and typed `get/post/patch/del` keeps network logic in one place.
- **TanStack Query** is used correctly: query key factories (`goalKeys`, `activityKeys`, `metricsKeys`), mutations invalidating the right caches, and sensible `staleTime` / `refetchInterval` for today and metrics.
- **Shared types** in `@polaris/shared` (Goal, Activity, Create/Update inputs) are used on both sides and reduce drift at the type level.

### 1.3 Monorepo and tooling

- **npm workspaces** with `apps/backend`, `apps/frontend`, `packages/shared` are set up cleanly; `packages/shared` is a good place for API contracts and DTOs.
- **Vite proxy** for `/api` and `/health` to the backend is correct for local dev.
- **Prisma** schema is the single source of truth for the DB; indexes and soft-delete strategy are thought through.

---

## 2. Critical Issues (Bugs & Contract Mismatches)

### 2.1 Dashboard goal progress: wrong field names and missing data

**Location:** `apps/frontend/src/pages/Dashboard.tsx`, `apps/frontend/src/hooks/useMetrics.ts`, `apps/backend/src/services/metrics.service.ts`

**Problem:**

- Backend `getDashboardMetrics()` returns `goalProgress` as:
  ```ts
  { goalId: string; title: string; percentage: number | null }
  ```
- Frontend `GoalProgressEntry` and Dashboard expect:
  - `goalTitle` (backend sends `title`)
  - `targetValue`, `currentValue`, `unit` (backend does **not** send these in the dashboard payload)

**Effect:** Goal titles are `undefined` in the UI; the “X / Y unit” line shows `undefined / undefined`, so the Dashboard goal-progress block is broken.

**Fix (choose one):**

- **Option A (recommended):** Extend the backend dashboard `goalProgress` item to include `title` (or alias as `goalTitle`), `currentValue`, `targetValue`, `unit` so the existing UI works. Align frontend type `GoalProgressEntry` with this response.
- **Option B:** Simplify the Dashboard to only show goal title + percentage (no “X / Y unit”) and fix the frontend type to use `title` instead of `goalTitle`.

### 2.2 Query parameter casing: goals API

**Location:** `apps/frontend/src/hooks/useGoals.ts`, backend `routes/goals.ts` and `controllers/goal.controller.ts`

**Problem:** Backend expects **snake_case** query params (`include_progress`, `include_children`, `parent_id`, etc.). The frontend sends **camelCase** (`includeProgress`, `includeChildren`). So `request.query.include_progress` is always `undefined` and progress is never included when requested from the list/detail endpoints.

**Fix:** In `useGoals.ts` (and anywhere else calling the goals API), send query params in the API’s contract shape, e.g. `include_progress`, `include_children`, `parent_id`. Either:

- Map in the hook: `include_progress: filter.includeProgress`, etc., or
- Introduce a small API param mapper in `api.ts` for “frontend camelCase → backend snake_case” for query strings, and use it consistently.

### 2.3 API response type for list endpoints

**Location:** `apps/frontend/src/services/api.ts`

**Problem:** `request<T>()` returns the **full** response body (e.g. `{ success: true, data: T[], meta? }`). Callers then do `(await api.get<SomeResponse>(...)).data`. That’s correct, but the generic `api.get<GoalListResponse>()` is typed as returning `GoalListResponse`; the comment says “returns full response” but the type parameter is the full response type, not the inner `data` type. This is minor but can confuse and lead to wrong typing (e.g. typing `api.get` as returning `Goal[]` would be wrong).

**Recommendation:** Either document clearly that `T` is the full response shape (so `api.get<GoalListResponse>()` returns `GoalListResponse`) and keep current usage, or introduce a dedicated “data only” helper and type that so list/detail call sites don’t have to remember to use `.data`.

---

## 3. Architecture & Design Improvements

### 3.1 Single source of truth for API contracts

**Current state:** Response shapes are duplicated: e.g. `GoalProgress` in backend `goal.service.ts`, `GoalProgressEntry` in frontend `useMetrics.ts`, and dashboard payload in `metrics.service.ts`. Activity list response shape is defined in backend service and again in frontend hooks.

**Recommendation:**

- Move **API response DTOs** (at least for public endpoints) into `packages/shared` (e.g. `types/api-responses.ts` or per-domain files). Backend and frontend both import from shared.
- Optionally add a short “API contract” doc or OpenAPI fragment that lists path + request/response shapes; `Docs/10_api_contract.md` can be the human-readable mirror.
- For the dashboard in particular, define something like `DashboardMetricsResponse` and `GoalProgressEntry` in shared and use them in both backend and frontend so the bug in §2.1 cannot recur.

### 3.2 Request body and query param casing

**Current state:** Activities API uses **snake_case** in request body (and controller maps to camelCase for the service). Goals API uses **camelCase** in the backend (Prisma/model) but route schemas and docs sometimes mention snake_case. Frontend sends camelCase for goals and converts to snake_case for activities in the hook.

**Recommendation:**

- Pick one convention for the **external API** (REST): either all **snake_case** (common in JSON APIs) or all **camelCase**. Document it in `10_api_contract.md`.
- If you standardize on snake_case for the API:
  - Use one place to convert: either in the frontend API client (body + query) or in a backend middleware that normalizes to camelCase before controllers. That way controllers and services can consistently use camelCase.
- If you standardize on camelCase, change activity routes/schemas to accept camelCase and remove the manual mapping in the activity controller and the `toSnakeCase` / `toUpdateSnakeCase` helpers in the frontend.

### 3.3 Backend: validation and schema reuse

**Current state:** Routes use inline JSON Schema for body/querystring/response. This is clear but leads to duplication (e.g. goal properties repeated in list vs detail response) and no shared types between OpenAPI/schema and TypeScript.

**Recommendation:**

- Consider generating JSON Schema from `@polaris/shared` types (e.g. with `ts-json-schema-generator` or similar) so the API schema and TS types stay in sync.
- Or define schemas once (e.g. in a `schemas/` folder) and reference them in route definitions. That reduces drift and keeps validation and types aligned.

### 3.4 Metrics service: N+1 and “today” semantics

**Location:** `apps/backend/src/services/metrics.service.ts`

**Observations:**

- **Goal progress:** For each of the top 10 goals you run a separate `prisma.activity.aggregate`. This is a small N+1 (10 queries). For scalability you could fetch all relevant activities for those goal IDs in one or two queries and aggregate in memory, or use a raw query that groups by goal.
- **Streaks:** You load **all** completed activity dates ever (`findMany` with no date filter) to compute current/longest streak. For large datasets this will get heavy. Consider:
  - Capping the lookback (e.g. last 2 years) for “longest streak”, and/or
  - A periodic job that materializes “streak as of date X” if you need to scale.
- **“Today”:** `getTodayActivities()` and dashboard use **server local date** (`new Date().toISOString().split('T')[0]`). For a single-user local app this is acceptable, but for future multi-timezone or “user’s today” you’d want a timezone or explicit date from the client.

### 3.5 Error handling and 4xx/5xx semantics

**Current state:** The global Fastify error handler maps status codes and hides message for 5xx. Controllers use `AppError` and `handleError`. This is good.

**Recommendation:**

- Ensure **validation errors** (e.g. invalid UUID, invalid enum) always return 400 with a stable `code` (e.g. `VALIDATION_ERROR`) and optional `details`, and that 404 is used only when a resource truly does not exist (or is soft-deleted and not exposed). This is mostly already in place; keep it consistent as you add endpoints.
- Consider **error codes** in shared (e.g. `NOT_FOUND`, `BAD_REQUEST`, `VALIDATION_ERROR`) as constants or a small enum in `packages/shared` so frontend can branch on `code` for i18n or specific UX.

### 3.6 Frontend: layout and routing

**Current state:** `App.tsx` only renders `<Routes>`; there’s no outer layout. `AppLayout` is used per-page (e.g. Dashboard, GoalsList). That’s fine but can lead to repetition and layout flicker if you add a global shell (nav, sidebar).

**Recommendation:**

- Consider a **layout route** (e.g. a route that renders `<Outlet />` wrapped in `AppLayout`) so you don’t wrap every page manually and the shell is consistent. React Router 6 supports this with nested routes.

### 3.7 Shared package: pagination and API envelope

**Current state:** `packages/shared` has `ApiSuccess`, `ApiSuccessPaginated` (with `page`), but the backend returns `meta: { total, limit, offset }` (no `page`). So the shared paginated type doesn’t match the actual API.

**Recommendation:** Align shared types with real responses: either add `offset` to the shared paginated type and keep `page` optional, or standardize on page-based pagination and have the backend return `page` instead of `offset`. Use one pagination model everywhere.

---

## 4. Testing and Reliability

### 4.1 No automated tests

**Current state:** No `*.test.*` or `*.spec.*` files were found. All behavior is only manually tested.

**Risk:** Regressions (like the dashboard goal progress and query param bugs) are easy to introduce and hard to notice.

**Recommendation:**

- **Backend:** Add a small test suite (e.g. Vitest or Jest) that:
  - Spins up a test DB (e.g. SQLite in-memory or a test file) and runs migrations.
  - Tests at least: goal CRUD, activity CRUD, soft delete, list filters, `getTodayActivities`, and `getDashboardMetrics` (with fixtures). You can call the service layer directly or hit the HTTP app (e.g. `fastify.inject()`).
- **Frontend:** Add a few integration or component tests for critical flows (e.g. “Dashboard loads and shows goal progress”, “create goal and see it in list”) with a mocked API or MSW. At minimum, unit tests for API client error handling and for hooks’ query key and invalidation logic (with mocked `api`).
- **Contract:** Optionally add a contract test (e.g. one test that builds the backend app, calls a few endpoints, and asserts response shape against shared types or a schema). That would have caught the dashboard `goalTitle` / `title` and missing fields.

### 4.2 Event table and metadata

**Current state:** `Event` stores `previousState` and `newState` as JSON strings. There’s no schema enforcement on that JSON. If the app evolves, old events may not match new code’s expectations.

**Recommendation:** Keep event payloads flexible, but consider a small version or `eventSchemaVersion` field so that when you add compaction or replay logic you can branch on version. Not urgent for MVP.

---

## 5. Security and Operations (Brief)

- **CORS** is correctly restricted in production (`origin: false`) and relaxed for dev; **Helmet** is on with CSP disabled (document if intentional).
- **No auth:** By design for local-first MVP. When you add sync or multi-user, introduce auth and scope all queries by user/tenant; the current structure (services owning Prisma) will make that scoping straightforward.
- **SQLite:** Path and env are documented. For production or multi-process, ensure `DATABASE_URL` and file permissions are correct and that you don’t run into locking under concurrency.

---

## 6. Summary of Recommended Actions

| Priority | Action |
|----------|--------|
| **P0** | Fix Dashboard goal progress: align backend response with frontend (add `title`/`goalTitle`, `currentValue`, `targetValue`, `unit` to dashboard `goalProgress`, or simplify UI and use `title`). |
| **P0** | Fix goals API query params: frontend must send `include_progress`, `include_children`, `parent_id` (snake_case) so progress and filters work. |
| **P1** | Move API response DTOs (especially dashboard and goal progress) to `packages/shared` and use them in both backend and frontend. |
| **P1** | Standardize request/query casing (snake vs camel) and document in API contract; centralize conversion in one place. |
| **P1** | Add backend (and optionally frontend) tests; at least service-level or route-level tests for goals, activities, and metrics. |
| **P2** | Align shared `ApiSuccessPaginated` with actual `meta: { total, limit, offset }` (or switch to page-based and document). |
| **P2** | Consider layout route so `AppLayout` wraps all pages in one place. |
| **P2** | Optimize metrics service: avoid N+1 for goal progress; consider capping or batching streak computation for large datasets. |

---

Overall, the architecture is sound and the codebase is readable and well-documented. Addressing the contract/type mismatches and adding a small test suite will significantly reduce bugs and make future changes (including AI features and sync) much safer.
