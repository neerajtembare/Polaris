# Phase 1 — Manual Core Log

**Branch:** `phase/0-foundation` (continues; rename when branching)  
**Started:** 2026-03-02  
**Target completion:** TBD  
**Status:** ✅ Complete  
**Completed:** 2026-03-03

---

## Goal

Build the full manual activity-logging MVP so a user can:
- Create goals and track progress toward them
- Log activities against goals each day
- See today's plan (what's scheduled, what's done, what was skipped)
- See a dashboard with streak, weekly activity counts, and goal progress bars

No AI features. No cloud sync. No recurrence system. Pure manual tracking.

---

## Milestones

| Milestone | Description | Status |
|-----------|-------------|--------|
| 1.1 | Goals backend — 6 endpoints (CRUD + progress) | ✅ Done |
| 1.2 | Activities backend — 6 endpoints (CRUD + today view) | ✅ Done |
| 1.3 | Frontend API service layer (api.ts + hooks) | ✅ Done |
| 1.4 | Goals frontend (GoalsList, GoalCreate, GoalDetail) | ✅ Done |
| 1.5 | Dashboard metrics backend (GET /api/metrics/dashboard) | ✅ Done |
| 1.6 | Activities frontend (log form, activity list) | ✅ Done |
| 1.7 | Today View page | ✅ Done |
| 1.8 | Dashboard frontend (live metrics, heatmap, goal progress) | ✅ Done |
| 1.9 | ESLint setup + Phase 1 polish | ✅ Done |

---

## Session Log

### 2026-03-02 — Session 1 (Milestones 1.1 – 1.5)

**Milestones 1.1 + 1.2 — Backend (Goals + Activities)**

- `lib/errors.ts`: `AppError` class + `notFound()` / `badRequest()` factories
- `services/goal.service.ts`: `listGoals`, `getGoalById`, `createGoal`, `updateGoal`, `deleteGoal` (soft), `getGoalProgress`
- `controllers/goal.controller.ts`: thin HTTP handlers, spread-guard pattern for `exactOptionalPropertyTypes`
- `routes/goals.ts`: 6 endpoints with JSON schema validation (`additionalProperties: false`)
- `services/activity.service.ts`: `listActivities` (date/range/goal/status filters + pagination), `getActivityById`, `createActivity` (auto `completedAt`), `updateActivity`, `deleteActivity`, `getTodayActivities` (groups by status)
- `controllers/activity.controller.ts`: snake_case → camelCase body mapping (`activity_type`, `goal_id`, `activity_date`, `raw_input`, `completed_at`)
- `routes/activities.ts`: 6 endpoints; `/today` registered BEFORE `/:id` to prevent path conflict
- `routes/index.ts`: mounts `/api/goals` + `/api/activities`
- Global error handler in `app.ts` normalises Fastify validation errors + AppErrors to standard envelope

**Milestone 1.3 — Frontend API service**

- `services/api.ts`: typed `get/post/patch/del` wrappers; `ApiRequestError` class with `status + code + details`; query string builder; `/// <reference types="vite/client" />` for `import.meta.env`
- `hooks/useGoals.ts`: `useGoals`, `useGoal`, `useGoalProgress`, `useCreateGoal`, `useUpdateGoal`, `useDeleteGoal` — `goalKeys` query key factory for cache invalidation
- `hooks/useActivities.ts`: `useActivities`, `useActivity`, `useTodayActivities`, `useCreateActivity`, `useUpdateActivity`, `useDeleteActivity` — `activityKeys` factory; camelCase → snake_case body mappers

**Milestone 1.4 — Goals frontend**

- `components/ui/Badge.tsx`: `TimeframeBadge` (indigo/amber/emerald) + `StatusBadge` (all goal + activity statuses)
- `components/ui/ProgressBar.tsx`: animated fill, `aria-valuenow/min/max` for a11y
- `components/ui/Spinner.tsx`: `Spinner` + `LoadingScreen` helpers
- `components/ui/EmptyState.tsx`: icon + title + description + optional action slot
- `components/layout/AppLayout.tsx`: fixed 56px sidebar (brand + nav) + scrollable main region; `NavLink` active state via indigo highlight
- `components/goals/GoalCard.tsx`: title linked to detail page, badges, progress bar, delete button
- `pages/GoalsList.tsx`: goals grouped by timeframe (long/medium/short), status filter tabs (active/all/archived), empty state with CTA
- `pages/GoalCreate.tsx`: controlled form with validation; redirects to `/goals` on success
- `pages/GoalDetail.tsx`: view mode + inline edit toggle; progress stats grid; delete confirm dialog
- `App.tsx`: routes `/goals`, `/goals/new`, `/goals/:id` wired up
- `Dashboard.tsx`: wrapped in `AppLayout`, replaced placeholder with nav cards

