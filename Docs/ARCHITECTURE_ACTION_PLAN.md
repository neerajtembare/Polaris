# Polaris — Architecture Improvement Action Plan

**Purpose:** Track fixes and improvements from the [Architecture Review](./ARCHITECTURE_REVIEW.md). Work in sprints; check off items as you complete them.

**Source:** [ARCHITECTURE_REVIEW.md](./ARCHITECTURE_REVIEW.md)

**How to use:**
- Work one sprint at a time; complete all items (or explicitly defer) before moving on.
- Mark tasks with `[x]` when done; leave `[ ]` for pending.
- Update the "Sprint status" line at the top of each sprint when you finish it.
- If you skip or defer a task, add a short note under the task (e.g. "Deferred: reason").

---

## Sprint 0 — Critical fixes (DONE)

**Goal:** Fix bugs that break current behaviour.  
**Status:** ✅ Complete (done in review follow-up)

| ID | Task | Done |
|----|------|------|
| S0.1 | Fix Dashboard goal progress: backend returns `goalTitle`, `currentValue`, `targetValue`, `unit` for each goal in `/api/metrics/dashboard` | [x] |
| S0.2 | Fix goals API: frontend sends snake_case query params (`include_progress`, `include_children`) so progress/children load | [x] |
| S0.3 | Dashboard handles `percentage: null` when passing to `ProgressBar` (e.g. `g.percentage ?? 0`) | [x] |

**Done when:** Dashboard shows goal titles and progress; Goals list/detail show progress when requested.

---

## Sprint 1 — API contract & shared types

**Goal:** Single source of truth for API request/response shapes so frontend and backend stay in sync.  
**Status:** ✅ Complete

| ID | Task | Done |
|----|------|------|
| S1.1 | Add `packages/shared` types for **API responses** (not just domain models). Create e.g. `types/api-responses.ts` or extend existing files. | [x] |
| S1.2 | Define and export `DashboardMetrics` and `GoalProgressEntry` (dashboard payload) in shared; use in backend `metrics.service` and frontend `useMetrics`. | [x] |
| S1.3 | Define shared response type for paginated list (e.g. `PaginatedResponse<T>` with `data` + `meta: { total, limit, offset }`). Use in activities (and goals if/when paginated). | [x] |
| S1.4 | Align `ApiSuccessPaginated` in `packages/shared/src/types/api.ts` with real API: ensure `meta` has `total`, `limit`, `offset` (or add `page` and update backend). | [x] |
| S1.5 | Update `Docs/10_api_contract.md` with any new/updated response shapes for dashboard and list endpoints. | [x] |

**Done when:** Dashboard and list response types live in shared; both apps import them; no duplicate definitions in hooks or services.

---

## Sprint 2.5 — UX: Goal-activity consistency

**Goal:** When you pick a goal while logging an activity, the unit and type auto-fill from the goal. Goal forms use a visual unit picker instead of a free-text field.  
**Status:** ✅ Complete

| ID | Task | Done |
|----|------|------|
| S2.5.1 | Add `src/lib/units.ts` — `UNIT_PRESETS`, `PRESET_LABELS`, `inferActivityType()` | [x] |
| S2.5.2 | Add `UnitPicker` component — chip grid of presets + "Custom…" free-text fallback | [x] |
| S2.5.3 | `GoalCreate`: replace free-text unit input with `UnitPicker`; show hint when unit selected | [x] |
| S2.5.4 | `GoalDetail` edit form: replace free-text unit input with `UnitPicker` | [x] |
| S2.5.5 | `LogActivityForm`: when goal selected, auto-fill `unit` + infer `activityType` from goal's `targetUnit`; use `UnitPicker` for unit field; show "pre-filled from goal" hint | [x] |

**Done when:** Picking a goal in the log form fills unit + type; choosing a unit chip also syncs type; custom units still allowed.

---

## Sprint A — Bug fixes (DONE)

**Goal:** Fix three known bugs that affect daily use.  
**Status:** ✅ Complete

