# Project Polaris — API Contract

## Purpose

This document defines the REST API contract for Polaris backend. It serves as the definitive reference for frontend-backend communication.

All endpoints follow:
- REST conventions
- JSON request/response bodies
- Consistent error format
- Typed schemas (TypeScript/Zod)

---

# Base URL

```
Development: http://localhost:3001/api
Production:  TBD
```

---

# Casing Convention

**All API field names use `camelCase` — for request bodies, query parameters, and response payloads.**

This applies consistently across every endpoint (Goals, Activities, AI, Metrics). There are no snake_case fields anywhere in the live API.

| Layer | Convention | Example |
|-------|-----------|---------|
| Request body (POST/PATCH) | camelCase | `activityType`, `goalId`, `rawInput` |
| Query parameters (GET) | camelCase | `includeProgress`, `startDate`, `goalId` |
| Response fields | camelCase | `activityDate`, `completedAt`, `targetUnit` |
| Shared TypeScript types | camelCase | `CreateActivityInput`, `GoalWithProgress` |

The shared types in `packages/shared/src/types/` are the single source of truth. Route schemas must match them. No conversion layer is needed anywhere.

---

# Common Headers

## Request Headers

| Header | Value | Required |
|--------|-------|----------|
| Content-Type | application/json | Yes (for POST/PUT/PATCH) |
| Accept | application/json | Recommended |

## Response Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| X-Request-Id | UUID for tracing |

---

# Common Response Format

## Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

## List Response

Paginated list endpoints (e.g. `GET /activities`) return `data` plus `meta` with **total**, **limit**, and **offset** (no `page`). Type in shared: `ApiSuccessPaginated<T>` / `PaginatedMeta` (`packages/shared/src/types/api.ts`).

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

## Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required",
    "details": [
      { "field": "title", "message": "Required" }
    ]
  }
}
```

---

# Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Request body/params failed validation |
| NOT_FOUND | 404 | Resource doesn't exist |
| CONFLICT | 409 | Operation conflicts with current state |
| INTERNAL_ERROR | 500 | Server error |
| AI_UNAVAILABLE | 503 | AI service not available |
| AI_PARSE_FAILED | 422 | AI couldn't process input |

---

# Goals API

## Create Goal

**POST** `/goals`

Creates a new goal.

### Request Body

```typescript
interface CreateGoalRequest {
  title: string;              // Required, 1-200 chars
  description?: string;       // Optional, max 2000 chars
  timeframe?: 'long' | 'medium' | 'short';  // Default: 'short'
  parent_id?: string;         // UUID of parent goal
  target_value?: number;      // Optional numeric target
  target_unit?: string;       // Unit for target (e.g., "books", "km")
  target_date?: string;       // Optional deadline (ISO date)
}
```

### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "uuid-123",
    "title": "Read 12 books this year",
    "description": null,
    "timeframe": "long",
    "parent_id": null,
    "target_value": 12,
    "target_unit": "books",
    "status": "active",
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T10:00:00Z"
  }
}
```

---

## List Goals

**GET** `/goals`

Returns all active goals.

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| status | string | Filter: active, archived, all (default: active) |
| timeframe | string | Filter: long, medium, short |
| parent_id | string | Filter by parent (use "null" for root) |
| include_progress | boolean | Include computed progress (default: false) |

### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-123",
      "title": "Read 12 books this year",
      "timeframe": "long",
      "parent_id": null,
      "target_value": 12,
      "target_unit": "books",
      "status": "active",
      "progress": {
        "current_value": 3,
        "percentage": 25,
        "activity_count": 45
      }
    }
  ]
}
```

---

## Get Goal

**GET** `/goals/:id`

Returns single goal with details.

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| include_progress | boolean | Include computed progress |
| include_children | boolean | Include child goals |
| include_activities | boolean | Include recent activities |

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "uuid-123",
    "title": "Read 12 books this year",
    "description": "Reading goal for 2025",
    "timeframe": "long",
    "parent_id": null,
    "target_value": 12,
    "target_unit": "books",
    "status": "active",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-15T10:00:00Z",
    "progress": {
      "current_value": 3,
      "percentage": 25,
      "activity_count": 45
    },
    "children": [
      { "id": "uuid-456", "title": "Finish Atomic Habits" }
    ],
    "recent_activities": [
      { "id": "uuid-789", "description": "Read 30 pages" }
    ]
  }
}
```

