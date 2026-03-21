# Project Polaris — System Design Document (SDD)

## 1. System Overview

Polaris is a **Local-First Web Application** for personal activity tracking and goal management, with an architecture designed to support AI coaching features in later phases.

### 1.1 Core Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React + TypeScript | User interface |
| Backend | Node.js + Fastify | API server |
| Database | SQLite + Prisma | Local persistence |
| AI Layer | Provider-agnostic adapter | AI integration (Phase 3+) |

All components run locally on the user's machine during MVP.

### 1.2 Architecture Principles

- **Layered backend** for separation of concerns
- **Provider-agnostic AI adapter** for future flexibility
- **Event sourcing** for behavioral data collection
- **PWA-ready frontend** for future mobile support
- **Offline-first design** for reliability

---

# 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  (Today View, Goals View, Dashboard, Planner)           │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                 Backend API (Fastify)                    │
│  Routes → Controllers → Services → Prisma Client        │
└─────────────────────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│     SQLite Database     │   │   AI Provider Adapter   │
│  (Goals, Activities,    │   │  (Ollama / OpenAI /     │
│   Events, Insights)     │   │   Claude / Mock)        │
└─────────────────────────┘   └─────────────────────────┘
```

---

# 3. Backend Architecture (Layered)

## 3.1 Layer Responsibilities

### Layer 1: Routes
- Define REST endpoints
- Handle HTTP request/response
- Input validation (schema-level)
- Delegate to controllers
- **No business logic**

### Layer 2: Controllers
- Accept validated request data
- Call appropriate service methods
- Format responses
- Handle HTTP status codes
- **No database logic**

### Layer 3: Services
- **Core business logic**
- Progress calculations
- Consistency metrics computation
- Event logging orchestration
- AI request coordination
- Transaction coordination
- Input validation (business rules)

### Layer 4: Prisma Client
- Type-safe database queries
- Auto-generated from schema
- Relations handled automatically
- **No raw SQL needed**

### Layer 5: AI Adapter
- Provider-agnostic interface
- Prompt management
- Response validation
- Retry logic
- Caching
- **Isolated from business logic**

### Layer 6: Utils
- Date helpers
- Validation schemas (Zod/Joi)
- Error handlers
- Logging utilities
- Response formatters

---

## 3.2 Backend Folder Structure

```
apps/backend/
├── src/
│   ├── routes/
│   │   ├── goals.routes.ts
│   │   ├── activities.routes.ts
│   │   ├── dashboard.routes.ts
│   │   ├── ai.routes.ts          # Phase 3
│   │   └── insights.routes.ts    # Phase 3
│   │
│   ├── controllers/
│   │   ├── goals.controller.ts
│   │   ├── activities.controller.ts
│   │   ├── dashboard.controller.ts
│   │   ├── ai.controller.ts      # Phase 3
│   │   └── insights.controller.ts # Phase 3
│   │
│   ├── services/
│   │   ├── goals.service.ts
│   │   ├── activities.service.ts
│   │   ├── progress.service.ts    # Progress calculation
│   │   ├── metrics.service.ts     # Consistency metrics
│   │   ├── events.service.ts      # Event logging
│   │   └── ai.service.ts          # Phase 3
│   │
│   ├── lib/
│   │   └── prisma.ts              # Prisma client instance
│   │
│   ├── ai/                        # Phase 3
│   │   ├── adapter.interface.ts   # Provider interface
│   │   ├── ollama.adapter.ts
│   │   ├── openai.adapter.ts
│   │   ├── mock.adapter.ts        # For testing
│   │   ├── prompt.registry.ts
│   │   └── schema.validator.ts
│   │
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   ├── date.helper.ts
│   │   ├── validation.schemas.ts
│   │   └── response.formatter.ts
│   │
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── app.config.ts
│   │   └── ai.config.ts           # Phase 3
│   │
│   ├── middleware/
│   │   ├── error.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── async.handler.ts
│   │
│   ├── app.ts
│   └── server.ts
│
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/                 # Auto-generated migrations
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── package.json
└── tsconfig.json
```

---

# 4. Database Architecture

## 4.1 Database Choice

**SQLite** for MVP:
- Zero configuration
- File-based (easy backup)
- ACID compliant
- Sufficient for single-user
- Easy migration to PostgreSQL later

## 4.2 Key Principles

- **WAL mode** enabled for better concurrent reads
- **Foreign keys** enforced
- **Soft delete** via `is_deleted` flag
- **Timestamps** in UTC
- **UUIDs** for primary keys
- **Indexed** for common queries

## 4.3 Core Tables

| Table | Purpose |
|-------|---------|
| `goals` | User goals with optional targets |
| `activities` | Logged/planned activities |
| `events` | Immutable audit log |
| `insights` | AI-generated analyses (Phase 3) |
| `recurrence_rules` | Recurring activity templates (Phase 3) |

(See `04_data_model.md` for full schema)

---

# 5. API Design

## 5.1 REST Principles

- **Resource-oriented** URLs
- **HTTP verbs** for actions (GET, POST, PATCH, DELETE)
- **Consistent response format**
- **Meaningful status codes**
- **Pagination** for list endpoints

## 5.2 Response Format

```typescript
// Success
{
  success: true,
  data: { ... }
}