**Milestone 1.5 — Dashboard metrics backend**

- `services/metrics.service.ts`:
  - `getDashboardMetrics(period)` — `week (7d) / month (30d) / year (365d)`
  - `totalActivities`, `completedActivities`, `plannedActivities` for the period
  - `goalsTouched` — distinct goal IDs with ≥1 activity in period
  - `currentStreak` + `longestStreak` — computed from all-time completed activity dates (not just current period)
  - `activityByDay` — heatmap dict pre-filled with `0` for every day in the period
  - `goalProgress` — top 10 active goals with targets; percentage via `prisma.aggregate._sum.value`
- `controllers/metrics.controller.ts`: validates `period` enum, delegates to service
- `routes/metrics.ts`: JSON schema querystring with `enum`, response schema with `additionalProperties: true` (required for Fastify fast-json-stringify to pass through dynamic keys like `activityByDay`)
- `routes/index.ts`: mounts `/api/metrics`

**Commit history this session:**
| Commit | Message |
|--------|---------|
| `c85be34` | feat: Milestone 1.1 - Goals backend |
| `c588d6f` | feat: Milestone 1.2 - Activities backend |
| `648238a` | feat: Milestone 1.3 - Frontend API service layer |
| `854c466` | feat: Milestone 1.4 - Goals frontend |
| `d7e3be3` | feat: Milestone 1.5 - Dashboard metrics backend |

---

### 2026-03-03 — Session 2 (Milestones 1.6 – 1.9)

**Milestone 1.6 — Activities frontend**

- `components/activities/ActivityCard.tsx`: status badge, value/unit display, goal title chip, action buttons (Complete / Skip / Undo / Delete) gated by current status
- `components/activities/LogActivityForm.tsx`: full-screen modal overlay; fields — title, activity type, status, value + unit (quantity/duration only), goal dropdown (active goals), date, notes; uses `useCreateActivity()` mutation
- `pages/ActivitiesList.tsx`: status filter tabs (All/Planned/Completed/Skipped), date picker filter, paginated list from `useActivities()`, inline-complete/skip/delete via `ActivityCard`, Log Activity CTA
- `App.tsx`: added `/activities` and `/today` routes, imported `ActivitiesList` + `TodayView`
- `AppLayout.tsx`: added Today + Activities to `NAV_ITEMS`

**Milestone 1.7 — Today View**

- `pages/TodayView.tsx`: three-column grid (Planned / Completed / Skipped), formatted date header, `useTodayActivities()`, `ActivityCard` throughout with inline actions, quick-log modal button, empty state per column + full-page empty state

**Milestone 1.8 — Dashboard frontend**

- `hooks/useMetrics.ts`: `useMetrics(period)` hook, `DashboardMetrics`/`GoalProgressEntry`/`MetricsPeriod` types, `metricsKeys` factory, 60s staleTime
- `pages/Dashboard.tsx`: rewritten from placeholder → live UI: period picker (week/month/year), 4 stat cards (completed, completion rate, current streak, goals active), `Heatmap` component (colour-coded day cells from `activityByDay`), `GoalProgressList` with `ProgressBar` per goal

**Milestone 1.9 — ESLint + polish**

- `apps/frontend/eslint.config.js`: flat config with `@typescript-eslint/recommended`, `eslint-plugin-react`, `eslint-plugin-react-hooks`; `react/react-in-jsx-scope` disabled (React 17+ JSX transform)
- Fixed `react/no-unescaped-entities` in `GoalsList.tsx` + `TodayView.tsx`
- `tsc --noEmit`: 0 errors | `eslint src`: 0 errors / 0 warnings

**Commit:** `e836df9` — _feat: complete Phase 1 milestones 1.6-1.9_

---

## Remaining Work (Next Session)

### Milestone 1.6 — Activities Frontend

**Components to build:**
- `components/activities/ActivityCard.tsx` — title, status badge, value/unit, goal link, complete/skip buttons
- `components/activities/LogActivityForm.tsx` — modal or inline quick-log form (title, type, value, unit, goal, date)

**Pages to build:**
- `pages/ActivitiesList.tsx` — list with filters (date, goal, status); pagination
- `pages/ActivityCreate.tsx` — full form (links to a goal, picks activity type)

**Hooks already exist** in `hooks/useActivities.ts` — just need to wire up UI.

**Routes to add in App.tsx:**
```
/activities        → ActivitiesList
/activities/new    → ActivityCreate
```

---

### Milestone 1.7 — Today View

This is the **primary daily driver page** — the first thing a user sees when opening the app.