---

## Update Goal

**PATCH** `/goals/:id`

Updates goal properties.

### Request Body

```typescript
interface UpdateGoalRequest {
  title?: string;
  description?: string;
  timeframe?: 'long' | 'medium' | 'short';
  parent_id?: string | null;
  target_value?: number | null;
  target_unit?: string | null;
  status?: 'active' | 'archived';
}
```

### Response (200 OK)

Returns updated goal object.

---

## Delete Goal

**DELETE** `/goals/:id`

Soft-deletes a goal.

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| cascade | boolean | Also soft-delete children (default: false) |

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "uuid-123",
    "deleted": true
  }
}
```

---

# Activities API

## Create Activity

**POST** `/activities`

Logs a new activity.

### Request Body

```typescript
interface CreateActivityRequest {
  title: string;              // Required, 1-500 chars
  activityType: 'quantity' | 'duration' | 'completion';
  value?: number;             // Required for quantity/duration
  unit?: string;              // e.g., "pages", "minutes", "km"
  goalId?: string;            // Link to goal (optional)
  activityDate: string;       // ISO date (YYYY-MM-DD)
  category?: 'growth' | 'maintenance';  // Default: growth
  tags?: string[];            // e.g. ["gym", "morning"]  max 20 items
  status?: 'planned' | 'completed' | 'skipped';  // Default: planned
  notes?: string;             // Optional notes
  rawInput?: string;          // Original NLP input (for AI plumbing)
}
```

### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "uuid-activity-1",
    "title": "Read 30 pages of Sapiens",
    "activity_type": "quantity",
    "value": 30,
    "unit": "pages",
    "goal_id": "uuid-123",
    "activity_date": "2025-01-15",
    "category": "growth",
    "status": "completed",
    "notes": null,
    "raw_input": null,
    "ai_generated": false,
    "completed_at": "2025-01-15T14:30:00Z",
    "created_at": "2025-01-15T14:30:00Z",
    "updated_at": "2025-01-15T14:30:00Z"
  }
}
```

---

## List Activities

**GET** `/activities`

Returns activities with filters.

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| date | string | Single date (YYYY-MM-DD) |
| start_date | string | Range start (inclusive) |
| end_date | string | Range end (inclusive) |
| goal_id | string | Filter by goal |
| status | string | planned, completed, skipped |
| activity_type | string | quantity, duration, completion |
| limit | number | Max results (default: 50) |
| offset | number | Pagination offset |

### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-activity-1",
      "title": "Read 30 pages of Sapiens",
      "activity_type": "quantity",
      "value": 30,
      "unit": "pages",
      "goal_id": "uuid-123",
      "goal_title": "Read 12 books this year",
      "activity_date": "2025-01-15",
      "category": "growth",
      "status": "completed"
    }
  ],
  "meta": {
    "total": 156,
    "limit": 50,
    "offset": 0
  }
}
```

---

## Get Activity

**GET** `/activities/:id`

Returns single activity.

### Response (200 OK)

Full activity object with goal details.

---

## Update Activity

**PATCH** `/activities/:id`

Updates activity.

### Request Body

```typescript
interface UpdateActivityRequest {
  title?: string;
  activityType?: 'quantity' | 'duration' | 'completion';
  value?: number | null;
  unit?: string | null;
  goalId?: string | null;
  activityDate?: string;
  category?: 'growth' | 'maintenance';
  tags?: string[];            // Replaces the full tags array
  status?: 'planned' | 'completed' | 'skipped';
  notes?: string | null;
  completedAt?: string | null;
}
```

### Response (200 OK)

Returns updated activity.

---

## Delete Activity

**DELETE** `/activities/:id`

Soft-deletes an activity.

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "uuid-activity-1",
    "deleted": true
  }
}
```

---

## Get Today's Activities

**GET** `/activities/today`