// Success with pagination
{
  success: true,
  data: [ ... ],
  meta: {
    total: 100,
    limit: 20,
    offset: 0
  }
}

// Error
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Human readable message",
    details: { ... }
  }
}
```

## 5.3 Core Endpoints (MVP)

### Goals
```
GET    /api/goals              # List all goals
GET    /api/goals/:id          # Get goal with details
POST   /api/goals              # Create goal
PATCH  /api/goals/:id          # Update goal
DELETE /api/goals/:id          # Soft delete goal
GET    /api/goals/:id/activities  # Get activities for goal
GET    /api/goals/:id/progress  # Get progress & consistency metrics
```

### Activities
```
GET    /api/activities              # List activities (with filters)
GET    /api/activities/today        # Today's activities
GET    /api/activities/:id          # Get single activity
POST   /api/activities              # Log activity
PATCH  /api/activities/:id          # Update activity
DELETE /api/activities/:id          # Soft delete
POST   /api/activities/:id/complete # Mark complete
POST   /api/activities/:id/skip     # Mark skipped
```

### Dashboard
```
GET    /api/metrics/dashboard       # Dashboard data
GET    /api/metrics/week            # Week overview
```

### AI (Phase 3)
```
POST   /api/ai/parse-activity       # Parse natural language
POST   /api/ai/breakdown            # Goal decomposition
POST   /api/ai/analyze-week         # Weekly analysis
POST   /api/ai/suggest-plan         # Morning planning
```

### Insights (Phase 3)
```
GET    /api/insights                # List insights
GET    /api/insights/:id            # Get insight detail
```

---

# 6. Business Logic

## 6.1 Progress Calculation

```typescript
// For goals with numeric targets
calculateProgress(goalId: string): ProgressResult {
  const goal = getGoal(goalId);
  const activities = getCompletedActivities(goalId);
  
  if (goal.target_value) {
    const sum = activities.reduce((acc, a) => acc + (a.value || 0), 0);
    return {
      current: sum,
      target: goal.target_value,
      percentage: Math.min(100, (sum / goal.target_value) * 100),
      unit: goal.target_unit
    };
  }
  
  // For goals without numeric targets
  return {
    activitiesCount: activities.length,
    daysActive: countUniqueDays(activities),
    totalDuration: sumDurationActivities(activities)
  };
}
```

## 6.2 Consistency Metrics

```typescript
calculateMetrics(goalId: string, dateRange: DateRange): Metrics {
  const activities = getCompletedActivities(goalId, dateRange);
  
  return {
    daysActive: countUniqueDays(activities),
    totalDuration: sumDurationMinutes(activities),
    totalQuantity: sumQuantityValues(activities),
    activitiesCount: activities.length,
    currentStreak: calculateStreak(goalId),
    weekOverWeek: compareToLastWeek(activities, goalId)
  };
}
```

## 6.3 Event Logging

Every mutation creates an event log entry:

```typescript
logEvent(event: {
  entity_type: 'goal' | 'activity',
  entity_id: string,
  event_type: 'created' | 'updated' | 'completed' | 'skipped' | 'deleted',
  previous_state: object | null,
  new_state: object,
  metadata?: object
}): void {
  // Append to events table
  // Events are immutable — no updates or deletes
}
```

---

# 7. AI Architecture (Phase 3+)

## 7.1 Provider Interface

```typescript
interface AIProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  
  complete(options: {
    prompt: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
    responseSchema?: JSONSchema;
  }): Promise<AIResponse>;
}