| ID | Task | Done |
|----|------|------|
| A.1 | Fix "Undo" on completed activity — was calling `onSkip` (→ `status: 'skipped'`) instead of restoring `status: 'planned'`. Added `onUndo` prop to `ActivityCard` and `handleUndo` in `TodayView`. | [x] |
| A.2 | Remove unreachable `DashCard` dead code in `Dashboard.tsx` — guard `!isLoading && !data && !isError` is logically impossible once any query resolves. Deleted the guard and the `DashCard` helper. | [x] |
| A.3 | Responsive mobile sidebar — added hamburger button + slide-out drawer to `AppLayout`. Desktop sidebar unchanged; mobile gets a top bar + animated drawer. | [x] |

**Done when:** Undo returns an activity to Planned; Dashboard renders without dead code; app is usable on mobile.

---

## Sprint B — Core daily-use UX (DONE)

**Goal:** Reduce typing friction and surface motivational signals during daily logging.  
**Status:** ✅ Complete

| ID | Task | Done |
|----|------|------|
| P1 | `rawInput` text box in `LogActivityForm` (AI plumbing, no calls yet). Optional "Describe what you did" textarea at the top of the form, wired to the existing `rawInput` DB field. Labelled "✨ coming soon: auto-fill". | [x] |
| U1 | `goalTemplates.ts` — keyword → unit/type suggestion map (~35 entries). Wired into `GoalCreate` with debounced title matching and dismissible suggestion strip ("Looks like a reading goal — track by pages?"). | [x] |
| U2 | Recent activity title chips in `LogActivityForm` — when a goal is selected, the last 5 distinct completed activity titles for that goal appear as one-click chips below the title input. Eliminates typing for recurring activities. | [x] |
| U3 | Streak badge on Today page header — `useMetrics('week')` fetched in `TodayView`; if `currentStreak > 0`, a `🔥 Nd streak` badge renders next to the "Today" heading. | [x] |
| U4 | Inline quick-complete value prompt on `ActivityCard` — tapping "✓ Done" on a `quantity` or `duration` activity (without a value) shows an inline "How many [unit]?" input before saving. `completion`-type activities still save immediately. | [x] |

**Done when:** All five items implemented and free of lint errors.

---

## Sprint C — AI parse + seed data (DONE)

**Goal:** Add realistic sample data for dashboard testing; wire up AI activity parsing with mock + optional real provider.  
**Status:** ✅ Complete

| ID | Task | Done |
|----|------|------|
| C0 | `prisma/seed.ts` — 4 goals (reading/running/savings/Python) + 90 days of activities. Idempotent ([Seed] prefix). Wired into `npm run db:seed` and `start.sh` / `start.ps1` option. | [x] |
| C1 | `ai.service.ts` — `AIProvider` interface, `MockProvider` (keyword matching, no API key), `OpenAIProvider` (opt-in via `AI_PROVIDER=openai`). Graceful fallback to mock on OpenAI failure. | [x] |
| C2 | `ai.controller.ts` + `routes/ai.ts` — `POST /api/ai/parse-activity`. Fetches active goals for context, returns `AIActivityParse` suggestion. Never mutates DB. Registered in `routes/index.ts`. | [x] |
| C3 | `AiSuggestionPanel.tsx` — Review card with per-field suggestion rows, confidence badge, low-confidence warning (<60%), "Apply" and "Dismiss" actions. | [x] |
| C4 | `LogActivityForm.tsx` updated — "✨ Parse with AI" button appears when `rawInput` has content. Loading spinner, AI error banner, `AiSuggestionPanel` below rawInput, one-click apply to form. | [x] |

**Known issues introduced / discovered during C:**
- Seed `reading` template uses `unit: 'books'` but `valueFn` generates page counts (15–45) — inflates book count to ~2000. Fix: change unit to `'pages'` or change valueFn. (See Sprint D.7)
- `AIActivityParse` type defined in both `ai.service.ts` and `AiSuggestionPanel.tsx` — should move to `@polaris/shared`. (See Sprint D.8)
- `suggestedGoalId` from OpenAI not validated against actual goal IDs — hallucinated ID could reach `POST /activities` and return 404. (See Sprint D.9)

