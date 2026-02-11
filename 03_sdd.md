# Project Polaris — System Design Document (SDD)

## 1. System Overview

Polaris is a Local-First Web Application consisting of:

- React Frontend (Client Layer)
- Node.js Backend (Application Layer)
- SQLite Database (Persistence Layer)
- Ollama (AI Layer)

All components run locally on the user's machine during MVP.

The architecture is modular and layered to support future SaaS conversion.

---

# 2. High-Level Architecture

Client (React)
        |
        v
Backend API (Node + Express)
        |
        v
Service Layer
        |
        v
Repository Layer
        |
        v
SQLite Database

AI Flow:
Backend → LLM Adapter → Ollama → Structured Response → Validation → Persist

---

# 3. Backend Architecture (Layered)

The backend follows a strict layered structure:

## 3.1 Layers

### 1. Routes Layer
- Defines REST endpoints
- Handles request validation
- Delegates to controllers
- No business logic

### 2. Controllers Layer
- Accepts request data
- Calls service layer
- Handles response formatting
- No database logic

### 3. Services Layer
- Core business logic
- Goal rollups
- Streak calculations
- AI orchestration
- Validation logic
- Transaction coordination

### 4. Repository Layer
- Direct database interactions
- No business logic
- Pure data persistence

### 5. Utils Layer
- Helpers
- Date utilities
- Validation schemas
- Error handlers
- Logging utilities

### 6. AI Adapter Layer
- Wraps Ollama API
- Enforces JSON schema
- Handles retries
- Handles timeouts
- Caches responses
- Returns structured output

---

# 4. Backend Folder Structure

/backend
  /src
    /routes
      goals.routes.js
      tasks.routes.js
      ai.routes.js
      insights.routes.js

    /controllers
      goals.controller.js
      tasks.controller.js
      ai.controller.js
      insights.controller.js

    /services
      goals.service.js
      tasks.service.js
      streak.service.js
      analysis.service.js
      ai.service.js

    /repositories
      goals.repository.js
      tasks.repository.js
      logs.repository.js
      insights.repository.js

    /ai
      ollama.adapter.js
      prompt.registry.js
      schema.validator.js

    /utils
      logger.js
      errors.js
      date.helper.js
      async.handler.js

    /config
      db.config.js
      app.config.js

    app.js
    server.js

---

# 5. Database Architecture

Database: SQLite (MVP)

Key Principles:

- Use migrations (Knex or Prisma)
- Enable WAL mode
- Use foreign keys
- Use cascading rules carefully
- Use indexes for:
  - task scheduled_date
  - goal parent_id
  - log timestamp

---

# 6. API Design Principles

RESTful structure:

GET    /api/goals
POST   /api/goals
PUT    /api/goals/:id
DELETE /api/goals/:id

GET    /api/tasks
POST   /api/tasks
PUT    /api/tasks/:id
DELETE /api/tasks/:id

POST   /api/ai/breakdown
POST   /api/ai/analyze
POST   /api/ai/revision

GET    /api/insights

Principles:

- No "saveEverything" endpoints
- All write operations transactional
- AI endpoints return:
  - structured_data
  - metadata (model, tokens, duration)
  - raw_output

---

# 7. Business Logic Responsibilities

## 7.1 Goal Rollup Logic

When a task is completed:

- Update task status
- Recalculate parent goal progress
- Propagate upward to Vision
- Log event

Rollup must be deterministic and not AI-based.

---

## 7.2 Streak Engine

Streak rules:

- Only Growth tasks count
- Count consecutive days where growth task completed
- Store streak state separately for fast retrieval
- Recalculate nightly or on completion event

---

## 7.3 Event Logging

Every mutation:

- Create log entry
- Include timestamp
- Include previous and new state

Logs serve as dataset for AI analysis.

---

# 8. AI Architecture

## 8.1 AI Adapter Contract

AI service must:

- Accept structured context
- Use prompt template from prompt.registry
- Call Ollama
- Validate JSON structure
- Retry once on invalid format
- Return:
  {
    parsed_data,
    raw_response,
    metadata
  }

---

## 8.2 Prompt Versioning

Each prompt has:

- prompt_id
- version
- description
- expected JSON schema

Stored in prompt.registry.

---

## 8.3 Schema Enforcement

All AI responses validated against:

- Predefined JSON schema
- If invalid:
  - Attempt correction prompt
  - If still invalid → fail gracefully

---

## 8.4 Caching

Cache key:

hash(prompt + context)

Cache duration:
Configurable (default: 24 hours)

Cache stored locally in SQLite or memory layer.

---

# 9. Context Window Strategy

For weekly analysis:

- Send summary of last 7 days
- Include:
  - tasks completed
  - tasks skipped
  - durations
  - streaks
- Do NOT send entire history

Older logs condensed into summaries.

---

# 10. Data Compaction Strategy

To prevent database bloat:

- Keep raw logs for 90 days
- Summarize into weekly aggregates
- Delete old raw logs after summary
- Preserve insights permanently

---

# 11. Error Handling Strategy

If Ollama not reachable:

- Catch connection error
- Return:
  { status: "brain_offline" }
- UI shows indicator
- Manual functionality remains intact

If JSON validation fails:

- Retry once
- Log failure
- Return controlled error

---

# 12. Security Model (Local MVP)

- No authentication (single-user)
- CORS restricted to localhost
- Input validation on all endpoints
- Prevent SQL injection via parameterized queries

Future:
Add auth layer for SaaS.

---

# 13. Extensibility Design

System designed to allow:

- Replacing SQLite with Postgres
- Adding Redis cache
- Adding background workers
- Supporting multiple LLM models
- Adding plugin system

Architecture ensures:

Controllers → Services → Repositories separation makes scaling manageable.

---

# 14. Performance Considerations

- All AI calls asynchronous
- No blocking event loop
- Avoid synchronous filesystem operations
- Keep DB writes small and transactional
- Use indexes for common queries

---

# 15. System Constraints

- Single user (MVP)
- Local hardware performance dependent
- Ollama response latency variable
- Context window limitations

System must degrade gracefully.
