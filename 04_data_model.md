# Project Polaris — Data Model & Migration Plan

## 1. Overview

The Polaris data layer is designed for:

- Hierarchical goal tracking
- Deterministic analytics
- AI-driven behavioral insights
- Historical integrity
- Future SaaS scalability

Database: SQLite (MVP)  
Migration Tool: Knex or Prisma  
Deletion Policy: Soft delete only  

---

# 2. Core Data Principles

1. No destructive deletes.
2. Every mutation logged.
3. AI outputs preserved with metadata.
4. Relationships enforced via foreign keys.
5. All timestamps stored in UTC.
6. Schema changes versioned via migrations.

---

# 3. Core Tables

---

## 3.1 goals

Purpose:
Stores Vision, Yearly, Monthly, Weekly goals.

Columns:

- id (UUID, primary key)
- title (string, required)
- description (text, optional)
- timeframe (enum: vision, year, month, week)
- start_date (date)
- end_date (date)
- parent_id (nullable, FK → goals.id)
- progress_percentage (float, default 0)
- status (enum: planned, active, completed, paused)
- is_deleted (boolean, default false)
- created_at (datetime)
- updated_at (datetime)

Indexes:

- parent_id
- timeframe
- is_deleted

Rules:

- parent_id references goals.id
- Deleting a goal sets is_deleted = true
- Children remain intact (orphan check handled in service layer)
- Progress recalculated via service logic

---

## 3.2 tasks

Purpose:
Stores daily actionable items.

Columns:

- id (UUID)
- title
- description
- scheduled_date (date, nullable)
- duration_minutes (integer, nullable)
- linked_goal_id (nullable, FK → goals.id)
- category (enum: growth, maintenance)
- status (enum: todo, done, skipped)
- ai_generated (boolean)
- is_deleted (boolean)
- created_at
- updated_at

Indexes:

- scheduled_date
- linked_goal_id
- category
- status
- is_deleted

Rules:

- Tasks may exist without linked_goal_id.
- Growth tasks contribute to streak logic.
- Soft delete prevents loss of historical streak data.

---

## 3.3 plan_blocks

Purpose:
Defines weekly containers.

Columns:

- id
- title
- start_date
- end_date
- is_deleted
- created_at
- updated_at

Indexes:

- start_date
- end_date

Rules:

- Tasks may reference a plan_block via metadata if needed.
- No cascade delete required.

---

## 3.4 logs (event_log)

Purpose:
Immutable event history.

Columns:

- id
- entity_type (goal, task)
- entity_id
- event_type (created, updated, completed, skipped, deleted)
- previous_state (JSON)
- new_state (JSON)
- timestamp

Indexes:

- entity_id
- timestamp

Rules:

- Logs are append-only.
- No soft delete.
- Used for AI behavioral analysis.

---

## 3.5 insights

Purpose:
Stores AI-generated analyses.

Columns:

- id
- period_type (day, week, month)
- period_start (date)
- prompt_id
- prompt_version
- model_name
- raw_prompt (text)
- raw_response (text)
- parsed_summary (JSON)
- metrics (JSON)
- confidence_score (float)
- created_at

Indexes:

- period_type
- period_start

Rules:

- Insights are permanent.
- Used for longitudinal behavioral tracking.

---

## 3.6 revisions

Purpose:
Stores AI-suggested revision tasks.

Columns:

- id
- task_id (FK → tasks.id)
- suggested_at
- scheduled_for
- accepted (boolean)
- completed (boolean)
- is_deleted
- created_at

Indexes:

- task_id
- scheduled_for

Rules:

- Only created after user confirmation.
- Linked to original task.

---

# 4. Relationship Overview

goals
  └── goals (self-reference)
  └── tasks

tasks
  └── revisions
  └── logs

goals
  └── logs

insights independent (analysis layer)

---

# 5. Soft Delete Policy

Soft delete implemented via:

is_deleted BOOLEAN DEFAULT false

Behavior:

- Deleted items excluded from default queries.
- Historical logs preserved.
- Insights remain intact.
- Restore functionality possible in future.

Hard delete allowed only for:

- Compaction of old logs (controlled process).

---

# 6. Progress Rollup Logic

Progress is NOT stored directly from AI.

Algorithm:

1. Calculate completed tasks under a goal.
2. Divide by total tasks under that goal.
3. Update progress_percentage.
4. Propagate upward recursively.

Executed in service layer.

---

# 7. Streak Data Strategy

Streak calculation is dynamic:

- Based on tasks where:
  category = growth
  status = done
- Consecutive date logic applied.
- Streak state may be cached in memory.
- Optional future: store streak snapshots nightly.

---

# 8. Data Compaction Plan

To prevent SQLite growth:

Raw logs older than 90 days:

1. Summarize into weekly aggregates.
2. Store summary in separate summary table (future extension).
3. Delete raw entries after summary confirmed.

Insights are never deleted.

---

# 9. Migration Strategy

- All schema changes via migration tool.
- No manual schema edits.
- Migration version numbers incremental.
- Before destructive migration:
  - Auto-create DB backup file.

Migration policy:

- Never remove column without deprecation phase.
- Add new columns with defaults.

---

# 10. Future Scalability Considerations

When moving to Postgres:

- Replace UUID with native UUID type.
- Convert JSON text to JSONB.
- Add composite indexes for analytics queries.
- Introduce background worker for compaction.

Data model intentionally compatible with RDBMS migration.

---

# 11. Data Integrity Rules

- Foreign keys enabled.
- Transactions used for:
  - Goal creation with children
  - AI suggestion acceptance
  - Task completion + streak update
- No circular parent references allowed.
- Parent_id must not create cycles.

Cycle detection enforced in service layer.

---

# 12. Dataset Value

The combination of:

- logs
- insights
- tasks
- goal hierarchy

Creates a longitudinal behavioral dataset suitable for:

- AI pattern detection
- Future experimentation
- Personal analytics
- Model comparison

Polaris is not just a task app.
It is a structured behavioral dataset generator.