---

## Sprint D — Critical bug fixes (new findings from full review)

**Goal:** Fix all runtime crashes, silent data loss, and broken features discovered during the March 2026 full review.  
**Status:** ✅ Complete

| ID | Task | Severity | Done |
|----|------|----------|------|
| D1 | `ActivitiesList.tsx`: add `onUndo` prop + `handleUndo` function sending `status: 'planned'`. | **Critical** | [x] |
| D2 | `ActivitiesList.tsx`: `handleComplete(id, value?)` — forward value from inline prompt to the mutation. | **Critical** | [x] |
| D3 | `routes/goals.ts`: add `progress` (full object schema) and `children` (array) to `GET /goals` and `GET /goals/:id` response schemas so Fastify no longer strips them. | **Critical** | [x] |
| D4 | `activity.service.ts` `dayBounds()`: replaced `setDate(getDate()+1)` with `setUTCDate(getUTCDate()+1)`. | High | [x] |
| D5 | `activity.service.ts`: added `endOfDay()` helper; changed `endDate` filter to `lte: endOfDay(endDate)`. | High | [x] |
| D6 | `useActivities` hook: added optional `{ enabled }` second argument. `LogActivityForm` passes `enabled: Boolean(form.goalId)`. | High | [x] |
| D7 | `prisma/seed.ts`: goal title changed to "[Seed] Read 7200 pages this year" (targetValue 7200, targetUnit 'pages'). Template unit fixed from 'books' to 'pages'. | Medium | [x] |
| D8 | `AIActivityParse` moved to `packages/shared/src/types/ai.ts`. `ai.service.ts` and `AiSuggestionPanel.tsx` now import from shared. `LogActivityForm` imports from `@polaris/shared` directly. | Medium | [x] |
| D9 | `ai.service.ts` `OpenAIProvider`: `suggestedGoalId` validated against `knownGoalIds` set; title resolved from actual goals array. | Medium | [x] |
| D10 | `activity.service.ts` `createActivity()`: `completedAt` now set to `activityDate` (not server time) for historical completed entries. | Medium | [x] |
| D11 | `activity.service.ts` `TodayActivities`: `planned/completed/skipped` changed from `unknown[]` to `ListedActivity[]`. Bracket notation `a['status']` replaced with `a.status`. | Medium | [x] |
| D12 | `TodayView.tsx`: replaced global `isPending` with `pendingIds: Set<string>`. Each card receives `isPending={pendingIds.has(activity.id)}`. `addPending`/`removePending` called via `onSettled`. | Medium | [x] |
| D13 | `useGoals.ts` `useGoal()`: query key changed to `[...goalKeys.detail(id), opts]` so different option combinations use separate cache entries. | Medium | [x] |
| D14 | `GoalDetail.tsx` `handleDelete()`: wrapped in try/catch; calls `setEditError(msg)` on failure. | Low | [x] |
| D15 | `ai.service.ts` `OpenAIProvider`: `JSON.parse(content)` wrapped in try/catch; falls back to mock on malformed JSON. | Low | [x] |
| D16 | `ai.service.ts`: typo `'journall'` → `'journal'` in completion keyword list. | Low | [x] |

---

## Sprint E — Shared types cleanup (new findings from full review)

**Goal:** Eliminate duplicated type definitions across backend/frontend. Move all contract types into `@polaris/shared` as the single source of truth.  
**Status:** ✅ Complete

