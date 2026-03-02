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
  activity_type: 'quantity' | 'duration' | 'completion';
  value?: number;             // Required for quantity/duration
  unit?: string;              // e.g., "pages", "minutes", "km"
  goal_id?: string;           // Link to goal (optional)
  activity_date: string;      // ISO date (YYYY-MM-DD)
  category?: 'growth' | 'maintenance';  // Default: growth
  status?: 'planned' | 'completed' | 'skipped';  // Default: planned
  notes?: string;             // Optional notes
  raw_input?: string;         // Original NLP input (Phase 3)
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
  activity_type?: 'quantity' | 'duration' | 'completion';
  value?: number | null;
  unit?: string | null;
  goal_id?: string | null;
  activity_date?: string;
  category?: 'growth' | 'maintenance';
  status?: 'planned' | 'completed' | 'skipped';
  notes?: string | null;
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

Returns aggregated metrics for dashboard.

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| period | string | week, month, year (default: week) |

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "period": "week",
    "start_date": "2025-01-13",
    "end_date": "2025-01-19",
    "total_activities": 24,
    "completed_activities": 20,
    "planned_activities": 4,
    "goals_touched": 5,
    "current_streak": 5,
    "longest_streak": 12,
    "activity_by_day": {
      "2025-01-13": 4,
      "2025-01-14": 3,
      "2025-01-15": 5,
      "2025-01-16": 0,
      "2025-01-17": 6,
      "2025-01-18": 4,
      "2025-01-19": 2
    },
    "goal_progress": [
      {
        "goal_id": "uuid-123",
        "title": "Read 12 books",
        "percentage": 25
      }
    ]
  }
}
```

---

# AI API (Phase 3)

## Parse Activity

**POST** `/ai/parse-activity`

Parses natural language into structured activity.

### Request Body

```typescript
interface ParseActivityRequest {
  input: string;  // Natural language input
}
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "parsed": {
      "title": "Read 30 pages of Sapiens",
      "activity_type": "quantity",
      "value": 30,
      "unit": "pages",
      "suggested_goal_id": "uuid-123",
      "suggested_goal_title": "Read 12 books this year"
    },
    "confidence": 0.92,
    "alternatives": []
  }
}
```

### Error Response (422)

```json
{
  "success": false,
  "error": {
    "code": "AI_PARSE_FAILED",
    "message": "Could not parse input",
    "details": {
      "input": "asdfkjhsdf",
      "reason": "unrecognized_format"
    }
  }
}
```

---

## Get Morning Suggestions

**POST** `/ai/morning-suggestions`

Gets AI-suggested activities for today.

### Request Body

```typescript
interface MorningSuggestionsRequest {
  date: string;           // Target date
  max_suggestions?: number;  // Default: 5
}
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "title": "Morning run",
        "activity_type": "duration",
        "value": 20,
        "unit": "minutes",
        "goal_id": "uuid-456",
        "reason": "You usually run on Mondays"
      },
      {
        "title": "Read 30 pages",
        "activity_type": "quantity",
        "value": 30,
        "unit": "pages",
        "goal_id": "uuid-123",
        "reason": "3 days since last reading activity"
      }
    ],
    "generated_at": "2025-01-15T06:00:00Z"
  }
}
```

---

## Generate Weekly Insight

**POST** `/ai/weekly-insight`

Generates AI analysis of past week.

### Request Body

```typescript
interface WeeklyInsightRequest {
  week_start: string;  // Monday of the week
}
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "insight": {
      "id": "uuid-insight-1",
      "week_start": "2025-01-13",
      "summary": "You logged 18 activities this week, up from 14 last week. Reading is consistent (5/7 days), but exercise dropped.",
      "highlights": [
        "Reading streak: 5 days",
        "Best day: Friday (6 activities)"
      ],
      "suggestions": [
        "Schedule runs earlier in the day",
        "Consider adding a Wednesday exercise session"
      ],
      "generated_at": "2025-01-19T23:00:00Z"
    }
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
