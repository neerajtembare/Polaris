# Polaris — Master Project Plan
> **Version:** 1.1 | **Date:** April 2026  
> **Team:** 2 devs, sequential workflow (no A/B split)  
> **Tooling:** Cursor, GitHub Copilot, AI Studio, Stitch (UI/UX)  
> **Constraint:** Free tier everything. Strong fundamentals before features.

---

## Table of Contents

1. [North Star — What Polaris Actually Is](#1-north-star)
2. [Core vs Fluff — The Hard Decisions](#2-core-vs-fluff)
3. [Architecture Foundation Changes](#3-architecture-foundation-changes)
4. [Phased Roadmap](#4-phased-roadmap)
5. [Dev Workflow — Sequential Model](#5-dev-workflow)
6. [UI/UX Guidelines for Vibe-Coding](#6-uiux-guidelines)
7. [Deployment Strategy (Free)](#7-deployment-strategy)
8. [AI & Model Strategy](#8-ai--model-strategy)
9. [Critical Gotchas & Bug Traps](#9-critical-gotchas--bug-traps)
10. [Scrapped / Deferred Features](#10-scrapped--deferred-features)
11. [Definition of Done Per Phase](#11-definition-of-done-per-phase)

---

## 1. North Star

**Polaris is a personal productivity OS for people who want to work with intention.**

It is built around a single core loop:

```
Open app → See your day clearly → Log what you do → 
Watch it connect to your goals → Feel the progress → Come back tomorrow
```

Everything that strengthens this loop is worth building.  
Everything that doesn't is either deferred or scrapped.

### The Product Promise

- **Without AI:** A clean, fast, beautiful tracker. Log activities, see goals, track streaks.  
  Works offline. No API keys needed. Not crippled.
- **With AI (Ollama local):** Your daily coach. Parses natural language, suggests your day,
  analyzes your week, gives you a nudge when you're slipping.
- **With friends:** Focus together. Shared timers, presence, accountability.  
  No video infrastructure needed — just synchronized intent.

### What It Is NOT

- ❌ A todo list or task manager
- ❌ A calendar or scheduler
- ❌ A habit tracker (it's a *goal-evidencing* tracker, different philosophy)
- ❌ A social media / sharing platform
- ❌ A tool that requires the internet to be useful

---

## 2. Core vs Fluff

This is the most important section. Read it before writing a single line of code.

### Tier 1 — NON-NEGOTIABLE CORE
*If these don't work perfectly, nothing else matters.*

| Feature | Why It's Core |
|---------|---------------|
| Activity logging (fast, frictionless) | The entire app depends on data quality |
| Goal creation + hierarchy | The "why" behind every activity |
| Today view — planned / done / skipped | The daily loop, the only screen users will open daily |
| Streak tracking | Primary emotional hook |
| Goal progress (activities → goal %) | The core value proposition |
| Single smart input bar | Everything flows through here |
| Manual form fallback | For when AI isn't running or input is complex |
| Dashboard / heatmap | Proof that effort is accumulating |

### Tier 2 — HIGH VALUE, BUILD AFTER TIER 1 IS SOLID

| Feature | Why It's Tier 2 |
|---------|----------------|
| Focus sessions (Pomodoro) | Expands use case, integrates naturally with Activity model |
| Morning check-in / AI daily suggestions | Makes users open the app every day |
| Activity templates (quick-log presets) | Highest friction reducer, most-used shortcut |
| Weekly review screen | Reflection ritual, makes the tool sticky |
| Audio player (lofi radio streams) | Low effort, high quality-of-life during focus sessions |
| Data-driven GoalConstellation | Converts decoration into meaning |
| Daily quotes fallback | Offline motivator, trivial to build |

### Tier 3 — NICE TO HAVE, DO WHEN TIER 2 IS DONE

| Feature | Notes |
|---------|-------|
| Shared focus rooms (synchronized timer) | Needs multi-user foundation first |
| Recurring activity templates | Schedule-based, adds schema complexity |
| Weekly Review AI narration streaming | UX polish, not core |
| Settings page fully editable | Currently read-only, not blocking |
| Tagging system | Useful for power users, not day-1 |
| Real authentication + multi-tenancy | Required before sharing with friends properly |

### Tier 4 — DEFERRED (NOT NOW)

| Feature | Why Deferred |
|---------|-------------|
| Real auth (OAuth, JWT) | Add when deploying for friends, not before |
| Google Meet / video co-study | Too complex, too much infra |
| YouTube iframe embed | ToS issues, unreliable, not worth it |
| Cloud sync / multi-device | Phase 5 by design |
| Push notifications | No backend for it, wrong scope |
| Export / import | Not blocking anything |
| Full AI agent loop | Needs more stable prompt chain first |

### Tier 5 — SCRAPPED

| Feature | Why Scrapped |
|---------|-------------|
| QuickLogBar (separate component) | Absorbed into SmartInputBar |
| FloatingLogButton (opens its own modal) | Absorbed into SmartInputBar |
| QuickLogModal | Absorbed into SmartInputBar |
| Multiple separate navigation systems | Pick one (state-based), remove router |

---

## 3. Architecture Foundation Changes

These must happen **before any new features**. They are not features — they are the ground you build on.

### 3.1 Database: SQLite → PostgreSQL

**Why now:** Railway Postgres is free, doesn't pause on inactivity, and Prisma makes this trivial.  
SQLite will block you the moment two users need isolated data.

**Data loss is acceptable.** We're in development — goals and activities can be recreated.  
This means a clean migration with no data porting.

**What to change:**
```prisma
// schema.prisma — change this:
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// To this:
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then run:
```bash
# Delete old SQLite migrations (they're SQLite-specific)
rm -rf apps/backend/prisma/migrations

# Generate fresh Postgres migration
cd apps/backend && npx prisma migrate dev --name init-postgres

# Re-seed sample data
npx tsx prisma/seed.ts
```

That's it. Service code doesn't change — Prisma abstracts the SQL dialect.

**Things to verify after migration:**
- `Float?` fields behave identically ✓ (Prisma handles this)
- UUID generation — `@default(uuid())` works on both (Prisma-level generation) ✓
- No raw SQL in services (there shouldn't be per coding standards) ✓
- Seed file: batch inserts if > 100 rows per model to avoid timeout on remote Postgres

### 3.2 Add userId to Schema NOW (Nullable)

Do this in the same migration as the Postgres switch. **One migration, not two.**

```prisma
model Goal {
  // ... existing fields
  userId    String?   // nullable — will be required after auth is added
}

model Activity {
  // ... existing fields  
  userId    String?
}

model Event {
  // ... existing fields
  userId    String?
}

// New model — add now even though it won't be used until Phase 2
model FocusSession {
  id          String    @id @default(uuid())
  goalId      String?
  activityId  String?
  plannedMins Int
  actualMins  Int?
  breaks      Int       @default(0)
  status      String    @default("active") // active | completed | abandoned
  startedAt   DateTime
  endedAt     DateTime?
  notes       String?
  userId      String?
  isDeleted   Boolean   @default(false)     // consistent with Goal/Activity pattern
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt           // consistent with Goal/Activity pattern

  goal        Goal?     @relation(fields: [goalId], references: [id], onDelete: SetNull)
  activity    Activity? @relation(fields: [activityId], references: [id], onDelete: SetNull)
}
```

**Why add FocusSession now:** You don't want to run a migration mid-feature. Add the model, don't wire it up yet.

### 3.3 Input Consolidation

**Remove:**
- `QuickLogBar` component
- `QuickLogModal` component  
- `FloatingLogButton` (the FAB that opens its own modal)

**Keep and improve:**
- `SmartInputBar` — the one true input
- `LogActivityForm` — the manual fallback full-form modal

**Create:**
```typescript
// hooks/use-activity-input.ts
// Single hook consumed by ALL input surfaces
// Handles: raw text → local NLP → AI upgrade → confirmation → save
export function useActivityInput() {
  // parse, confirm, submit logic lives HERE
  // SmartInputBar just calls this
  // LogActivityForm just calls this
}
```

### 3.4 Remove Global Rate Limiter (Keep AI Limit)

In `app.ts`, remove or disable the **global** 100/min rate limiter.  
For a local/small-team app, this adds zero value and debugging pain.

**Keep the AI-specific 10/min limit** on `/api/ai/*` routes. This protects against  
accidental infinite loops during development (a mutation hook with wrong dependencies  
could spam the AI endpoint and burn through Ollama queue or API credits).

```typescript
// app.ts — remove this:
await app.register(import('@fastify/rate-limit'), { max: 100, timeWindow: '1 minute' });

// Keep the per-route limit on AI endpoints in routes/ai.ts:
{ config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }
```

Add a comment: `// TODO: Re-enable global limit with provider-aware config before public launch`

### 3.5 Navigation Cleanup

The app already uses state-based navigation (App.tsx renders screens via `navState.screen`).  
**React Router is NOT mounted** — no `BrowserRouter` or `RouterProvider` exists in main.tsx.

However, there are two issues:

1. **Dead `pages/` directory:** 9 page files (TodayView, GoalDetail, GoalCreate, Dashboard, etc.)
   that import `react-router-dom` but are **never rendered**. They are orphaned code.
   
2. **Layout components using NavLink:** `BottomNav.tsx`, `TopBar.tsx`, `SideRail.tsx` import
   `NavLink` from `react-router-dom`. Check if these are rendered in the active Layout — if so,
   swap `NavLink` to button/onClick handlers.

**Decision:** Mark `pages/` as dead code for now. Keep the files — some have useful logic  
(TodayView's Kanban, GoalDetail) that may be worth porting into the component-based screens later.  
Add a `// DEAD CODE — not connected to App.tsx` comment to each file's header.

**Do not delete `react-router-dom` yet** — layout components may depend on it.
Clean removal is a Phase 1 task after porting useful features.

### 3.6 Gemma 4 Model Update

```bash
# .env
OLLAMA_MODEL=gemma4:e4b    # 9.6GB, good for 8-12GB VRAM
# or
OLLAMA_MODEL=gemma4:e2b    # 7.2GB, for lower-end hardware
# or  
OLLAMA_MODEL=gemma4:26b    # 18GB, if you have a good GPU
```

In `packages/ai/src/providers/ollama.ts`:
- Remove the few-shot examples from the activity parse prompt (Gemma 4 doesn't need them)
- Add explicit JSON schema in the system prompt instead
- Set temp to `0.1` (lower than current 0.05 for slightly more natural outputs)
- Remove any Gemma 3 special template handling

Add `gemma4:e4b` as the new default in `config/` fallback values.

### 3.7 Runtime Model Selection (UI-Driven)

**Current state:** The Settings page shows available Ollama models as read-only badges.  
No dropdown, no way to switch models without editing `.env` and restarting the server.

**Key finding from code review:** `OllamaProvider.parse()` and `callProviderText()` both  
read `process.env['OLLAMA_MODEL']` **per-request** (not cached at construction). This means  
runtime model switching is straightforward.

**What to build:**

#### Backend — Runtime Config Store
```typescript
// apps/backend/src/lib/runtime-config.ts
// In-memory config that overrides env vars at runtime
// Falls back to process.env if not set

const runtimeConfig: Record<string, string> = {};

export function getRuntimeConfig(key: string, fallback?: string): string {
  return runtimeConfig[key] ?? process.env[key] ?? fallback ?? '';
}

export function setRuntimeConfig(key: string, value: string): void {
  runtimeConfig[key] = value;
}
```

#### Backend — New Endpoint
```
POST /api/ai/config
Body: { ollamaModel: string }
Response: { success: true, data: { ollamaModel: "gemma4:e4b" } }
```

Updates in-memory runtime config. Optionally writes to `.env` file for persistence across restarts.

#### Frontend — Settings Dropdown
Convert read-only model badges to a `<select>` dropdown.  
On change → call `POST /api/ai/config` → invalidate `useAiConfig` query → UI updates.

#### AI Package — Read from Runtime Config
Update `OllamaProvider` and `callProviderText` to read from `getRuntimeConfig('OLLAMA_MODEL')` instead of `process.env['OLLAMA_MODEL']` directly.

**Cross-platform compatibility:** Ollama exposes the same HTTP API (`localhost:11434`) and  
`GET /api/tags` endpoint on both Windows and Linux. The existing `useOllamaModels` hook  
fetches available models — it works identically on both platforms. Both PowerShell and  
bash scripts already support Ollama management.

### 3.8 Dead Code Audit

**Legacy AI module:** `apps/backend/src/ai/` duplicates functionality from `packages/ai/`.  
The service layer (`ai.service.ts`) already imports from `@polaris/ai`. The backend `ai/` directory  
is dead code — mark it for deletion in Phase 0.

**Dead input components (already unreachable):**
- `FloatingLogButton.tsx` — not imported in any active component tree
- `QuickLogModal.tsx` — only used by FloatingLogButton (also dead)
- `QuickLogBar.tsx` — only used in dead `pages/TodayView.tsx`

These can be safely deleted in Phase 0 with zero functional impact.

---

## 4. Phased Roadmap

### Phase 0 — Foundation (Do This First, ~1-2 weeks)
*Get the house in order. No new features.*

**Goal:** App is deployed, stable, on Postgres, consolidated input, Gemma 4 running, model selectable from UI.

Split into three sub-groups. 0A is a hard prerequisite; 0B and 0C can be done in any order after 0A.

#### Phase 0A — Infrastructure (do first)

| # | Task | Notes |
|---|------|-------|
| 1 | Migrate schema to Postgres | Change provider, delete old migrations, `migrate dev --name init-postgres` |
| 2 | Add `userId` (nullable) + `FocusSession` model to schema | Same migration as #1. FocusSession must include `isDeleted` + `updatedAt` |
| 3 | Re-seed sample data on Postgres | Run `seed.ts`, batch inserts if timeout on remote |
| 4 | Deploy backend to Railway | Set `DATABASE_URL`, `PORT`, `NODE_ENV`, `CORS_ORIGIN` |
| 5 | Deploy frontend to Vercel | Set `VITE_API_URL` pointing to Railway backend |
| 6 | Update Docker setup for Postgres | Remove SQLite volume, update `docker-compose.yml` env vars |
| 7 | Remove global rate limiter | Keep AI-specific 10/min as dev safety net per §3.4 |
| 8 | Update setup scripts | Ensure both `setup.sh` and `start.sh`/`start.ps1` work for Postgres workflow |

#### Phase 0B — Dead Code Cleanup (after 0A)

| # | Task | Notes |
|---|------|-------|
| 9 | Delete dead input components | Remove `QuickLogBar`, `QuickLogModal`, `FloatingLogButton` + all imports |
| 10 | Delete legacy `apps/backend/src/ai/` directory | Dead code — `@polaris/ai` package is the real module |
| 11 | Mark `pages/` directory as dead code | Add header comments, do NOT delete yet |
| 12 | Ensure `packages/ai` builds in dev and CI | Root `dev` script must include `tsc --watch` for `@polaris/ai` |

#### Phase 0C — AI & Input (after 0A)

| # | Task | Notes |
|---|------|-------|
| 13 | Create `useActivityInput` hook | Consolidate parse → confirm → save logic from SmartInputBar |
| 14 | Wire SmartInputBar to `useActivityInput` | Behavior unchanged, internals cleaner |
| 15 | Update to Gemma 4 + update MockProvider | Change default, clean up prompts per §3.6, keep mock in sync |
| 16 | Build runtime model selection | `POST /api/ai/config` endpoint + Settings dropdown (§3.7) |
| 17 | Update `POLARIS_MASTER_REFERENCE.md` | Reflect Postgres, new defaults, removed components |

**Phase 0 Exit Criteria:**
- [ ] App loads at a public Vercel URL
- [ ] Data persists in Railway Postgres
- [ ] SmartInputBar works with Gemma 4
- [ ] Model can be switched from Settings page without restart
- [ ] No duplicate input components, no dead backend AI module
- [ ] Seed data works on Postgres
- [ ] No TypeScript errors (`npm run typecheck` passes)
- [ ] No broken imports from deleted components

---

### Phase 1 — Core Loop Polish (~2-3 weeks)
*Make the existing features genuinely good, not just functional.*

**Goal:** The basic loop (log → see today → see goals → feel progress) is delightful to use.

| # | Task | Notes |
|---|------|-------|
| 1 | Today view redesign — 3-col Kanban | Port useful logic from dead `pages/TodayView.tsx` into component |
| 2 | One-tap complete / skip from Today view | No modal needed for status change |
| 3 | Activity templates (save + quick-log) | `ActivityTemplate` model or JSON in localStorage |
| 4 | Manual LogActivityForm — full cleanup | Remove redundant fields, better UX |
| 5 | GoalConstellation — data-driven | Node size = progress %, color = timeframe |
| 6 | ProgressBar animations pass | Satisfying visual feedback on completion |
| 7 | Streak display — make it prominent | This is the primary emotional hook |
| 8 | Heatmap — tooltip with activity list | Click a day → see what you did |
| 9 | Error toasts on all mutation failures | One-time pass, every useXxx mutation hook |
| 10 | Empty states — all screens | What does a new user see? Make it welcoming |
| 11 | Clean up React Router dependency | Swap NavLink → onClick in layout components, remove package if safe |

**Phase 1 Exit Criteria:**
- [ ] Logging an activity takes under 10 seconds end-to-end
- [ ] Today view shows accurate planned/done/skipped without refresh
- [ ] GoalConstellation visually reflects goal progress
- [ ] No unhandled errors visible to users (all toasted)
- [ ] Empty states guide new users on all screens (formal onboarding is Phase 3)

---

### Phase 2 — Focus Sessions + Daily Coach (~3-4 weeks)
*The features that make users open the app every day.*

**Goal:** Users have a reason to open Polaris every morning and a reason to stay.

#### 2A — Focus Sessions

| # | Task | Notes |
|---|------|-------|
| 1 | FocusSession service + controller + routes | CRUD for sessions, link to Activity on complete |
| 2 | Focus Mode screen (fullscreen) | Timer, goal selector, minimal UI |
| 3 | Timer logic hook `useFocusTimer` | countdown, pause, abandon, complete |
| 4 | Auto-create Activity on session complete | Calls createActivity internally |
| 5 | Partial logging on abandon | Log actual minutes, status = abandoned |
| 6 | Session history in Insights | Chart of focus time over time |
| 7 | PulseWave background during focus mode | Already exists, just wire it up |
| 8 | Breaks counter UI | Simple increment button during session |

#### 2B — Audio Player

**Prerequisite:** Start 2B only after Focus Sessions (2A) are functional.  
The audio player's primary value is during focus sessions. It works on any screen,  
but without focus mode it's just a music player with no unique value.

| # | Task | Notes |
|---|------|-------|
| 1 | `useAudioPlayer` Zustand store | Persists across navigation |
| 2 | Audio player UI component | Mini player in layout header |
| 3 | Preset stream list (hardcoded) | 5-6 curated direct-stream URLs |
| 4 | Custom URL input | Let user paste any audio stream URL |
| 5 | Player persists across screen changes | Zustand ensures this |
| 6 | Focus screen audio integration | Play/pause from focus screen, auto-show player |

**Audio approach:** Browser `<audio>` element plays direct stream URLs natively.  
No backend or search API needed — the browser handles playback directly.

**Curated presets (direct stream URLs, no API keys):**
- Lofi/chill radio (direct `.mp3` stream)
- Rain + thunder ambient
- Brown noise (static file or stream)
- Synthwave/focus
- Coffee shop ambience
- Silence / off

The user can also paste any custom stream URL. Presets are hardcoded JSON —
if a URL dies, just update the JSON. No external service dependency.

#### 2C — Morning Check-in + Daily Coach

**Prerequisite:** Build the `PolarisContext` shared context object (§8) before starting  
the daily coach prompt. This context is reused by weekly analysis and activity parsing too.

| # | Task | Notes |
|---|------|-------|
| 0 | Build `PolarisContext` assembly (§8) | Shared context object used by all AI prompts. Do this first. |
| 1 | Daily quotes JSON (365 entries) | AI Studio can generate these in bulk |
| 2 | `useDailyCoach` hook | Fires once per day, cached in localStorage with date key |
| 3 | Morning banner component | Dismissable, non-blocking overlay |
| 4 | AI coach prompt (shared context object) | Goals summary + last 7 days + streak + time of day |
| 5 | Offline fallback to quotes | If Ollama unavailable, show quote instead |
| 6 | "Add to today" from AI suggestion | One-tap creates planned activity |

**Phase 2 Exit Criteria:**
- [ ] User can run a 25-minute Pomodoro linked to a goal
- [ ] Session completes → activity auto-logged
- [ ] Audio plays during focus, persists when navigating away
- [ ] Morning banner shows on first open of the day
- [ ] AI suggestion has one-tap "add to today"
- [ ] Quotes show when Ollama is offline

---

### Phase 3 — Depth + Retention (~3-4 weeks)
*Features that reward long-term use.*

| # | Task | Notes |
|---|------|-------|
| 1 | Weekly Review screen (dedicated) | Not a card — a full screen ritual |
| 2 | AI weekly analysis → streaming | SSE from Fastify, streamed into UI |
| 3 | Goal dormancy detection | Goals untouched N days get visual treatment |
| 4 | Smart "add to today" from dormant goals | Proactive suggestion, not just reactive |
| 5 | Daily intentions / morning planner | Lightweight "what will you do today?" |
| 6 | Tagging system on Activities | `tags: string[]` stored as JSON, filter by tag |
| 7 | Settings page — complete remaining fields | Provider toggle (needs PolarisAI refactor), NLP threshold, audio prefs |
| 8 | Onboarding flow (first-time user) | 3-step: create first goal, log first activity, set preferences |

**Phase 3 Exit Criteria:**
- [ ] User has a weekly reflection ritual built into the app
- [ ] Dormant goals surface automatically
- [ ] A new user knows what to do within 60 seconds

---

### Phase 4 — Multi-User + Hosting (~future, when needed)
*Only when you actually want friends using it with their own data.*

| Task | Notes |
|------|-------|
| Auth system (Supabase Auth or simple JWT) | Don't over-engineer, email+password is fine |
| userId enforcement in all service queries | Every query gets `where: { userId, isDeleted: false }` |
| Row Level Security (if on Supabase) | Or manual userId filtering in services (simpler) |
| Shared focus rooms | WebSocket, synchronized timer, presence list |
| User profiles + display names | Minimal — just for the room feature |

---

## 5. Dev Workflow — Sequential Model

### Why Not A/B Split

The original plan divided work between "Dev A (backend)" and "Dev B (frontend)".  
In practice, for a 2-person async team working part-time, this creates more coordination  
overhead than it saves. Instead: **work sequentially on the prioritized task list.**

Either dev picks the next unfinished task, claims it (GitHub Issue), and completes it.  
No parallel track management, no blocking on "waiting for the other dev's API."

### Rules

1. **One person works at a time on overlapping files.** If both are available,  
   one takes a backend task, the other takes a frontend task that doesn't share files.

2. **Schema changes are announced.** Post in chat before running `prisma migrate dev`.  
   The other dev pulls and runs `prisma migrate deploy` before their next session.

3. **Shared types are updated by whoever adds the feature.** The same person who  
   adds a backend endpoint also updates `@polaris/shared` types and the frontend hook.

4. **Branch per task.** `feature/model-selection`, `feature/focus-timer`, etc.  
   Merge to `main` when done. No long-lived integration branches.

5. **DEVLOG.md in repo root.** One line per work session:  
   `2026-04-14 [Dev1]: Migrated to Postgres. Run npm run seed after pull.`

### Claiming Tasks

```markdown
# In the GitHub Issue for each task:
1. Comment "Starting" + assign yourself
2. Create a feature branch
3. Work on it
4. PR → squash merge to main
5. Comment "Done" with any notes for the other dev
```

---

## 6. UI/UX Guidelines for Vibe-Coding

Since you're using Stitch for design and Cursor/Copilot for implementation, set these constraints up front to avoid design drift.

### Design Principles

1. **Speed over beauty for data entry.** The log flow must be the fastest thing in the app.
   If logging feels slow, users will stop logging.

2. **Information density on Today view.** This is the most-opened screen. Show everything
   relevant without scrolling: streak, today's plan, quick-log input.

3. **Progressive disclosure.** Show simple things by default. Advanced options (notes, 
   custom unit, exact date) are behind a "more options" toggle in the form.

4. **3D is atmosphere, not decoration.** Every 3D element must serve a data purpose by Phase 2.
   The constellation shows goal progress. PulseWave shows focus intensity.

5. **Dark mode is the default.** Design dark-first, ensure light mode works, not the other way around.

### Stitch → Cursor Workflow

1. Design the screen in Stitch
2. Export as component spec or screenshot
3. Drop into Cursor with prompt: 
   "Implement this screen using React, Tailwind v4, Framer Motion. 
    Follow the existing component patterns in apps/frontend/src/components/ui/.
    Use existing hooks from hooks/. Don't create new API calls — use existing TanStack Query hooks."
4. Review the output — Cursor will often invent props or hooks that don't exist. 
   Cross-check against the actual hook files.

### Component Creation Rules (for AI-assisted coding)

When prompting Cursor to create a component, always include:
- The TypeScript type it receives as props (from `@polaris/shared`)
- Which existing hook it should use (don't let AI invent new ones)
- Whether it has local state or is purely presentational
- The exact Tailwind classes for spacing (AI often adds too much padding)

### Things AI Coders Get Wrong on This Stack

- **Tailwind v4 syntax is different.** Cursor may generate Tailwind v3 syntax. 
  Watch for `@apply` usage and `theme()` calls — check they're v4 compatible.
- **TanStack Query v5 API changed.** Cursor often generates v4 syntax (`useQuery` return shape changed).
  Always check `isLoading` vs `isPending` (v5 uses `isPending`).
- **Framer Motion variants.** AI often generates overly complex animation variants. Keep it simple.
- **Prisma in services.** AI will sometimes put Prisma calls in controllers. Per your architecture, 
  controllers only do HTTP parsing — all Prisma is in services.
- **React 19 strict mode.** Double-invocation of effects in dev mode can cause 
  duplicate API calls. Check `useEffect` dependencies carefully.

---

## 7. Deployment Strategy (Free)

### The Stack

```
┌─────────────────────────────────────────────────┐
│  Vercel (Free)                                   │
│  React + Vite frontend                           │
│  Auto-deploys from main branch                   │
│  URL: polaris-app.vercel.app                     │
└────────────────────┬────────────────────────────┘
                     │ /api/* proxied to Railway
┌────────────────────▼────────────────────────────┐
│  Railway (Free tier, ~$5 credit/month)           │
│  Fastify backend (Node 20)                       │
│  Always-on (no sleep on inactivity ✓)           │
│  URL: polaris-backend.railway.app                │
└────────────────────┬────────────────────────────┘
                     │ DATABASE_URL
┌────────────────────▼────────────────────────────┐
│  Railway Postgres (Free tier)                    │
│  Persistent volume                               │
│  500MB included (more than enough)               │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Local Machine (Optional AI layer)               │
│  Ollama + Gemma 4 (runs locally)                 │
│  Whisper (runs locally)                          │
│  Backend can point to local Ollama via tunnel    │
│  OR: AI_PROVIDER=mock (no local AI needed)       │
└─────────────────────────────────────────────────┘
```

### Env Setup

**Railway (backend) env vars:**
```
DATABASE_URL=<railway-postgres-url>
PORT=3001
NODE_ENV=production
AI_PROVIDER=mock              # Default, users can override locally
OLLAMA_URL=<ngrok-url-if-any> # Optional, for when you want to test AI remotely
CORS_ORIGIN=https://polaris-app.vercel.app
```

**Vercel (frontend) env vars:**
```
VITE_API_URL=https://polaris-backend.railway.app/api
```

### Local Development (still the primary dev workflow)

```bash
npm run dev   # Backend :3001 + Frontend :5173 — exactly as before
```

Nothing changes locally. Railway/Vercel is just the "share with friends" layer.

### Sharing AI with friends (optional)

If friends want AI features and you don't want them running Ollama:
- Run Ollama locally, expose via `ngrok http 11434`
- Set `OLLAMA_URL=<ngrok-url>` in Railway env
- This is informal and fragile — only for testing
- Long term: each user runs their own Ollama, or use OpenAI with a shared API key

### Cost Reality Check

| Service | Free Tier | Your Usage | Risk |
|---------|-----------|------------|------|
| Vercel | 100GB bandwidth, unlimited sites | Well under | Zero |
| Railway | $5/month credit | ~$2-3 for small Postgres + backend | Minimal |
| Railway Postgres | Included in credit | 500MB DB, 5-10 users | Zero |
| Ollama | Free, local | Your machine's GPU | Zero |
| Whisper | Free, local | Your machine's GPU | Zero |

**Total monthly cost: ~$0 to $3.** Scale to paid only when you have 50+ users.

---

## 8. AI & Model Strategy

### Model Recommendation

**Primary:** `gemma4:e4b` — 9.6GB, 128K context, MoE architecture (only 4B active params so fast), native system prompt support, strong instruction following.

**Budget hardware:** `gemma4:e2b` — 7.2GB, slightly less capable but usable.

**High-end:** `gemma4:26b` — If you have 16GB+ VRAM, this is noticeably better for the weekly analysis.

**Do not use:** llama3.2:3b (current default) — too weak for reliable JSON extraction. Qwen models are decent alternatives but Gemma 4 is ahead on instruction following for structured output.

### Prompt Architecture — Shared Context Pattern

Create a `PolarisContext` object assembled once per AI call and injected into every prompt:

```typescript
// packages/ai/src/types.ts
interface PolarisContext {
  activeGoals: { id: string; title: string; progress: number; timeframe: string }[]
  recentActivities: { title: string; date: string; type: string }[]  // last 7 days
  currentStreak: number
  longestStreak: number
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  dayOfWeek: string
}
```

This context gets attached to the system prompt for ALL three AI operations. 
The activity parser becomes context-aware. The weekly analysis has richer data.

### Prompt Rewrite Priorities

1. **Activity parse prompt** — Remove few-shot examples. Add explicit JSON schema.  
   Gemma 4 doesn't need 10 examples to output valid JSON. Replace with schema + 2 edge-case examples.

2. **Daily coach prompt (NEW)** — Short, focused:  
   "Given this user's goal progress and recent activity, generate:  
   1. One personalized motivational message (2 sentences max, specific to their work)  
   2. One specific suggested activity with title, type, and realistic value  
   3. A streak status message  
   Return as JSON: { message, suggestion: { title, activityType, value, unit, goalId }, streakMessage }"

3. **Weekly analysis prompt** — Keep existing structure but inject `PolarisContext`.

### Agent vs Prompt Chain — Current Recommendation

**Stay with prompt chain for now.** A true agentic loop (where the model decides which tools to call) requires:
- A model reliably outputting valid tool-call JSON (Gemma 4 can do this, but needs testing)
- Error recovery when the model hallucinates a tool call
- A state machine managing multi-step reasoning
- This is 3-4x more code than a prompt chain

**The right time for agents:** When you're building Phase 3's "smart scheduling" feature.  
"Plan my week" is a genuinely multi-step task that benefits from agentic behavior.  
Until then, prompt chains with shared context are 90% of the value at 20% of the complexity.

### AI Must Degrade Gracefully

This is a hard rule. Every AI-powered feature must have a non-AI fallback:

| AI Feature | Fallback |
|-----------|---------|
| Activity parsing | Local NLP parser (already exists) |
| Daily coach | Quotes database (date-indexed JSON) |
| Weekly analysis | Static template with user's actual numbers |
| Goal breakdown | Manual form |
| Morning suggestions | "Goals you haven't touched recently" (query-based, no AI) |

---

## 9. Critical Gotchas & Bug Traps

This is the section to read before every sprint. These are things that will bite you.

### Database

**⚠️ Migration conflicts.** If both devs run `prisma migrate dev` simultaneously on different branches, you'll get conflicting migration files. Rule: only Dev A creates migrations. Dev B runs `prisma migrate deploy` (which only applies existing files).

**⚠️ UUID generation in Postgres vs SQLite.** SQLite `@default(uuid())` is handled by Prisma. Postgres can use the same, but if you ever drop to raw SQL, use `gen_random_uuid()`. Don't mix them.

**⚠️ Soft delete everywhere.** Every single query in every service must have `isDeleted: false`. When Cursor generates a new service method, it will forget this. Check every generated service file. A missing `isDeleted: false` will show deleted data silently.

**⚠️ Prisma connection pooling.** In production (Railway), Fastify + Prisma can exhaust connections under concurrent load. Add PgBouncer or use Prisma Accelerate, or set `connection_limit=1` in the DATABASE_URL. For 5-10 users this probably won't matter, but know it exists.

**⚠️ Seed data on Postgres.** The seed file generates 90 days of data. On SQLite this is fast. On a remote Railway Postgres it may timeout if the seed tries to insert thousands of rows in one transaction. Batch your inserts in the seed file (e.g., `prisma.$transaction([...chunks])` with 50-100 creates per chunk).

**⚠️ Fresh migration means no data.** Since we're doing a clean Postgres migration (deleting old SQLite migrations), all existing data is abandoned. Run `seed.ts` after migration to repopulate. This is intentional — we're in development and data loss is acceptable.

### Frontend

**⚠️ TanStack Query v5 breaking changes.** `isLoading` is now `isPending` for mutations. `data` is `undefined` not `null` when no data. AI coders will generate v4 syntax constantly. Add a `.cursorrules` file with this note.

**⚠️ Tailwind v4 CSS variables.** Your `index.css` uses `@theme` and CSS variable syntax. Cursor will sometimes inject v3 `tailwind.config.js` patterns that don't apply. Check any AI-generated component uses only utility classes, not config-based customizations.

**⚠️ Three.js and React 19 concurrent mode.** `@react-three/fiber` has had issues with React 19's concurrent renderer. If 3D components flicker or remount unexpectedly, wrap them in a `Suspense` boundary and check for double-mount effects. The `useFrame` hook is particularly sensitive to this.

**⚠️ Audio autoplay policy.** Browsers block audio that starts without user interaction. Your audio player must only start when the user explicitly clicks play. Don't try to auto-play music when a focus session starts — the browser will silently block it.

**⚠️ useEffect dependency arrays.** With React 19 strict mode (double invocation in dev), any `useEffect` that calls an API will fire twice in development. This is fine for reads. For writes (creating activities, logging sessions), make sure you're not in a useEffect — use event handlers.

**⚠️ localStorage key collisions.** You already use `polaris:theme` and `polaris:auth`. When you add the daily coach cache, quotes cache, audio player state — document all localStorage keys in one place. One typo and features silently stop working.

### AI Integration

**⚠️ Ollama JSON output.** Gemma 4 with `format: "json"` will output valid JSON, but the structure may not match your schema exactly. Always validate with Zod (or your existing response validator) before using the parsed result. A missing field crashes the UI if you're not defensive.

**⚠️ AI response timeout.** Gemma 4:e4b on mid-range hardware can take 8-15 seconds for a complex response. The frontend must show a loading state immediately and not let the user think it's frozen. Never set a fetch timeout under 30 seconds for AI endpoints.

**⚠️ Context window pollution.** The shared `PolarisContext` you inject into every prompt adds tokens. For a 90-day active user with many goals and activities, this context can get large. Cap it: max 10 goals, max 20 recent activities in the context object. Never send raw activity data — always summarize.

**⚠️ The mock provider and tests.** The MockProvider uses keyword matching. When you rewrite prompts for Gemma 4, the mock provider won't know about your new prompt format. Keep the mock provider's logic updated alongside prompt changes, or tests will pass but production (Ollama) will fail.

### Backend

**⚠️ Fastify schema validation vs TypeScript types.** Fastify validates request bodies against JSON schema. Your TypeScript types in `@polaris/shared` and the JSON schema in route files can drift. A type can be `String?` in TypeScript but the route schema still requires it — the request passes TypeScript but fails at runtime. Keep these in sync or use a schema generator.

**⚠️ Event table non-fatal design.** The event audit log is designed to be non-fatal (errors don't block the main operation). Make sure every event logging call is in a `try/catch` that only `console.error`s the failure. If you accidentally await a failing event log without catching it, mutations will start failing silently.

**⚠️ Multipart file upload size.** The 25MB limit for Whisper audio is set in the multipart plugin. If you later add any other file upload feature (e.g., profile pictures), the same 25MB limit applies globally. This is probably fine but know it's there.

### Deployment

**⚠️ CORS in production.** `CORS_ORIGIN` must be exactly `https://polaris-app.vercel.app` (no trailing slash, correct protocol). One character wrong and the frontend gets CORS errors with zero helpful messages. Test this explicitly after first deploy.

**⚠️ Railway Postgres IPv6.** Railway's Postgres instance uses IPv6 by default. Some network configurations can't reach it. If `DATABASE_URL` connections fail from Railway's backend service, try adding `?sslmode=require` to the URL.

**⚠️ Prisma migrations in CI/CD.** Your Dockerfile runs `prisma migrate deploy` on startup. This is fine for Railway. But if you ever add a breaking migration (renaming a column) and the old service is still running queries against the old schema — you have a brief window of failures. For 5-10 users this is acceptable. Just know it's there.

**⚠️ Vercel serverless timeout.** The frontend is static — no timeout issues. But if you ever move the backend to Vercel Functions (don't, but if you do), the 10-second function timeout will kill all AI calls.

### The Big One — Input Consolidation

**⚠️ When you delete QuickLogBar and FloatingLogButton**, do a full text search for every place they're imported. Components imported but not rendered can still cause build errors or test failures. Search for: `QuickLogBar`, `FloatingLogButton`, `QuickLogModal` across the entire repo and remove every reference.

**Note from code review:** These components are already dead — `FloatingLogButton` is not imported in the active component tree, `QuickLogBar` is only in the dead `pages/TodayView.tsx`. Deletion is safe but still do the grep to catch stray comments.

### Setup Script Improvements (Low Priority, Do Later)

**Current state:** `setup.sh` works for Linux. `start.ps1` works for Windows.  
Both handle Node/npm check, dependency install, Prisma setup, optional AI services.

**Desired improvements (not blocking, future task):**
- Add Postgres connection test to setup (verify `DATABASE_URL` before running migrations)
- Add `ollama --version` check on both platforms
- Add end-to-end health check at the end of setup (hit `/health`, verify 200)
- Test that Gemma 4 model is pulled and responding
- Print a clear summary of what's working and what's not

_This is a quality-of-life improvement. The existing scripts work. Improve them after Phase 0._

---

## 10. Scrapped / Deferred Features

### Permanently Scrapped

| Feature | Reason |
|---------|--------|
| YouTube iframe embed | ToS issues, unreliable autoplay, not worth the complexity |
| Google Meet / video co-study | Infrastructure cost, wrong scope for this tool |
| QuickLogBar | Absorbed into SmartInputBar |
| FloatingLogButton (with own modal) | Absorbed into SmartInputBar |
| Multiple navigation systems | Pick state-based, remove Router overhead |
| Global rate limiter (100/min) | Counterproductive for local dev; AI-specific 10/min limit kept |

### Deferred to Phase 4+

| Feature | Trigger to Revisit |
|---------|-------------------|
| Real auth (OAuth/JWT) | When first friend needs their own account |
| Multi-tenancy enforcement | Same trigger as auth |
| Shared focus rooms | After auth is solid |
| Recurring activity schedules | After templates are used and loved |
| Full AI agent loop | After prompt chain is stable and tested |
| Export / import data | When someone asks for it |
| Cloud sync / multi-device | Phase 5, only if users request it |
| Push notifications | Requires mobile app or service worker |
| Tagging beyond growth/maintenance | Phase 3, after basic use patterns emerge |

---

## 11. Definition of Done Per Phase

A phase is done when ALL of these are true. Not "mostly done."

### Phase 0 Done When:
- [ ] `npm run dev` works locally against Railway Postgres
- [ ] `https://polaris-app.vercel.app` loads and is usable by a new visitor
- [ ] All existing features work on Postgres (test with seed data)
- [ ] SmartInputBar is the only input surface (no duplicate components)
- [ ] Gemma 4 parses "read 30 pages" correctly
- [ ] MockProvider updated alongside Gemma 4 prompt changes
- [ ] Model can be switched from Settings page without restarting server
- [ ] No TypeScript errors (`npm run typecheck` passes)
- [ ] No broken imports from deleted components
- [ ] Dead `pages/` directory marked with comments (not deleted)
- [ ] `packages/ai` builds successfully and is included in dev workflow
- [ ] Docker setup updated for Postgres (no SQLite references)

### Phase 1 Done When:
- [ ] Logging an activity from scratch takes under 10 seconds
- [ ] Today view updates without page refresh after logging
- [ ] GoalConstellation node size reflects actual goal progress %
- [ ] All error states show a toast notification
- [ ] Empty states exist on every page
- [ ] `npm run lint` passes

### Phase 2 Done When:
- [ ] User can complete a 25-min Pomodoro and see it as a logged activity
- [ ] Partial session (abandoned at 12 min) still logs 12 minutes
- [ ] Audio player plays a stream and doesn't stop when navigating screens
- [ ] Morning banner appears on first daily open, shows AI suggestion or quote
- [ ] "Add to today" from suggestion creates a planned activity
- [ ] All features work with `AI_PROVIDER=mock` (no Ollama required)

### Phase 3 Done When:
- [ ] Weekly Review screen exists as a destination, not a card
- [ ] Goals untouched for 7+ days have visible dormancy indicator
- [ ] Settings page allows changing AI provider and saving (requires PolarisAI refactor for runtime provider switch)
- [ ] A new user can complete onboarding in under 2 minutes

---

## Appendix A — .cursorrules Template

Add this to repo root as `.cursorrules` to constrain AI codegen:

```
This is a TypeScript monorepo with Fastify backend and React 19 + Vite frontend.

BACKEND RULES:
- Controllers handle HTTP only. No Prisma calls in controllers.
- All database logic goes in services/*.service.ts
- All queries must include `isDeleted: false` in the where clause
- Use AppError class for errors, not raw throw new Error()
- AI config can be changed at runtime via POST /api/ai/config
- Use getRuntimeConfig() for AI settings, not process.env directly

FRONTEND RULES:
- Tailwind v4 syntax only. No tailwind.config.js patterns.
- TanStack Query v5: use isPending not isLoading for mutations
- TanStack Query v5: for queries, isLoading = isPending && !isFetched (not the same as v4 isLoading)
- React 19: avoid useEffect for data mutations, use event handlers
- All API calls go through hooks in hooks/. Never fetch directly in components.
- Shared types come from @polaris/shared. Never redefine them locally.
- Framer Motion: keep animations simple. 2 variants max per component.
- Navigation is state-based (App.tsx navState). No React Router for screen switching.

DEAD CODE (do not import or modify):
- apps/frontend/src/pages/ — orphaned, not connected to App.tsx
- apps/frontend/src/components/activities/QuickLogBar.tsx — deleted
- apps/frontend/src/components/activities/QuickLogModal.tsx — deleted
- apps/frontend/src/components/activities/FloatingLogButton.tsx — deleted

DO NOT:
- Add rate limiting unless explicitly asked
- Create new navigation patterns (state-based nav only)  
- Add new input components (SmartInputBar is the only input surface)
- Put business logic in React components (belongs in hooks or services)
- Use localStorage for anything except: polaris:theme, polaris:auth, polaris:daily-coach-cache, polaris:quotes-index, polaris:audio-state
```

---

## Appendix B — Key Files to Know

When AI generates code, always cross-reference these files:

| File | Why It Matters |
|------|----------------|
| `packages/shared/src/types/` | All shared types. Never duplicate these. |
| `apps/backend/src/lib/errors.ts` | Use AppError, not raw throws |
| `apps/backend/src/lib/runtime-config.ts` | Runtime AI config (model selection). Read this, not process.env for AI settings. |
| `apps/frontend/src/services/api.ts` | All fetch calls go through here |
| `apps/frontend/src/hooks/` | Check if a hook exists before creating one |
| `apps/backend/prisma/schema.prisma` | Source of truth for data model |
| `apps/backend/src/app.ts` | Plugin registration, global middleware |
| `packages/ai/src/PolarisAI.ts` | The AI gateway — all AI calls through here |
| `apps/frontend/src/pages/` | DEAD CODE — do not import. Keep for reference only. |

---

*Last updated: April 13, 2026 (v1.1) | Next review: After Phase 0 completion*