| ID | Task | Done |
|----|------|------|
| E1 | `AIActivityParse` → `packages/shared/src/types/ai.ts`. Done in Sprint D. | [x] |
| E2 | `GoalProgress` + `GoalWithProgress` added to `packages/shared/src/types/goal.ts`. Backend `goal.service.ts` imports and re-exports from shared. Frontend `useGoals.ts` imports and re-exports from shared (existing page imports unaffected). | [x] |
| E3 | `ListedActivity` added to `packages/shared/src/types/activity.ts`. Frontend `useActivities.ts` imports and re-exports from shared. Backend keeps an internal Prisma-typed version (Date fields) as a non-exported type — this is intentional since the backend works with Prisma Date objects before JSON serialization. | [x] |
| E4 | `TodayActivities` added to `packages/shared/src/types/activity.ts` with typed `ListedActivity[]` arrays. Frontend `useActivities.ts` imports and re-exports. Backend retains a local non-exported interface using its internal Prisma Date types. | [x] |
| E5 | `isolatedModules: true` added to `apps/frontend/tsconfig.json`. Vite/esbuild transpilation edge-cases (e.g. `const enum` exports) now caught at edit time by the language server. | [x] |

---

## Sprint 2 — API casing & consistency

**Goal:** One convention for request/query/response (snake_case vs camelCase); document and enforce.  
**Status:** ✅ Complete

| ID | Task | Done |
|----|------|------|
| S2.1 | Decide and document in `10_api_contract.md`: REST API uses **snake_case** for query params and JSON body (or **camelCase** everywhere). | [ ] |
| S2.2 | If snake_case: Add a single place that converts (e.g. frontend `api.ts` maps camelCase → snake_case for body and query; or backend middleware normalizes to camelCase before controllers). | [ ] |
| S2.3 | Goals API: Ensure all query params use the chosen convention (currently backend expects snake_case; S0.2 fixed goals; verify activities and metrics). | [ ] |
| S2.4 | Activities API: Either (a) keep snake_case body and document it, with frontend continuing to send snake_case, or (b) switch to camelCase and remove `toSnakeCase` / `toUpdateSnakeCase` in frontend and update route schemas. | [ ] |
| S2.5 | Add a short "Casing" section in README or API contract doc so new endpoints follow the rule. | [ ] |

**Done when:** All API requests use one casing convention; conversion happens in one place; docs are updated.

---

## Sprint 3 — Testing

**Goal:** Basic automated tests so regressions (e.g. contract mismatches) are caught.  
**Status:** [ ] Not started

| ID | Task | Done |
|----|------|------|
| S3.1 | Backend: Add test runner (e.g. Vitest). Configure for Node, with test script in `apps/backend/package.json`. | [ ] |
| S3.2 | Backend: Set up test DB (e.g. SQLite in-memory or `file:test.db`) and run migrations in test setup. | [ ] |
| S3.3 | Backend: Tests for **goal.service** — create, get, list with filters, update, soft-delete, getGoalProgress. | [ ] |
| S3.4 | Backend: Tests for **activity.service** — create, get, list, getTodayActivities, update, soft-delete. | [ ] |
| S3.5 | Backend: Tests for **metrics.service** — getDashboardMetrics for week/month/year; assert shape of `goalProgress`, `activityByDay`, streaks. | [ ] |
| S3.6 | (Optional) Backend: Route-level tests with `fastify.inject()` for a few key endpoints (e.g. GET /api/goals, GET /api/metrics/dashboard). | [ ] |
| S3.7 | (Optional) Frontend: Add Vitest + React Testing Library; one or two tests for API client error handling or a hook with mocked API. | [ ] |

**Done when:** `npm run test` (or equivalent) in backend passes; critical paths (goals, activities, metrics) are covered.

---

## Sprint 4 — Frontend structure & DX

**Goal:** Cleaner routing and layout; minor DX improvements.  
**Status:** ✅ Complete

| ID | Task | Done |
|----|------|------|
| S4.1 | Use a **layout route**: wrap `Routes` in a parent route that renders `AppLayout` + `<Outlet />` so every page gets the layout without repeating `<AppLayout>` in each page. | [x] |
| S4.2 | (Optional) Document in README or a short dev doc: how to add a new API endpoint (backend route → controller → service) and a new frontend page/hook. | [x] |

**Done when:** New pages automatically get `AppLayout`; optional doc is in place.

---

## Sprint 5 — Backend performance & schema (optional)