interface AIResponse {
  success: boolean;
  parsed?: object;
  raw: string;
  metadata: {
    provider: string;
    model: string;
    tokensUsed: number;
    latencyMs: number;
  };
}
```

## 7.2 Provider Implementations

```
AI Adapter Interface
├── OllamaAdapter (local LLM)
├── OpenAIAdapter (cloud)
├── ClaudeAdapter (cloud)
└── MockAdapter (testing)
```

Configuration selects provider:
```typescript
// config/ai.config.ts
{
  provider: 'openai' | 'ollama' | 'claude' | 'mock',
  model: 'gpt-4o-mini' | 'llama3' | 'claude-3-haiku',
  fallbackProvider: 'mock',
  timeout: 30000,
  cacheEnabled: true,
  cacheTTL: 86400 // 24 hours
}
```

## 7.3 AI Adapter Layer Responsibilities

- Connect to configured provider
- Load prompt template from registry
- Inject context into prompt
- Send request
- Validate response against JSON schema
- Retry once on invalid response
- Return structured result
- Cache successful responses
- **Never write to database directly**

## 7.4 Prompt Registry

```typescript
// ai/prompt.registry.ts
{
  "activity-parse": {
    version: "1.0",
    description: "Parse natural language activity input",
    systemPrompt: "...",
    userPromptTemplate: "...",
    responseSchema: activityParseSchema,
    maxTokens: 200,
    temperature: 0.3
  },
  "goal-breakdown": { ... },
  "weekly-analysis": { ... },
  "morning-plan": { ... }
}
```

## 7.5 Failure Handling

```typescript
// When AI is unavailable
if (!await aiAdapter.isAvailable()) {
  return {
    status: 'brain_offline',
    message: 'AI unavailable. Manual mode active.',
    fallback: null
  };
}

// When AI returns invalid response
try {
  const response = await aiAdapter.complete({ ... });
  if (!validateSchema(response.parsed, expectedSchema)) {
    // Retry once with correction instruction
    const retry = await aiAdapter.complete({ 
      prompt: correctionPrompt,
      ...
    });
    if (!validateSchema(retry.parsed, expectedSchema)) {
      throw new AIParseError('Invalid response after retry');
    }
  }
} catch (error) {
  logAIFailure(error);
  return { status: 'ai_parse_error', error: error.message };
}
```

---

# 8. Frontend Architecture

## 8.1 Technology Stack

| Technology | Purpose |
|------------|---------|
| React 18+ | UI framework |
| TypeScript | Type safety |
| React Router | Navigation |
| TanStack Query | Data fetching & caching |
| Zustand | Global state (minimal) |
| Tailwind CSS | Styling |
| Radix UI | Accessible components |

## 8.2 Folder Structure

```
apps/frontend/
├── src/
│   ├── components/
│   │   ├── common/          # Reusable components
│   │   ├── goals/           # Goal-related components
│   │   ├── activities/      # Activity components
│   │   ├── dashboard/       # Dashboard components
│   │   └── layout/          # Layout components
│   │
│   ├── pages/
│   │   ├── TodayPage.tsx
│   │   ├── GoalsPage.tsx
│   │   ├── GoalDetailPage.tsx
│   │   ├── DashboardPage.tsx
│   │   └── PlannerPage.tsx   # Phase 2
│   │
│   ├── hooks/
│   │   ├── useGoals.ts
│   │   ├── useActivities.ts
│   │   └── useDashboard.ts
│   │
│   ├── services/
│   │   └── api.ts            # API client
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   ├── utils/
│   │   └── date.utils.ts
│   │
│   └── App.tsx
│
├── public/
│   └── manifest.json         # PWA manifest
│
└── package.json
```

## 8.3 PWA Readiness

Phase 2 will add:
- Service worker registration
- Offline data caching strategy
- Install prompt
- Background sync (when online)

Foundation built in Phase 1:
- Responsive design
- Manifest file placeholder
- API client with offline detection

---

# 9. Data Flow Examples

## 9.1 Logging an Activity

```
User → Creates activity in Today View
  → Frontend calls POST /api/activities
    → Controller validates input
      → Service:
        1. Create activity record
        2. Update goal progress
        3. Log event
        → Prisma Client writes to DB
    → Response returned
  → TanStack Query invalidates cache