**Layout:**
```
Today — Mon 2 March 2026

[Planned (2)]        [Completed (3)]       [Skipped (0)]
  - Morning run        - Read 20 pages        (empty)
  - Meditation         - Stretching
                       - Walk 30 min

[+ Log activity]
```

**Features:**
- Date header with today's date
- Three columns / sections: Planned → Completed → Skipped
- Each card: mark as complete (→ auto sets `completedAt`), mark as skip, edit notes
- Quick-log button opens `LogActivityForm` inline
- Empty state per section
- Re-fetches on window focus (already handled by TanStack Query)

**Hook:** `useTodayActivities()` already exists — returns `{ date, planned[], completed[], skipped[] }`

**Route:** `/today` — add to nav sidebar in `AppLayout.tsx` (currently commented out)

---

### Milestone 1.8 — Dashboard Frontend

Wire up the existing `GET /api/metrics/dashboard` endpoint to the Dashboard page.

**Add `hooks/useMetrics.ts`:**
```typescript
useMetrics(period: 'week' | 'month' | 'year')
```

**Dashboard sections:**
- Stats row: Total activities / Completed / Current streak / Goals touched
- Activity heatmap: 7-day grid from `activityByDay` (colour-coded by count)
- Goal progress cards: list from `goalProgress[]` with `ProgressBar`
- Period selector: week / month / year tabs

---

### Milestone 1.9 — ESLint + Polish

- Add ESLint flat config with `@typescript-eslint/recommended` for both apps
- Fix any lint errors surfaced
- Audit and remove any `console.log` left in production paths
- Final typecheck across all workspaces
- Git commit: "Phase 1 complete: Manual Core MVP"

---

## Technical Patterns Established (carry forward)

### spread-guard for `exactOptionalPropertyTypes`
```typescript
// ✅ Correct — never pass explicit undefined to optional fields
const update = {
  title: form.title,
  ...(form.description.trim() && { description: form.description.trim() }),
};
```

### Error handling in async React handlers
```typescript
// ✅ void the async function call to satisfy no-floating-promises
<form onSubmit={(e) => void handleSubmit(e)}>
```

### `/today` route before `/:id` in Fastify
Routes with literal path segments must be registered **before** parameterized routes in the same plugin, or Fastify will capture "today" as an ID.

### Fastify response schema — `additionalProperties: true`
If a response object has dynamic keys (like a date-keyed heatmap dict), the schema `data` object needs `additionalProperties: true` or `fast-json-stringify` strips them silently.

### Prisma + VS Code false positives
The language server shows ~12 errors on `Prisma.ActivityGetPayload` — these are a workspace symlink / caching artifact. `tsc --noEmit` exits 0. Safe to ignore.

---

## Decisions Made This Phase

| Decision | Choice | Reason |
|----------|--------|--------|
| Frontend pages grouped by domain | `pages/Goals*.tsx`, `pages/Today*.tsx` | Keeps file tree flat and scannable |
| Inline edit (not separate route) | GoalDetail toggles between view/edit | Avoids navigation noise for simple edits |
| Metrics scope for `longestStreak` | All-time (not period-scoped) | Streak is a cumulative stat — period-scope would always under-report |
| `activityByDay` pre-fill zeros | Pre-fill all days with 0, then increment | Frontend shouldn't have to handle missing keys in a heatmap |
| Top 10 goals in metrics | `take: 10` on active goals with target | Dashboard card list; full list available on `/goals` |
| camelCase in hooks, snake_case to API | Map in hooks (`toSnakeCase()`) | Keeps all TypeScript code camelCase; only the HTTP boundary uses snake_case |

---

## Known Issues / Notes

| Issue | Status |
|-------|--------|
| ESLint not configured | ✅ Done in Milestone 1.9 |
| VS Code language server shows ~12 false-positive TS errors | ℹ️ `tsc --noEmit` exits 0 — safe to ignore |
| `window.confirm()` for delete confirmation | ℹ️ Acceptable for MVP; replace with a proper modal in Phase 2 polish |
| No loading skeleton — just spinner | ℹ️ Fine for Phase 1; skeleton screens are Phase 2 polish |
| Activities frontend and Today View not yet built | ✅ Built in Milestones 1.6 + 1.7 |

---

## Done Criteria (Phase 1 Complete)

- [x] Goals CRUD — full-stack (create, list, detail, edit, delete, progress)
- [x] Activities backend — full CRUD + today grouped view
- [x] Dashboard metrics backend — period aggregations, streaks, heatmap
- [x] Activities frontend — log, list, mark complete/skip
- [x] Today View — daily driver page with three-column layout
- [x] Dashboard frontend — live metrics, heatmap, goal progress bars
- [x] ESLint passes on frontend (flat config, zero errors)
- [x] `tsc --noEmit`: 0 errors, `eslint src`: 0 warnings/errors