**Goal:** Reduce N+1 and prepare for growth; keep validation in sync with types.  
**Status:** ✅ Complete (S5.1, S5.2 done; S5.3 deferred)

| ID | Task | Done |
|----|------|------|
| S5.1 | Metrics: Refactor goal progress so it doesn’t run one `aggregate` per goal. E.g. fetch all activities for the top goal IDs in one or two queries and aggregate in memory. | [x] |
| S5.2 | Metrics: Consider capping streak computation (e.g. last 2 years) or batching if activity count grows. | [x] |
| S5.3 | (Optional) Backend: Centralize or generate JSON Schema from shared types so route validation and TypeScript stay aligned. | [ ] |

**Done when:** Dashboard metrics avoid N+1; streak logic is bounded or documented.

---

## Sprint 6 — Future prep (when you add auth / sync / AI)

**Goal:** Items to do when you introduce users, sync, or heavier AI.  
**Status:** [ ] Not started

| ID | Task | Done |
|----|------|------|
| S6.1 | When adding auth: Scope all goal/activity/metrics queries by user (or tenant); add user/tenant to Prisma schema and services. | [ ] |
| S6.2 | Event model: Add something like `eventSchemaVersion` (or similar) to `Event` for future compaction/replay. | [ ] |

**Done when:** N/A until you start auth/sync work.

---

## Progress summary

| Sprint | Focus | Status |
|--------|--------|--------|
| 0 | Critical fixes | ✅ Done |
| 1 | API contract & shared types | ✅ Done |
| 2.5 | UX: goal-activity consistency | ✅ Done |
| A | Bug fixes (Undo, dead code, mobile nav) | ✅ Done |
| B | Core UX (rawInput, templates, chips, streak, inline complete) | ✅ Done |
| C | AI parse beta + seed data | ✅ Done |
| D | Critical bug fixes (runtime crashes, data loss, broken features) | ✅ Done |
| E | Shared types cleanup | ✅ Done |
| 2 | API casing & consistency | [x] |
| 3 | Testing | [ ] |
| 4 | Frontend structure & DX | [x] |
| 5 | Backend performance (optional) | [x] |
| 6 | Future prep | [ ] |

---

## Known architectural gaps (not sprint-tracked, document-only)

These are systemic issues that are accepted as intentional deferral for MVP. Document them so nothing is forgotten.

| Gap | Impact | Deferred until |
|-----|--------|----------------|
| No authentication / authorization — all endpoints are open | Any user on the network can access/modify all data | Sprint 6 |
| No rate limiting on any endpoint (esp. `/api/ai/parse-activity`) | AI endpoint can drain OpenAI quota or flood the event log | Sprint 6 |
| `logEvent` called outside DB transactions — event log can diverge from data on partial failure | Audit trail is unreliable | Sprint 6 |
| CORS set to `false` in production — frontend cannot reach backend in any deployed env | App is dev-only without a code change | Sprint 6 (or when deploying) |
| `handleError` copy-pasted in 3 controllers — maintenance hazard | Bug in error handler not caught in all controllers | Sprint 4 refactor |
| No pagination on `GET /api/goals` — returns all goals, unbounded | Performance degrades at scale | Sprint 5 |
| `computeProgress` re-fetches goal it already has (3 DB queries per progress) | N+1 on goal list with progress | Sprint 5 |
| Dashboard goal progress always all-time, ignores selected period | "Last week" shows all-time numbers — user confusion | Sprint 5 |
| Streak computation fetches entire activity history on every dashboard load | Full table scan grows linearly with usage | Sprint 5 |
| `getTodayActivities` uses UTC date — wrong day for non-UTC users | International users see wrong day's activities | Sprint 6 |
| No delete confirmation for activities (only goals have confirm dialog) | Inconsistent UX; activities deleted without warning | Sprint D or Sprint 4 |

---

## Changelog