Convenience endpoint for Today View.

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "date": "2025-01-15",
    "planned": [
      { "id": "...", "title": "Morning run", "status": "planned" }
    ],
    "completed": [
      { "id": "...", "title": "Read 30 pages", "status": "completed" }
    ],
    "skipped": []
  }
}
```

---

# Progress API

## Get Goal Progress

**GET** `/goals/:id/progress`

Returns computed progress for a goal.

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "goal_id": "uuid-123",
    "current_value": 3,
    "target_value": 12,
    "unit": "books",
    "percentage": 25,
    "activity_count": 45,
    "last_activity_date": "2025-01-15",
    "days_active": 20,
    "current_streak": 5
  }
}
```

---

## Get Dashboard Metrics

**GET** `/metrics/dashboard`

Returns aggregated metrics for the dashboard. Response shape is defined in `@polaris/shared` as `DashboardMetrics` (see `packages/shared/src/types/api-responses.ts`).

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| period | string | `week`, `month`, or `year` (default: week) |

### Response (200 OK)

Response body uses **camelCase** (matches backend/Prisma).

```json
{
  "success": true,
  "data": {
    "period": "week",
    "startDate": "2025-01-13",
    "endDate": "2025-01-19",
    "totalActivities": 24,
    "completedActivities": 20,
    "plannedActivities": 4,
    "goalsTouched": 5,
    "currentStreak": 5,
    "longestStreak": 12,
    "activityByDay": {
      "2025-01-13": 4,
      "2025-01-14": 3,
      "2025-01-15": 5,
      "2025-01-16": 0,
      "2025-01-17": 6,
      "2025-01-18": 4,
      "2025-01-19": 2
    },
    "goalProgress": [
      {
        "goalId": "uuid-123",
        "goalTitle": "Read 12 books",
        "currentValue": 3,
        "targetValue": 12,
        "unit": "books",
        "percentage": 25
      }
    ]
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| goalProgress[].goalId | string | Goal UUID |
| goalProgress[].goalTitle | string | Goal title |
| goalProgress[].currentValue | number | Sum of completed activity values |
| goalProgress[].targetValue | number \| null | Target (null if no target) |
| goalProgress[].unit | string \| null | Unit (e.g. "books", "km") |
| goalProgress[].percentage | number \| null | 0–100 when target set, else null |

---

# Goals API (continued)

## Get Dormant Goals

**GET** `/goals/dormant`

Returns goals that have had no activity for ≥ 7 days, or have never been touched. Sorted most-dormant first. Used by the Weekly Review screen and GoalMatrix badge.

### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-goal-1",
      "title": "Run a 5K",
      "timeframe": "short",
      "progress": 20,
      "daysSinceLastActivity": 12,
      "lastActivityDate": "2026-04-01"
    },
    {
      "id": "uuid-goal-2",
      "title": "Learn Spanish",
      "timeframe": "long",
      "progress": 0,
      "daysSinceLastActivity": null,
      "lastActivityDate": null
    }
  ]
}
```

> `daysSinceLastActivity: null` means the goal has never been touched (no logged activities).

---

# AI API

## Parse Activity

**POST** `/ai/parse-activity`

Parses natural language into a structured activity using the configured AI provider.

### Request Body

```typescript
{ rawInput: string }  // Natural language, e.g. "ran 5km this morning"
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "intent": "log_activity",
    "title": "Morning run",
    "activityType": "duration",
    "value": 30,
    "unit": "minutes",
    "suggestedGoalId": "uuid-123",
    "suggestedGoalTitle": "Run a 5K",
    "confidence": 0.93,
    "provider": "ollama"
  }
}
```

---

## Analyze Week

**POST** `/ai/analyze-week`

