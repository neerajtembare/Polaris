# Polaris — Master Reference Document

> **Last Updated:** April 13, 2026  
> **Current Phase:** Phase 0/1 — Foundation + MVP  
> **Status:** Functional MVP with AI integration

---

## Table of Contents

1. [Project Identity](#1-project-identity)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Getting Started](#4-getting-started)
5. [Data Model](#5-data-model)
6. [API Reference](#6-api-reference)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Backend Architecture](#8-backend-architecture)
9. [AI System](#9-ai-system)
10. [Voice System](#10-voice-system)
11. [Shared Types](#11-shared-types)
12. [Infrastructure & Deployment](#12-infrastructure--deployment)
13. [Configuration & Environment](#13-configuration--environment)
14. [Coding Standards](#14-coding-standards)
15. [Testing](#15-testing)
16. [Current Feature Status](#16-current-feature-status)
17. [Roadmap — What's NOT Built Yet](#17-roadmap--whats-not-built-yet)

---

## 1. Project Identity

**Polaris** is a **personal activity tracker with AI coaching potential**.

- Activities contribute **toward goals** with accumulated values
- Goals are hierarchical (parent → children) with timeframes (long / medium / short)
- AI parses natural language into structured activity logs
- Voice input via Whisper speech-to-text
- Dashboard with streaks, heatmaps, trends, goal progress
- Local-first (SQLite), runs entirely on your machine

**It is NOT:** a todo app, a habit tracker, or a calendar.

---

## 2. Tech Stack

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| **Runtime** | Node.js | 20+ | Alpine-based in Docker |
| **Backend** | Fastify | — | NOT Express |
| **ORM** | Prisma | — | NOT Knex, NOT raw SQL |
| **Database** | SQLite | — | Local file: `apps/backend/data/polaris.db` |
| **Frontend** | React | 19 | Functional components only |
| **Bundler** | Vite | — | Dev on `:5173`, proxies `/api` to backend |
| **Styling** | Tailwind CSS | v4 | With `@tailwindcss/vite` plugin |
| **State (server)** | TanStack Query | — | All API data fetching |
| **State (client)** | Zustand | v5 | Available but not yet used |
| **3D Graphics** | Three.js | — | Via `@react-three/fiber` + `@react-three/drei` |
| **Charts** | Recharts | — | Area charts, donut charts |
| **Animations** | Framer Motion | — | Page transitions, card effects |
| **Icons** | Lucide React | — | SVG icon library |
| **Dates** | date-fns | — | All date operations |
| **Toasts** | react-hot-toast | — | Notification system |
| **AI (LLM)** | OpenAI / Ollama / Mock | — | GPT-4o-mini or llama3.2:3b |
| **Voice (STT)** | Whisper (faster-whisper) | 1.1.1 | Python FastAPI service, GPU-accelerated |
| **TypeScript** | TypeScript | 5.7+ | Strict mode everywhere |
| **Monorepo** | npm workspaces | — | 4 workspaces |
| **Testing** | Vitest | — | + Testing Library, MSW |
| **Linting** | ESLint | v9 | Flat config |

---

## 3. Repository Structure

```
polaris/
├── package.json                  # Root: workspaces, dev scripts
├── tsconfig.base.json            # Shared TS config (ES2022, strict)
├── docker-compose.yml            # Core services (backend + frontend)
├── docker-compose.ai.yml         # GPU overlay (Whisper + Ollama)
├── Dockerfile                    # Multi-service Node 20 Alpine
├── setup.sh                      # One-time local setup
├── start.sh / start.ps1          # Interactive startup (Linux / Windows)
│
├── apps/
│   ├── backend/                  # Fastify API (port 3001)
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # Database schema (3 models)
│   │   │   ├── seed.ts           # 90-day sample data generator
│   │   │   └── migrations/       # 1 migration (init)
│   │   └── src/
│   │       ├── index.ts          # Entry point — start server
│   │       ├── app.ts            # Fastify app builder (plugins, error handler)
│   │       ├── config/           # Environment config
│   │       ├── routes/           # 6 route files (goals, activities, metrics, ai, voice, index)
│   │       ├── controllers/      # 5 controllers (goal, activity, ai, metrics, voice)
│   │       ├── services/         # 5 services (goal, activity, ai, metrics, voice)
│   │       ├── lib/              # Prisma client, errors, error handler
│   │       ├── types/            # Re-exports @polaris/shared
│   │       └── ai/               # Legacy AI module (superseded by packages/ai)
│   │
│   └── frontend/                 # React app (port 5173)
│       └── src/
│           ├── App.tsx           # Root — state-based navigation, theme, auth
│           ├── main.tsx          # ReactDOM entry
│           ├── index.css         # Tailwind v4 theme directives
│           ├── pages/            # 9 page components
│           ├── components/       # ~30+ components (activities, goals, layout, ui, 3d, widgets)
│           ├── hooks/            # ~15 custom hooks (TanStack Query wrappers)
│           ├── services/         # API client (typed fetch wrapper)
│           ├── stores/           # Zustand (empty — not yet used)
│           ├── lib/              # NLP parser, unit presets, utils
│           └── types/            # Navigation types (ScreenId, Theme)
│
├── packages/
│   ├── shared/                   # @polaris/shared — shared TypeScript types
│   │   └── src/types/            # 5 type files (goal, activity, api, api-responses, ai)
│   └── ai/                       # @polaris/ai — AI facade + providers + prompts
│       └── src/
│           ├── PolarisAI.ts      # Main AI class (3 methods)
│           ├── providers/        # Mock, OpenAI, Ollama providers
│           ├── prompts/          # System/user prompt templates
│           └── utils/            # LLM caller, response validator, logger
│
└── services/
    └── whisper/                  # Python FastAPI Whisper service (port 8001)
        ├── main.py               # 2 endpoints: /health, /transcribe
        └── requirements.txt      # faster-whisper, fastapi, uvicorn, CUDA libs
```

### Workspace Packages

| Package | Name | Purpose |
|---------|------|---------|
| `apps/backend` | `polaris-backend` | Fastify API server |
| `apps/frontend` | `polaris-frontend` | React SPA |
| `packages/shared` | `@polaris/shared` | Shared TypeScript type definitions |
| `packages/ai` | `@polaris/ai` | AI facade, providers, prompts |

---

## 4. Getting Started

### Prerequisites

- Node.js 20+
- npm
- (Optional) Docker + Docker Compose
- (Optional) NVIDIA GPU + NVIDIA Container Toolkit (for AI services)
- (Optional) Ollama installed locally

### First-Time Setup

```bash
./setup.sh           # Install deps, build shared, init DB, apply migrations
./setup.sh --seed    # Same + seed 90 days of sample data
```

### Running

```bash
# Interactive launcher (recommended)
./start.sh

# Or directly:
./start.sh local              # Backend + Frontend (no AI)
./start.sh local --with-ai    # Backend + Frontend + Ollama + Whisper
./start.sh docker             # Docker core services
./start.sh docker:ai          # Docker + GPU AI services

# Or manually:
npm run dev                   # Concurrently: backend (3001) + frontend (5173)
```

### Health Check

```bash
./start.sh check
# Checks: Backend (3001), Frontend (5173), Whisper (8001), Ollama (11434)
```

### URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| Health Check | http://localhost:3001/health |
| Whisper STT | http://localhost:8001 |
| Ollama LLM | http://localhost:11434 |

---

## 5. Data Model

### Database: SQLite via Prisma

Three models, all using UUIDs as primary keys.

### Goal

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (UUID) | auto | Primary key |
| `title` | String | required | Goal name |
| `description` | String? | null | Optional description |
| `timeframe` | String | `"short"` | `long` \| `medium` \| `short` |
| `targetValue` | Float? | null | Numeric target (e.g., 7200 pages) |
| `targetUnit` | String? | null | Unit label (e.g., "pages", "km", "₹") |
| `targetDate` | DateTime? | null | Deadline |
| `parentId` | String? | null | FK → Goal (self-referencing hierarchy) |
| `status` | String | `"active"` | `active` \| `completed` \| `paused` \| `archived` |
| `isDeleted` | Boolean | false | Soft-delete flag |
| `createdAt` | DateTime | now() | Creation timestamp |
| `updatedAt` | DateTime | auto | Last update timestamp |

**Relations:** `parent` ↔ `children` (Goal hierarchy), `activities` (one-to-many)  
**Indexes:** `parentId`, `timeframe`, `status`, `isDeleted`, `[isDeleted, status]`

### Activity

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (UUID) | auto | Primary key |
| `title` | String | required | Activity name |
| `notes` | String? | null | Additional notes |
| `activityType` | String | required | `quantity` \| `duration` \| `completion` |
| `value` | Float? | null | Numeric value (null for completion type) |
| `unit` | String? | null | Unit label (e.g., "pages", "km", "hours") |
| `rawInput` | String? | null | Original natural language input |
| `goalId` | String? | null | FK → Goal (on delete: SetNull) |
| `activityDate` | DateTime | required | When the activity was done |
| `category` | String | `"growth"` | `growth` \| `maintenance` |
| `status` | String | `"planned"` | `planned` \| `completed` \| `skipped` |
| `aiGenerated` | Boolean | false | Was this created via AI parsing? |
| `aiCategorized` | Boolean | false | Was category set by AI? |
| `isDeleted` | Boolean | false | Soft-delete flag |
| `createdAt` | DateTime | now() | Creation timestamp |
| `updatedAt` | DateTime | auto | Last update timestamp |
| `completedAt` | DateTime? | null | When marked completed |

**Relations:** `goal` (many-to-one, optional)  
**Indexes:** `activityDate`, `goalId`, `category`, `status`, `isDeleted`, `[goalId, isDeleted]`, `[activityDate, isDeleted]`, `[status, isDeleted]`

### Event (Audit Log)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String (UUID) | auto | Primary key |
| `entityType` | String | required | `"goal"` or `"activity"` |
| `entityId` | String | required | ID of the goal/activity |
| `eventType` | String | required | `created` \| `updated` \| `completed` \| `skipped` etc. |
| `previousState` | String? | null | JSON-serialized old state |
| `newState` | String | required | JSON-serialized new state |
| `metadata` | String? | null | Extra JSON metadata |
| `timestamp` | DateTime | now() | Event timestamp |

**Indexes:** `entityId`, `entityType`, `eventType`, `timestamp`

---

## 6. API Reference

**Base URL:** `http://localhost:3001`  
**Response Envelope:**

```typescript
// Success
{ success: true, data: T }

// Success with pagination
{ success: true, data: T[], meta: { total, limit, offset } }

// Error
{ success: false, error: { code: string, message: string, details?: object } }
```

**Global Rate Limit:** 100 requests/minute  
**AI Rate Limit:** 10 requests/minute

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check + DB connection test |

### Goals

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/goals` | List goals (filters: `status`, `timeframe`, `parentId`, `includeProgress`) |
| POST | `/api/goals` | Create goal (body: `title` required + optional fields) |
| GET | `/api/goals/:id` | Get single goal (query: `includeProgress`, `includeChildren`) |
| PATCH | `/api/goals/:id` | Update goal fields |
| DELETE | `/api/goals/:id` | Soft-delete goal (query: `cascade` to delete children) |
| GET | `/api/goals/:id/progress` | Get computed progress metrics |

### Activities

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/activities/today` | Today's activities grouped: `{planned[], completed[], skipped[]}` |
| GET | `/api/activities` | List activities (filters: `date`, `startDate`, `endDate`, `goalId`, `status`, `activityType`, `limit`, `offset`) |
| POST | `/api/activities` | Create activity (body: `title`, `activityType`, `activityDate` required) |
| GET | `/api/activities/:id` | Get single activity |
| PATCH | `/api/activities/:id` | Update activity |
| DELETE | `/api/activities/:id` | Soft-delete activity |

### Metrics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/metrics/dashboard` | Aggregated dashboard (query: `period` = `week`\|`month`\|`year`) |

**Returns:** `totalActivities`, `completedActivities`, `plannedActivities`, `goalsTouched`, `currentStreak`, `longestStreak`, `activityByDay` (heatmap), `goalProgress[]`

### AI

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai/parse-activity` | Parse natural language → structured activity (body: `{rawInput}`) |
| POST | `/api/ai/breakdown` | Decompose goal into sub-goals + activities (body: `{goalId}`) |
| POST | `/api/ai/analyze-week` | Weekly behavioral insights (no body) |
| GET | `/api/ai/config` | Active AI provider + Ollama model/URL |
| GET | `/api/ai/ollama-models` | List installed Ollama models |

### Voice

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/voice/status` | Whisper service availability |
| POST | `/api/voice/transcribe` | Upload audio file → text transcription (multipart, field: `audio`, 25MB limit) |

---

## 7. Frontend Architecture

### Navigation

State-based navigation (NOT React Router for primary screens).  
Screens managed via `NavigationState` in `App.tsx`.

| Screen ID | Component | Description |
|-----------|-----------|-------------|
| `Hub` | Hub | Primary dashboard: clock, AI input bar, today's feed, streaks, trends |
| `Goals` | GoalMatrix | Goal constellation, create goal, bento layout |
| `Insights` | Insights | Analytics: metrics cards, PulseWave 3D, trend charts |
| `History` | History | Activity log with filters, log form |
| `Settings` | Settings | AI provider config display (read-only) |

**Other pages** (via React Router within screens):
- `GoalsList` — Goals with status filter + search
- `GoalDetail` — Single goal detail + linked activities
- `GoalCreate` — New goal form
- `ActivitiesList` — Full activity log with pagination
- `TodayView` — Three-column Kanban (planned / completed / skipped)
- `Dashboard` — Stats overview, heatmap, goal progress
- `NotFound` — 404 fallback

### Theme

- Dark / Light toggle, persisted to `localStorage` (`polaris:theme`)
- Auth state persisted to `localStorage` (`polaris:auth`)

### Key Components

**Activity Input (4 ways to log):**

| Component | Location | UX |
|-----------|----------|-----|
| `SmartInputBar` | Hub (primary) | Text/voice → local parse → AI upgrade → confirmation card |
| `QuickLogBar` | TodayView (inline) | Collapsible bar → AI parse → suggestion panel → submit |
| `LogActivityForm` | Full-screen modal | Full form: title, type, value, unit, date, status, notes, voice, AI |
| `FloatingLogButton` | Global FAB | Opens `QuickLogModal` (small centered modal) |

**Data Visualization:**

| Component | Type | Description |
|-----------|------|-------------|
| `StreakHero` | Widget | Animated flame + current/longest streak |
| `TrendChart` | Recharts area | Daily activity count over period |
| `CategoryDonut` | Donut ring | Completed vs planned vs skipped breakdown |
| `EnhancedHeatmap` | CSS grid | GitHub-style activity heatmap (7-column weeks) |
| `WeeklyInsights` | AI card | Summary + insights + suggestions (expandable) |
| `ProgressBar` | Bar | Animated horizontal progress (0–100%) |

**3D Visuals (Three.js):**

| Component | Where | Effect |
|-----------|-------|--------|
| `ConstellationBackground` | Login | 400 particles, slow rotation, mouse parallax |
| `Background` | Layout | 600-particle field, additive blending |
| `GoalConstellation` | GoalMatrix | 15 goal nodes + connecting lines |
| `PulseWave` | Insights | Distorted plane, wireframe, sinusoidal rotation |

**UI Primitives:**

`Badge`, `ProgressBar`, `EmptyState`, `Spinner`, `VoiceButton`, `ReactiveCard` (3D tilt hover), `ConfirmModal`, `Skeleton`, `UnitPicker` (18 presets), `ErrorBoundary`, `Sheet`, `Tabs`, `Chip`, `CommandPalette`, `Tooltip`

### Custom Hooks (TanStack Query)

| Hook | Purpose | Stale Time |
|------|---------|------------|
| `useGoals(filter?)` | List goals with optional progress | 60s |
| `useGoal(id)` | Single goal with progress/children | 60s |
| `useGoalProgress(id)` | Computed progress metrics | 30s |
| `useCreateGoal()` | Mutation: create goal | — |
| `useUpdateGoal()` | Mutation: update goal | — |
| `useDeleteGoal()` | Mutation: soft-delete goal | — |
| `useActivities(filter?)` | Paginated activity list | 60s |
| `useActivity(id)` | Single activity | 60s |
| `useTodayActivities()` | Today grouped by status | 5min refetch |
| `useCreateActivity()` | Mutation: create activity | — |
| `useUpdateActivity()` | Mutation: update activity | — |
| `useDeleteActivity()` | Mutation: soft-delete activity | — |
| `useMetrics(period)` | Dashboard aggregated metrics | 60s |
| `useVoiceStatus()` | Whisper service availability | 30s poll |
| `useVoiceActivity()` | Voice → transcribe → AI parse pipeline | — |
| `useVoiceRecorder(opts)` | Browser MediaRecorder wrapper | — |
| `useAiParse()` | AI parse (skips if local confidence ≥ 85%) | — |
| `useAiConfig()` | AI provider config | 30s |
| `useOllamaModels()` | List Ollama models | 60s |
| `useWeeklyInsights()` | AI weekly analysis | 5min, disabled by default |

### Client-Side NLP Parser (`lib/parse-input.ts`)

A rule-based offline parser that extracts structured data from natural language **before** hitting the AI API. Detects:

- **Intent:** `create_goal`, `query`, or `log_activity`
- **Activity type:** `quantity`, `duration`, or `completion`
- **Value + unit:** From patterns like "30 pages", "2 hours", "5.2km", "₹500", "3 sets of 10"
- **Time ranges:** "9am to 5pm" → calculated hours
- **Goal matching:** Fuzzy scoring against active goals by title words + domain keywords

Confidence thresholds: ≥ 85% → skip AI call, < 85% → upgrade via AI API.

### API Client (`services/api.ts`)

- Typed `get<T>()`, `post<T>()`, `patch<T>()`, `del<T>()` methods
- Base URL: `VITE_API_URL` or `/api` (Vite proxy in dev)
- Throws `ApiRequestError` on `success: false` responses
- All hooks use this exclusively

---

## 8. Backend Architecture

### Request Flow

```
Client → Fastify (plugins: helmet, cors, rate-limit, multipart)
       → Route (JSON schema validation)
       → Controller (HTTP handler, error wrapping)
       → Service (business logic, Prisma queries)
       → Prisma → SQLite
```

### Plugins

| Plugin | Purpose |
|--------|---------|
| `helmet` | Security headers (CSP disabled) |
| `cors` | Dev: `localhost:5173`. Prod: `CORS_ORIGIN` env (comma-separated) |
| `rate-limit` | Global: 100/min. AI endpoints: 10/min |
| `multipart` | File uploads (25 MB limit for voice audio) |

### Controllers

| Controller | Endpoints | Description |
|------------|-----------|-------------|
| `GoalController` | 6 handlers | CRUD + progress for goals |
| `ActivityController` | 6 handlers | CRUD + today's grouped view |
| `AiController` | 5 handlers | Parse, breakdown, analyze, config, models |
| `MetricsController` | 1 handler | Dashboard aggregation |
| `VoiceController` | 2 handlers | Whisper status + transcribe |

### Services

| Service | Key Methods |
|---------|-------------|
| `GoalService` | `listGoals`, `getGoalById`, `createGoal`, `updateGoal`, `deleteGoal`, `getGoalProgress` |
| `ActivityService` | `listActivities`, `getActivityById`, `createActivity`, `updateActivity`, `deleteActivity`, `getTodayActivities` |
| `AiService` | Thin facade → `@polaris/ai` singleton (single gateway pattern) |
| `MetricsService` | `getDashboardMetrics(period)` — streaks, heatmap, goal progress |
| `VoiceService` | `isWhisperAvailable()`, `transcribeAudio(buffer, mime, filename)` |

### Error Handling

- `AppError` class with `statusCode`, `code`, `message`, `details`
- Factory functions: `notFound(resource, id)`, `badRequest(message)`
- Global error handler in `app.ts` catches all unhandled errors
- Validation errors → 400 `VALIDATION_ERROR`
- Known errors → appropriate HTTP status
- Unknown errors → 500 `INTERNAL_ERROR`

### Event Logging

Goal and Activity services log all create/update/delete operations to the `Event` table (audit trail). Non-fatal — logging errors don't block the main operation.

---

## 9. AI System

### Package: `@polaris/ai`

Central AI facade used by the backend. Three capabilities:

| Feature | Method | Input | Output |
|---------|--------|-------|--------|
| **Parse Activity** | `parseActivity(rawInput, goals)` | Natural language text + active goals | `AIActivityParse` (intent, title, type, value, unit, goal, confidence) |
| **Breakdown Goal** | `breakdownGoal(goalInput)` | Goal details | `AIGoalBreakdown` (sub-goals + suggested activities) |
| **Analyze Week** | `analyzeWeek(metrics)` | Dashboard metrics | `AIWeeklyAnalysis` (summary + insights + suggestions) |

### Providers

| Provider | Model | Config | Notes |
|----------|-------|--------|-------|
| **Mock** | — | Default, zero-config | Rule-based keyword matching, always available |
| **OpenAI** | `gpt-4o-mini` | `OPENAI_API_KEY` required | Temp 0.2, max 300 tokens |
| **Ollama** | `llama3.2:3b` (default) | `OLLAMA_URL`, `OLLAMA_MODEL` | Temp 0.05, json format, 600 tokens. Few-shot for ≤8B models |

**Fallback chain:** Configured provider → MockProvider (on any error)

### Provider Selection

Set via `AI_PROVIDER` environment variable:
- `mock` — No external calls, pattern matching (default)
- `openai` — OpenAI API (requires API key)
- `ollama` — Local Ollama instance

### Prompt System

Three prompt sets, each with a system prompt + user prompt builder:

1. **Activity Parse** — Detailed parsing rules: intent detection, type inference, value extraction, goal matching, confidence scoring. Few-shot variant for small models (10 examples).
2. **Goal Breakdown** — Decompose into 2–4 sub-goals + 2–4 suggested activities with rationale.
3. **Weekly Analysis** — Behavioral insights: summary, 2–4 insights, 2–4 suggestions.

### AI Logging

All AI exchanges logged to `apps/backend/ai-logs/`:
- `YYYY-MM-DD.jsonl` — Machine-readable (one JSON per line)
- `YYYY-MM-DD.txt` — Human-readable formatted log
- Includes: timestamp, provider, operation, input, prompts, raw response, parsed result, elapsed time, errors

### Voice → AI Pipeline

```
Mic (Browser MediaRecorder)
  → Audio blob (WAV/WebM)
  → POST /api/voice/transcribe (multipart)
  → Whisper service → text
  → POST /api/ai/parse-activity
  → OpenAI/Ollama/Mock → AIActivityParse
  → User reviews suggestion card (confidence badge)
  → Confirm → POST /api/activities
```

---

## 10. Voice System

### Whisper Service (`services/whisper/`)

Python FastAPI microservice wrapping `faster-whisper` (CTranslate2-based).

| Setting | Default | Env Var |
|---------|---------|---------|
| Model | `large-v3` | `WHISPER_MODEL` |
| Device | `cuda` | `WHISPER_DEVICE` |
| Compute | `float16` | `WHISPER_COMPUTE_TYPE` |

**Endpoints:**
- `GET /health` — Model status (200 if loaded, 503 if not)
- `POST /transcribe` — Multipart audio → `{text, language, duration, elapsed}`

**Supported formats:** audio/webm, audio/ogg, audio/wav, audio/mpeg, audio/mp4

**Transcription settings:** beam_size=5, language=en, VAD filter enabled (300ms silence threshold)

**GPU fallback:** If GPU init fails, falls back to CPU + int8 quantization.

### Frontend Voice Components

- `VoiceButton` — Mic button with states: idle → recording (pulsing red) → processing (spinner)
- `useVoiceRecorder` — Browser MediaRecorder API wrapper (start/stop/cancel, duration tracking)
- `useVoiceActivity` — Two-step pipeline: audio blob → Whisper → AI parse
- `useVoiceStatus` — Polls `/api/voice/status` every 30s

---

## 11. Shared Types

### `@polaris/shared` — 5 type files

**Domain Types:**

```typescript
// Activity types
type ActivityType = 'quantity' | 'duration' | 'completion'
type ActivityCategory = 'growth' | 'maintenance'
type ActivityStatus = 'planned' | 'completed' | 'skipped'

// Goal types
type GoalTimeframe = 'long' | 'medium' | 'short'
type GoalStatus = 'active' | 'completed' | 'paused' | 'archived'

// Metrics
type MetricsPeriod = 'week' | 'month' | 'year'

// AI
type UserIntent = 'log_activity' | 'create_goal' | 'query'
```

**Key Interfaces:**

| Interface | Description |
|-----------|-------------|
| `Goal` | Full goal record |
| `CreateGoalInput` / `UpdateGoalInput` | Input DTOs |
| `GoalProgress` | Computed: currentValue, percentage, activityCount, daysActive |
| `GoalWithProgress` | Goal + optional progress + optional children |
| `Activity` | Full activity record |
| `CreateActivityInput` / `UpdateActivityInput` | Input DTOs |
| `ListedActivity` | Activity + flattened `goalTitle` |
| `TodayActivities` | `{date, planned[], completed[], skipped[]}` |
| `DashboardMetrics` | Full dashboard: activities, streaks, heatmap, goalProgress[] |
| `AIActivityParse` | Parse result: intent, title, type, value, unit, goal, confidence, provider |
| `AIGoalBreakdown` | Sub-goals + suggested activities |
| `AIWeeklyAnalysis` | Summary + insights + suggestions |
| `ApiSuccess<T>` / `ApiError` | Response envelopes |
| `PaginatedMeta` | `{total, limit, offset}` |

---

## 12. Infrastructure & Deployment

### Docker Compose — Core (`docker-compose.yml`)

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| `backend` | Custom (Dockerfile) | 3001 | Fastify API, Prisma migrate on startup |
| `frontend` | Custom (Dockerfile) | 5173 | Vite dev server, proxies to backend |

**Volume:** `polaris_data` — Persists SQLite database

### Docker Compose — AI Overlay (`docker-compose.ai.yml`)

Use with: `docker compose -f docker-compose.yml -f docker-compose.ai.yml up --build`

| Service | Image | Port | GPU | Description |
|---------|-------|------|-----|-------------|
| `whisper` | Custom (services/whisper) | 8001 | Yes | faster-whisper, large-v3, CUDA |
| `ollama` | `ollama/ollama:latest` | 11434 | Yes | Auto-pulls llama3.2:3b |

**Requires:** NVIDIA GPU + NVIDIA Container Toolkit

**Volumes:** `whisper_models` (HuggingFace cache), `polaris_models` (Ollama models)

### Dockerfile

- Base: `node:20-alpine`
- Builds: shared types → Prisma client → backend
- Exposes: 3001, 5173
- Default CMD: Migrate + start backend (compose overrides for frontend)

### Startup Scripts

| Script | Platform | Features |
|--------|----------|----------|
| `setup.sh` | Linux/Mac | One-time: install, build shared, init DB, migrate, optional seed |
| `start.sh` | Linux/Mac | Interactive menu: local / local+AI / Docker / Docker+AI / stop / seed / check / logs |
| `start.ps1` | Windows | Same features as start.sh in PowerShell |

---

## 13. Configuration & Environment

### Backend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `development` | `development` \| `production` |
| `DATABASE_URL` | `file:./data/polaris.db` | Prisma SQLite connection |
| `CORS_ORIGIN` | `""` | Comma-separated allowed origins (prod) |
| `AI_PROVIDER` | `mock` | `mock` \| `openai` \| `ollama` |
| `OPENAI_API_KEY` | — | Required for openai provider |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_MODEL` | `llama3.2:3b` | Ollama model name |
| `WHISPER_URL` | `http://localhost:8001` | Whisper service endpoint |
| `AI_LOG_DIR` | `./ai-logs` | AI exchange log directory |

### Frontend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` | API base URL (Vite proxy in dev) |
| `VITE_PROXY_TARGET` | `http://localhost:3001` | Backend proxy target |

---

## 14. Coding Standards

### TypeScript

- Strict mode enabled (`strict: true`, `noUncheckedIndexedAccess`, etc.)
- No `any` types — use `unknown` if needed
- Target: ES2022, Module: NodeNext
- Source maps + declarations for all packages

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files | kebab-case | `goal.service.ts`, `use-goals.ts` |
| Functions / Variables | camelCase | `calculateProgress()`, `goalService` |
| Types / Interfaces / Classes | PascalCase | `GoalService`, `CreateGoalInput` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_PAGE_SIZE` |

### Architecture Patterns

- **Controllers** handle HTTP concerns only (request parsing, response formatting)
- **Services** contain all business logic and Prisma queries
- **Routes** define endpoints with JSON schema validation
- All queries include `isDeleted: false` (soft-delete convention)
- Event audit trail logged on all mutations (non-fatal)
- AI service accessed via single gateway pattern (never call `@polaris/ai` directly from controllers)

### API Response Format

```typescript
{ success: true, data: T }                                    // Single item
{ success: true, data: T[], meta: { total, limit, offset } }  // Paginated
{ success: false, error: { code, message, details? } }        // Error
```

---

## 15. Testing

### Stack

| Tool | Purpose |
|------|---------|
| Vitest | Test runner (backend + frontend) |
| Testing Library | React component testing |
| MSW | API mocking (Mock Service Worker) |
| `@testing-library/jest-dom` | DOM assertions |

### Commands

```bash
npm test                    # Run all tests (backend + frontend)
npm run test:coverage       # With coverage reports
```

### Test Files

- `apps/frontend/src/__tests__/setup.ts` — Test setup (jest-dom matchers)
- `apps/frontend/src/__tests__/services/api.test.ts` — API client unit tests
- `apps/frontend/src/__tests__/components/ui/` — UI component tests

---

## 16. Current Feature Status

### Implemented (Phase 0/1)

| Feature | Status | Notes |
|---------|--------|-------|
| Goal CRUD | ✅ Done | Create, read, update, soft-delete, hierarchy |
| Goal Progress | ✅ Done | Computed from linked activities vs target |
| Activity CRUD | ✅ Done | Create, read, update, soft-delete |
| Today's Activities | ✅ Done | Grouped by status (planned/completed/skipped) |
| Dashboard Metrics | ✅ Done | Streaks, heatmap, goal progress, activity counts |
| AI Activity Parsing | ✅ Done | Natural language → structured activity (3 providers) |
| AI Goal Breakdown | ✅ Done | Decompose goal → sub-goals + suggested activities |
| AI Weekly Analysis | ✅ Done | Behavioral insights from metrics |
| Voice Input | ✅ Done | Whisper STT → AI parse → review → save |
| Client-Side NLP | ✅ Done | Offline parsing before AI API calls |
| 3D Visuals | ✅ Done | Particle backgrounds, constellation, pulse wave |
| Dark/Light Theme | ✅ Done | Toggle, persisted to localStorage |
| Activity Heatmap | ✅ Done | GitHub-style daily heatmap |
| Streak Tracking | ✅ Done | Current + longest consecutive days |
| Trend Charts | ✅ Done | Area charts for activity volume |
| Multiple Input Methods | ✅ Done | SmartInputBar, QuickLogBar, LogActivityForm, FAB |
| Event Audit Trail | ✅ Done | All mutations logged to Event table |
| Docker Deployment | ✅ Done | Core + GPU AI overlay |
| Seed Data | ✅ Done | 90 days of realistic sample data |
| Error Boundary | ✅ Done | Global crash recovery UI |
| Rate Limiting | ✅ Done | Global 100/min, AI 10/min |

### Partially Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Authentication | 🟡 Stub | localStorage mock — no real auth yet |
| Zustand Stores | 🟡 Unused | Package present, store dir empty |
| React Router | 🟡 Partial | State-based navigation primary, router secondary |
| Settings Page | 🟡 Read-only | Displays AI config, no editing |

---

## 17. Roadmap — What's NOT Built Yet

Per the project charter, these are planned for future phases:

| Phase | Features | Status |
|-------|----------|--------|
| Phase 2 | Advanced analytics, filtering, search | Not started |
| Phase 3 | AI coaching, recurrence system, pattern detection | Not started |
| Phase 4 | Behavioral insights, smart suggestions | Not started |
| Phase 5 | Cloud sync, multi-device | Not started |

**Explicitly NOT to implement yet:**
- AI coaching conversations
- Recurring activities / schedules
- Automated pattern detection
- Cloud sync / remote database
- Real authentication (OAuth, etc.)
- Push notifications
- Export / import data
- Multi-user / sharing

---

## Document Hierarchy

When documents conflict, higher rank wins:

1. `.github/copilot-instructions.md` — Enforced by tooling
2. `Docs/10_api_contract.md` — Definitive API spec
3. `Docs/04_data_model.md` — Definitive schema
4. `Docs/12_implementation_checklist.md` — Build plan
5. `Docs/03_sdd.md` — Architecture reference
6. **This document** — Living reference of actual state
7. All other docs — Context / strategy