- **2026-03:** Added action plan from architecture review. Sprint 0 marked complete (Dashboard + goals API fixes).
- **2026-03:** Sprint 1 complete. Added `packages/shared/src/types/api-responses.ts` (DashboardMetrics, GoalProgressEntry, MetricsPeriod). Aligned shared `api.ts` pagination with `meta: { total, limit, offset }`. Backend metrics.service and frontend useMetrics/api use shared types. Updated `Docs/10_api_contract.md` with dashboard and list response shapes.
- **2026-03:** Sprint 2.5 complete. Added `UnitPicker` component and `units.ts` util. GoalCreate + GoalDetail use visual unit picker. LogActivityForm auto-fills unit and infers activityType when a goal is selected.
- **2026-03:** Sprint A complete. Fixed Undo bug (status `planned` not `skipped`). Removed unreachable DashCard dead code. Added responsive mobile sidebar with hamburger + slide-out drawer.
- **2026-03:** Sprint B complete. Added `rawInput` textarea (AI plumbing). Added `goalTemplates.ts` with keyword-matching suggestion strip in GoalCreate. Added recent-title chips in LogActivityForm. Streak badge on Today header. Inline value prompt when completing quantity/duration activities.
- **2026-03:** Sprint C complete. Seed script (4 goals, 90 days of activities, idempotent). AI service (MockProvider + OpenAIProvider). `POST /api/ai/parse-activity` endpoint. `AiSuggestionPanel` component. "Parse with AI" button wired into LogActivityForm.
- **2026-03:** Full end-to-end code review completed (March 2026). Added Sprint D (16 critical/high/medium bugs), Sprint E (5 shared type cleanup tasks), and expanded architectural gap registry. Three runtime crashes identified: missing `onUndo` prop in ActivitiesList, value discarded in handleComplete, Fastify serializer silently dropping `progress`/`children` fields.
- **2026-03:** Sprint E complete. GoalProgress + GoalWithProgress moved to shared goal.ts. ListedActivity + TodayActivities added to shared activity.ts. Frontend hooks re-export from shared (no page-level import changes needed). Backend retains internal Prisma-typed variants (non-exported) since service layer uses Date objects before JSON serialization. isolatedModules added to frontend tsconfig.
- **2026-03:** Sprint D complete. All 16 bugs fixed: ActivitiesList crashes (D1, D2), Fastify serializer schema (D3), UTC day boundary bugs (D4, D5), useActivities enabled guard (D6), seed unit fix (D7), AIActivityParse moved to shared (D8), hallucinated goalId validation (D9), completedAt timestamp fix (D10), TodayActivities typed (D11), per-activity pending tracking (D12), useGoal cache key (D13), GoalDetail delete error handling (D14), JSON.parse safety (D15), 'journall' typo (D16).
- **2026-03:** Sprint 2 complete. Standardised entire API to **camelCase** (query params + request bodies + responses). Removed `toSnakeCase`/`toUpdateSnakeCase` mappers from `useActivities.ts`. Updated route schemas in `activities.ts` and `goals.ts`. Simplified controllers (no more manual field-name mapping). Updated `Docs/10_api_contract.md` with casing convention section.
- **2026-03:** Sprint 4 complete. Extracted shared `handleError(context, err, reply)` to `apps/backend/src/lib/handleError.ts` — all three controllers (goal, activity, AI) now import from one place. Added layout route in `App.tsx` using `<Layout />` + `<Outlet />`; removed `<AppLayout>` import and wrapper from all 6 page components.
- **2026-03:** Sprint 5 complete. Replaced 10× `prisma.activity.aggregate` N+1 loop in `metrics.service.ts` with a single `prisma.activity.groupBy` query. Capped streak computation to a 2-year lookback window (prevents full table scan growing unboundedly with usage).
- **2026-03:** AI folder refactor + Phase 3 expansion. Created `apps/backend/src/ai/` with prompts, providers, utils. Added Goal Decomposition (`POST /api/ai/breakdown`) and Weekly Analysis (`POST /api/ai/analyze-week`). Renamed `PROMPTS.md` → `CURSOR_SESSION_PROMPTS.md`. Added `Docs/06_ai_implementation.md`.