Generates a behavioral insight summary for the last 7 days.

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "summary": "You logged 18 activities this week...",
    "insights": ["Reading streak: 5 days", "Exercise dropped mid-week"],
    "suggestions": ["Schedule runs earlier", "Add a Wednesday session"],
    "provider": "ollama"
  }
}
```

---

## Analyze Week (Streaming SSE)

**GET** `/ai/analyze-week/stream`

Same as `POST /ai/analyze-week` but streams tokens as Server-Sent Events. Useful for showing a live typewriter effect in the UI.

### Response

`Content-Type: text/event-stream`

The stream emits JSON-encoded `data:` lines:

```
data: {"type":"token","token":"You "}
data: {"type":"token","token":"logged "}
data: {"type":"result","data":{"summary":"...","insights":[...],"suggestions":[...]}}
data: [DONE]
```

Event types:
| Type | Payload | Notes |
|------|---------|-------|
| `token` | `{ token: string }` | Incremental text chunk (Ollama only) |
| `result` | `{ data: AIWeeklyAnalysis }` | Final structured result |
| `error` | `{ message: string }` | Stream error |

> For non-Ollama providers (mock/openai), only a single `result` event is emitted (no token chunks).

---

## Get Daily Coach

**GET** `/ai/daily-coach`

Returns a daily coaching message and a suggested activity for today. Response is typically cached once per day.

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "message": "You've built solid momentum this week. Keep it going!",
    "suggestedActivity": {
      "title": "Morning run",
      "activityType": "duration",
      "unit": "minutes",
      "goalId": "uuid-123",
      "goalTitle": "Run a 5K"
    },
    "quote": "The secret of getting ahead is getting started.",
    "provider": "ollama"
  }
}
```

---

## Get AI Config

**GET** `/ai/config`

Returns the active AI provider and Ollama settings.

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "provider": "ollama",
    "ollamaModel": "gemma4:e4b",
    "ollamaUrl": "http://localhost:11434"
  }
}
```

---

## Set AI Model

**POST** `/ai/config`

Updates the active Ollama model at runtime (no restart needed). Only affects Ollama provider.

### Request Body

```typescript
{ model: string }  // e.g. "llama3.2", "gemma4:e4b"
```

### Response (200 OK)

```json
{
  "success": true,
  "data": { "model": "llama3.2" }
}
```

---

## List Ollama Models

**GET** `/ai/ollama-models`

Proxies to Ollama `/api/tags` and returns list of locally installed model names.

### Response (200 OK)

```json
{
  "success": true,
  "data": { "models": ["gemma4:e4b", "llama3.2", "phi3"] }
}
```

---

# Voice API

## Voice Status

**GET** `/voice/status`

Checks whether the Whisper transcription service is running and available.

### Response (200 OK)

```json
{
  "success": true,
  "data": { "available": true, "model": "base" }
}
```

---

## Transcribe Audio

**POST** `/voice/transcribe`

Sends audio to Whisper for transcription. Returns the transcript text.

### Request

`Content-Type: multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `audio` | File | WAV or WebM audio blob |

### Response (200 OK)

```json
{
  "success": true,
  "data": { "transcript": "ran 5km this morning in the park" }
}
```

---

# Focus Sessions API

## List Focus Sessions

**GET** `/focus-sessions`

Returns paginated focus sessions.

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `activityId` | string | Filter by linked activity |
| `limit` | number | Default 20 |
| `offset` | number | Default 0 |

### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-session-1",
      "activityId": "uuid-activity-1",
      "durationSeconds": 1500,
      "startedAt": "2026-04-13T09:00:00Z",
      "endedAt": "2026-04-13T09:25:00Z",
      "notes": null,
      "createdAt": "2026-04-13T09:00:00Z"
    }
  ],
  "meta": { "total": 5, "limit": 20, "offset": 0 }
}
```

---

## Create Focus Session

**POST** `/focus-sessions`

Starts or records a focus session.

### Request Body

```typescript
{
  activityId?: string;       // Optional link to activity
  durationSeconds: number;   // Session length in seconds
  startedAt: string;         // ISO datetime
  endedAt?: string;          // ISO datetime (can be set on end)
  notes?: string;
}
```

### Response (201 Created)

Returns the created focus session object.

---

## Update Focus Session

**PATCH** `/focus-sessions/:id`

Updates a focus session (e.g. set `endedAt` when session ends).

### Request Body

```typescript
{
  endedAt?: string;
  durationSeconds?: number;
  notes?: string;
}
```

### Response (200 OK)

Returns updated focus session.

---

## Delete Focus Session

**DELETE** `/focus-sessions/:id`

Soft-deletes a focus session.

### Response (200 OK)

```json
{ "success": true, "data": { "id": "uuid-session-1", "deleted": true } }
```

---

## Get Focus Session Stats

**GET** `/focus-sessions/stats`

Returns aggregate focus time stats.

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `period` | `'week'` \| `'month'` \| `'all'` | Time range (default: `week`) |

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "totalSessions": 12,
    "totalSeconds": 18000,
    "averageSeconds": 1500,
    "longestSeconds": 3600
  }
}
```