→ UI updates immediately
```

## 9.2 Viewing Goal Progress

```
User → Opens Goal Detail View
  → Frontend calls:
    - GET /api/goals/:id
    - GET /api/goals/:id/activities
    - GET /api/goals/:id/progress
    → Backend computes metrics on demand
  → UI renders progress, activities, metrics
```

## 9.3 AI Goal Breakdown (Phase 3)

```
User → Clicks "AI Breakdown" on goal
  → Frontend calls POST /api/ai/breakdown
    → AI Service:
      1. Fetch goal context from DB
      2. Build prompt
      3. Call AI adapter
      4. Validate response
      5. Return suggestions (NOT saved)
    → Response returned
  → UI shows preview modal
    → User edits/accepts each suggestion
    → Frontend calls POST for each accepted item
  → Accepted items saved
```

---

# 10. Error Handling Strategy

## 10.1 Error Types

```typescript
enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  DATABASE_ERROR = 'DATABASE_ERROR',
  AI_UNAVAILABLE = 'AI_UNAVAILABLE',
  AI_PARSE_ERROR = 'AI_PARSE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}
```

## 10.2 HTTP Status Mapping

| Error Type | HTTP Status |
|------------|-------------|
| VALIDATION_ERROR | 400 |
| NOT_FOUND | 404 |
| CONFLICT | 409 |
| DATABASE_ERROR | 500 |
| AI_UNAVAILABLE | 503 |
| AI_PARSE_ERROR | 422 |
| INTERNAL_ERROR | 500 |

## 10.3 Error Handler

```typescript
// Fastify error handler — registered via app.setErrorHandler()
// middleware/error.handler.ts
import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

const errorHandler = (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
  request.log.error(error);
  
  if (error.validation) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: error.validation
      }
    });
  }
  
  // ... handle other error types
  
  return reply.status(error.statusCode ?? 500).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  });
};
```

---

# 11. Security Model (Local MVP)

- **No authentication** (single-user local app)
- **CORS** restricted to localhost
- **Input validation** on all endpoints
- **Parameterized queries** (prevent SQL injection)
- **No secrets in client-side code**

Future (SaaS):
- Add authentication layer
- API rate limiting
- Session management
- Encrypted storage

---

# 12. Performance Considerations

- **All AI calls asynchronous** — never block request handling
- **Database indexes** on common query fields
- **Pagination** for list endpoints
- **TanStack Query caching** on frontend
- **AI response caching** (24h default)
- **Lazy loading** for large datasets

---

# 13. Testing Strategy

## 13.1 Unit Tests
- Service layer logic
- Progress calculations
- Metrics computations
- Date utilities

## 13.2 Integration Tests
- API endpoint behavior
- Database operations
- AI adapter (with mock provider)

## 13.3 E2E Tests (Phase 4)
- Critical user flows
- Today view interactions
- Goal management

---

# 14. Deployment (MVP)

MVP runs locally:

```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev

# Database
# SQLite file created automatically

# AI (Phase 3 - optional)
ollama run llama3
```

Future: Docker compose for easy setup.

---

# 15. Extensibility Points

Architecture designed for:

| Future Feature | Extension Point |
|----------------|-----------------|
| PostgreSQL | Prisma migration + config change |
| Redis cache | Cache adapter interface |
| Background jobs | Job queue layer |
| Multiple AI models | AI adapter interface |
| Plugins | Service hooks (future) |
| Cloud sync | Sync service layer |
| Mobile app | API already REST-based |