---

# Events API (Internal/Debug)

## List Events

**GET** `/events`

Returns event log (for debugging/audit).

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| entity_type | string | goal, activity |
| entity_id | string | Specific entity |
| event_type | string | created, updated, completed, skipped, archived, restored, deleted |
| start_date | string | Range start |
| end_date | string | Range end |
| limit | number | Max results |

### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-event-1",
      "entity_type": "activity",
      "entity_id": "uuid-activity-1",
      "event_type": "completed",
      "previous_state": { "status": "planned" },
      "new_state": { "status": "completed", "completed_at": "2025-01-15T14:30:00Z" },
      "metadata": { "source": "today_view" },
      "timestamp": "2025-01-15T14:30:00Z"
    }
  ]
}
```

---

# Health API

## Health Check

**GET** `/health`

Returns service health.

### Response (200 OK)

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "database": "connected",
  "ai": {
    "provider": "openai",
    "status": "available"
  }
}
```

---

# TypeScript Type Definitions

```typescript
// Shared types for frontend/backend

export type Timeframe = 'long' | 'medium' | 'short';
export type GoalStatus = 'active' | 'completed' | 'paused' | 'archived';
export type ActivityType = 'quantity' | 'duration' | 'completion';
export type ActivityStatus = 'planned' | 'completed' | 'skipped';

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  timeframe: Timeframe;
  parent_id: string | null;
  target_value: number | null;
  target_unit: string | null;
  target_date: string | null;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export type Category = 'growth' | 'maintenance';

export interface Activity {
  id: string;
  title: string;
  activity_type: ActivityType;
  value: number | null;
  unit: string | null;
  goal_id: string | null;
  activity_date: string;
  category: Category;
  status: ActivityStatus;
  notes: string | null;
  raw_input: string | null;
  ai_generated: boolean;
  ai_categorized: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface Progress {
  goal_id: string;
  current_value: number;
  target_value: number | null;
  unit: string | null;
  percentage: number | null;
  activity_count: number;
}

export interface Event {
  id: string;
  entity_type: 'goal' | 'activity';
  entity_id: string;
  event_type: 'created' | 'updated' | 'completed' | 'skipped' | 'archived' | 'restored' | 'deleted';
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  timestamp: string;
}

export interface Insight {
  id: string;
  period_type: 'day' | 'week' | 'month';
  period_start: string;
  period_end: string;
  prompt_id: string;
  prompt_version: string;
  model_name: string;
  raw_prompt: string;
  raw_response: string;
  parsed_summary: Record<string, unknown>;
  confidence_score: number | null;
  created_at: string;
}
```

---

# Validation Rules

| Field | Rules |
|-------|-------|
| title | 1-200 chars, required |
| description | 0-2000 chars |
| activity_date | Valid ISO date |
| value | Positive number or null |
| unit | 1-50 chars |
| timeframe | Enum: long, medium, short |
| status | Enum: active, archived (goals) / planned, completed, skipped (activities) |
| activity_type | Enum: quantity, duration, completion |
| category | Enum: growth, maintenance |
| target_date | Valid ISO date or null |

---

# Rate Limiting (Future)

Not implemented in MVP. Future considerations:

- AI endpoints: 100 req/min
- Standard endpoints: 1000 req/min
- Burst allowance: 2x for 10 seconds

---

# Versioning

API uses `/api/` prefix without version in the URL path for MVP.

If breaking changes are needed in the future, versioning will be introduced via URL path (`/api/v2/`).

Non-breaking additions (new fields, new endpoints) don't require version bump.

---

**This contract is the source of truth for API behavior. Frontend and backend must agree.**
