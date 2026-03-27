# Project Polaris — Data Model & Schema Design

## 1. Overview

The Polaris data layer supports:

- **Flexible goal tracking** (quantitative, time-based, or effort-based)
- **Activity logging** (with flexible value types)
- **Computed progress metrics** (not stored, calculated on demand)
- **Event sourcing** for behavioral analysis
- **AI insights persistence** (Phase 3+)
- **Future PWA/sync scalability**

**Database:** SQLite (MVP) → PostgreSQL (future)  
**ORM:** Prisma (type-safe, schema-first)  
**Deletion Policy:** Soft delete only  

---

# 2. Prisma Schema

The Prisma schema is the **source of truth** for data models. Types are auto-generated.

```prisma
// prisma/schema.prisma

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")  // file:./polaris.db
}

generator client {
  provider = "prisma-client-js"
}

model Goal {
  id          String     @id @default(uuid())
  title       String
  description String?
  
  // Timeframe for UI grouping
  timeframe   String     @default("short")  // long, medium, short
  
  // Optional numeric target
  targetValue Float?     @map("target_value")
  targetUnit  String?    @map("target_unit")
  targetDate  DateTime?  @map("target_date")
  
  // Hierarchy (optional parent)
  parentId    String?    @map("parent_id")
  parent      Goal?      @relation("GoalHierarchy", fields: [parentId], references: [id])
  children    Goal[]     @relation("GoalHierarchy")
  
  // Status
  status      String     @default("active")  // active, completed, paused, archived
  
  // Soft delete
  isDeleted   Boolean    @default(false) @map("is_deleted")
  
  // Timestamps
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")
  
  // Relations
  activities  Activity[]

  @@index([parentId])
  @@index([timeframe])
  @@index([status])
  @@index([isDeleted])
  @@map("goals")
}

model Activity {
  id           String    @id @default(uuid())
  title        String
  notes        String?
  
  // Activity type and value
  activityType String    @map("activity_type")  // quantity, duration, completion
  value        Float?    // NULL for completion type
  unit         String?
  
  // Raw input for AI parsing history
  rawInput     String?   @map("raw_input")
  
  // Linked goal (optional)
  goalId       String?   @map("goal_id")
  goal         Goal?     @relation(fields: [goalId], references: [id], onDelete: SetNull)
  
  // When it happened/is planned
  activityDate DateTime  @map("activity_date")
  
  // Classification
  category     String    @default("growth")  // growth, maintenance
  
  // Status
  status       String    @default("planned")  // planned, completed, skipped
  
  // AI tracking
  aiGenerated   Boolean  @default(false) @map("ai_generated")
  aiCategorized Boolean  @default(false) @map("ai_categorized")
  
  // Soft delete
  isDeleted    Boolean   @default(false) @map("is_deleted")
  
  // Timestamps
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  completedAt  DateTime? @map("completed_at")

  @@index([activityDate])
  @@index([goalId])
  @@index([category])
  @@index([status])
  @@index([isDeleted])
  @@map("activities")
}

model Event {
  id           String   @id @default(uuid())
  
  // What changed
  entityType   String   @map("entity_type")  // goal, activity
  entityId     String   @map("entity_id")
  
  // What happened
  eventType    String   @map("event_type")  // created, updated, completed, skipped, etc.
  
  // State snapshots (JSON strings)
  previousState String?  @map("previous_state")
  newState      String   @map("new_state")
  
  // Additional context
  metadata     String?
  
  // Timestamp
  timestamp    DateTime @default(now())

  @@index([entityId])
  @@index([entityType])
  @@index([timestamp])
  @@index([eventType])
  @@map("events")
}

// Phase 3 models
model Insight {
  id             String   @id @default(uuid())
  
  // Period analyzed
  periodType     String   @map("period_type")  // day, week, month
  periodStart    DateTime @map("period_start")
  periodEnd      DateTime @map("period_end")
  
  // AI context
  promptId       String   @map("prompt_id")
  promptVersion  String   @map("prompt_version")
  modelName      String   @map("model_name")
  
  // Full AI interaction
  rawPrompt      String   @map("raw_prompt")
  rawResponse    String   @map("raw_response")
  
  // Parsed output (JSON string)
  parsedSummary  String   @map("parsed_summary")
  
  // Quality metrics
  confidenceScore Float?  @map("confidence_score")
  
  // Timestamp
  createdAt      DateTime @default(now()) @map("created_at")

  @@index([periodStart])
  @@index([periodType])
  @@map("insights")
}

model RecurrenceRule {
  id             String   @id @default(uuid())
  
  // Activity template
  activityTitle  String   @map("activity_title")
  activityType   String   @map("activity_type")
  defaultValue   Float?   @map("default_value")
  defaultUnit    String?  @map("default_unit")
  linkedGoalId   String?  @map("goal_id")
  category       String   @default("growth")
  
  // Recurrence pattern
  frequency      String   // daily, weekly, custom
  daysOfWeek     String?  @map("days_of_week")  // JSON array [1,3,5]
  
  // Source
  source         String   @default("manual")  // manual, ai_suggested
  
  // Status
  isActive       Boolean  @default(true) @map("is_active")
  
  // Timestamps
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  @@index([isActive])
  @@map("recurrence_rules")
}
```

---

# 3. Core Data Principles

1. **Activities are contributions, not checkboxes**
2. **Progress is computed, not stored**
3. **Every mutation is logged as an event**
4. **AI outputs are preserved with full context**
5. **Soft delete preserves history**
6. **All timestamps in UTC**
7. **Schema changes via migrations only**
8. **UUIDs for primary keys**

---

# 4. Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────┐
│   goals     │◄────────│    goals     │ (self-reference)
│             │         │  (parent)    │
└──────┬──────┘         └──────────────┘
       │
       │ 1:N
       ▼
┌─────────────┐
│ activities  │
└──────┬──────┘
       │
       │ 1:N
       ▼
┌─────────────┐
│   events    │ (immutable log)
└─────────────┘

┌─────────────┐         ┌──────────────────┐
│  insights   │         │ recurrence_rules │
│ (Phase 3)   │         │    (Phase 3)     │
└─────────────┘         └──────────────────┘
```

---

# 5. SQL Reference (Generated by Prisma)

The following SQL shows the underlying tables Prisma creates. This is for **reference only** — do not write raw SQL. Use Prisma Client for all queries.

## 5.1 goals

Stores user goals with optional numeric targets and flexible hierarchy.

```sql
CREATE TABLE goals (
  id              TEXT PRIMARY KEY,                    -- UUID
  title           TEXT NOT NULL,
  description     TEXT,
  
  -- Timeframe (for UI grouping)
  timeframe       TEXT CHECK (timeframe IN ('long', 'medium', 'short')),
  
  -- Target (optional - not all goals are quantifiable)
  target_value    REAL,                                -- e.g., 10000
  target_unit     TEXT,                                -- e.g., '₹', 'km', 'pages', 'hours', 'books'
  target_date     DATE,                                -- optional deadline
  
  -- Hierarchy (optional - goals can be standalone)
  parent_id       TEXT REFERENCES goals(id) ON DELETE SET NULL,
  
  -- Status
  status          TEXT NOT NULL DEFAULT 'active' 
                  CHECK (status IN ('active', 'completed', 'paused', 'archived')),
  
  -- Soft delete
  is_deleted      INTEGER NOT NULL DEFAULT 0,          -- SQLite boolean
  
  -- Timestamps
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_goals_parent_id ON goals(parent_id);
CREATE INDEX idx_goals_timeframe ON goals(timeframe);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_is_deleted ON goals(is_deleted);
```

### Key Points:
- `target_value` is **nullable** — some goals are qualitative
- `parent_id` is **nullable** — hierarchy is optional
- Progress is **computed** from activities, not stored here
- `timeframe` is a **hint** for UI grouping, not a constraint

### Examples:

| title | target_value | target_unit | timeframe |
|-------|--------------|-------------|-----------|
| Save ₹1,00,000 this year | 100000 | ₹ | long-term |
| Read 12 books in 2026 | 12 | books | long-term |
| Learn Python | NULL | NULL | long-term |
| Finish Atomic Habits | 1 | books | short-term |
| Run 100km this quarter | 100 | km | medium-term |

---

## 5.2 activities

Stores logged or planned activities that contribute to goals.

```sql
CREATE TABLE activities (
  id              TEXT PRIMARY KEY,                    -- UUID
  title           TEXT NOT NULL,
  notes           TEXT,
  
  -- Activity type + value
  activity_type   TEXT NOT NULL 
                  CHECK (activity_type IN ('quantity', 'duration', 'completion')),
  value           REAL,                                -- NULL for 'completion' type
  unit            TEXT,                                -- Inherited or specified
  
  -- Raw input (for AI parsing history)
  raw_input       TEXT,                                -- Original user text input
  
  -- Linked goal (optional)
  goal_id         TEXT REFERENCES goals(id) ON DELETE SET NULL,
  
  -- Scheduling
  activity_date   DATE NOT NULL,                       -- When it happened/is planned
  
  -- Classification
  category        TEXT NOT NULL DEFAULT 'growth' 
                  CHECK (category IN ('growth', 'maintenance')),
  
  -- Status
  status          TEXT NOT NULL DEFAULT 'planned' 
                  CHECK (status IN ('planned', 'completed', 'skipped')),
  
  -- AI tracking
  ai_generated    INTEGER NOT NULL DEFAULT 0,          -- Was this suggested by AI?
  ai_categorized  INTEGER NOT NULL DEFAULT 0,          -- Was the goal link AI-suggested?
  
  -- Soft delete
  is_deleted      INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at    DATETIME                              -- When status changed to completed
);

-- Indexes
CREATE INDEX idx_activities_activity_date ON activities(activity_date);
CREATE INDEX idx_activities_goal_id ON activities(goal_id);
CREATE INDEX idx_activities_category ON activities(category);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_is_deleted ON activities(is_deleted);
CREATE INDEX idx_activities_date_status ON activities(activity_date, status);
```

### Activity Types:

| Type | Use Case | Value Example | Unit Example |
|------|----------|---------------|--------------|
| `quantity` | Measurable amounts | 30 | pages |
| `duration` | Time spent | 120 | minutes |
| `completion` | Just did it | NULL | NULL |

### Key Points:
- `raw_input` stores original text for AI learning
- `goal_id` is **nullable** — maintenance activities may not link to goals
- `value` is **nullable** for `completion` type activities
- `completed_at` tracks when activity was marked done (for streak calculation)

### Examples:

| title | activity_type | value | unit | goal_id |
|-------|---------------|-------|------|----------------|
| Read 30 pages of Atomic Habits | quantity | 30 | pages | (goal: Finish Atomic Habits) |
| Studied Python | duration | 60 | minutes | (goal: Learn Python) |
| Morning walk | completion | NULL | NULL | (goal: Get fit) |
| Saved ₹500 by skipping lunch | quantity | 500 | ₹ | (goal: Save ₹1L) |
| Grocery shopping | completion | NULL | NULL | NULL (maintenance) |

---

## 5.3 events

Immutable audit log for all mutations. Enables AI behavioral analysis.

```sql
CREATE TABLE events (
  id              TEXT PRIMARY KEY,                    -- UUID
  
  -- What changed
  entity_type     TEXT NOT NULL 
                  CHECK (entity_type IN ('goal', 'activity')),
  entity_id       TEXT NOT NULL,
  
  -- What happened
  event_type      TEXT NOT NULL 
                  CHECK (event_type IN (
                    'created', 'updated', 'completed', 'skipped', 
                    'archived', 'restored', 'deleted'
                  )),
  
  -- State snapshots (JSON)
  previous_state  TEXT,                                -- JSON, NULL for 'created'
  new_state       TEXT NOT NULL,                       -- JSON
  
  -- Context
  metadata        TEXT,                                -- Additional JSON context
  
  -- Timestamp
  timestamp       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_events_entity_id ON events(entity_id);
CREATE INDEX idx_events_entity_type ON events(entity_type);
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_events_event_type ON events(event_type);
```

### Key Points:
- Events are **append-only** — never updated or deleted
- State stored as JSON for flexibility
- Serves as dataset for AI pattern detection
- Enables future undo/history features

### Example Event:

```json
{
  "id": "evt_123",
  "entity_type": "activity",
  "entity_id": "act_456",
  "event_type": "completed",
  "previous_state": { "status": "planned" },
  "new_state": { "status": "completed", "completed_at": "2026-02-12T18:30:00Z" },
  "metadata": { "source": "today_view", "duration_seconds": 3600 },
  "timestamp": "2026-02-12T18:30:00Z"
}
```

---

## 5.4 insights (Phase 3)

Stores AI-generated analyses for historical reference.

```sql
CREATE TABLE insights (
  id              TEXT PRIMARY KEY,                    -- UUID
  
  -- Period analyzed
  period_type     TEXT NOT NULL 
                  CHECK (period_type IN ('day', 'week', 'month')),
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  
  -- AI context
  prompt_id       TEXT NOT NULL,                       -- Reference to prompt registry
  prompt_version  TEXT NOT NULL,
  model_name      TEXT NOT NULL,
  
  -- Full AI interaction (for debugging/improvement)
  raw_prompt      TEXT NOT NULL,
  raw_response    TEXT NOT NULL,
  
  -- Parsed output
  parsed_summary  TEXT NOT NULL,                       -- JSON
  
  -- Quality metrics
  confidence_score REAL,
  
  -- Timestamps
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_insights_period_start ON insights(period_start);
CREATE INDEX idx_insights_period_type ON insights(period_type);
```

### Parsed Summary Structure:

```json
{
  "summary": "You had a productive week focused on learning...",
  "consistency_score": 78,
  "strengths": ["Consistent Python study", "Met savings goal"],
  "weaknesses": ["Skipped 3 workout days"],
  "recommendations": ["Consider morning workouts"],
  "patterns_detected": ["Most productive on Tuesday evenings"]
}
```

---

## 5.5 recurrence_rules (Phase 3)

Stores recurring activity templates.

```sql
CREATE TABLE recurrence_rules (
  id              TEXT PRIMARY KEY,                    -- UUID
  
  -- Activity template
  activity_title  TEXT NOT NULL,
  activity_type   TEXT NOT NULL,
  default_value   REAL,
  default_unit    TEXT,
  goal_id         TEXT REFERENCES goals(id) ON DELETE SET NULL,
  category        TEXT NOT NULL DEFAULT 'growth',
  
  -- Recurrence pattern
  frequency       TEXT NOT NULL 
                  CHECK (frequency IN ('daily', 'weekly', 'custom')),
  days_of_week    TEXT,                                -- JSON array: [1,3,5] for Mon/Wed/Fri
  
  -- Source
  source          TEXT NOT NULL DEFAULT 'manual' 
                  CHECK (source IN ('manual', 'ai_suggested')),
  
  -- Status
  is_active       INTEGER NOT NULL DEFAULT 1,
  
  -- Timestamps
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_recurrence_rules_is_active ON recurrence_rules(is_active);
CREATE INDEX idx_recurrence_rules_goal_id ON recurrence_rules(goal_id);
```

---

# 6. Computed Data (Not Stored)

The following are **computed on demand**, not stored in the database:

## 6.1 Goal Progress

```typescript
interface GoalProgress {
  // For goals with numeric targets
  current_value?: number;      // SUM of activity values
  target_value?: number;       // From goal.target_value
  percentage?: number;         // (current / target) * 100
  unit?: string;
  
  // For all goals (consistency metrics)
  activities_count: number;    // COUNT of completed activities
  days_active: number;         // COUNT DISTINCT of activity_date
  total_duration_minutes?: number;  // SUM of duration activities
}
```

## 6.2 Consistency Metrics

```typescript
interface ConsistencyMetrics {
  current_streak: number;          // Consecutive days with activity
  longest_streak: number;          // Historical best
  this_week_activities: number;
  last_week_activities: number;
  week_over_week_change: number;   // Percentage change
  average_daily_duration?: number;
}
```

## 6.3 Dashboard Summary

```typescript
interface DashboardSummary {
  active_goals_count: number;
  today_activities_planned: number;
  today_activities_completed: number;
  week_completion_rate: number;
  growth_vs_maintenance_ratio: number;
  current_streak: number;
}
```

---

# 7. Query Patterns

All queries use Prisma Client. Type safety is automatic.

## 7.1 Get Today's Activities

```typescript
const today = new Date().toISOString().split('T')[0];

const activities = await prisma.activity.findMany({
  where: {
    activityDate: new Date(today),
    isDeleted: false,
  },
  orderBy: [
    { status: 'asc' },  // planned first
    { createdAt: 'desc' },
  ],
  include: {
    goal: { select: { id: true, title: true } },
  },
});
```

## 7.2 Calculate Goal Progress

```typescript
const progress = await prisma.activity.aggregate({
  where: {
    goalId: goalId,
    status: 'completed',
    isDeleted: false,
  },
  _sum: { value: true },
  _count: { id: true },
});

// Result: { _sum: { value: 350 }, _count: { id: 15 } }
```

## 7.3 Calculate Current Streak

```typescript
// Get distinct dates with completed growth activities, most recent first
const activityDates = await prisma.activity.findMany({
  where: {
    status: 'completed',
    category: 'growth',
    isDeleted: false,
  },
  select: { activityDate: true },
  distinct: ['activityDate'],
  orderBy: { activityDate: 'desc' },
});

// Count consecutive days from today
let streak = 0;
let checkDate = new Date();
for (const { activityDate } of activityDates) {
  if (isSameDay(activityDate, checkDate)) {
    streak++;
    checkDate = subDays(checkDate, 1);
  } else if (activityDate < checkDate) {
    break;  // Gap found
  }
}
```

## 7.4 Get Goal With Activities

```typescript
const goalWithActivities = await prisma.goal.findUnique({
  where: { id: goalId, isDeleted: false },
  include: {
    activities: {
      where: { isDeleted: false },
      orderBy: { activityDate: 'desc' },
      take: 20,  // Recent activities
    },
    children: {
      where: { isDeleted: false },
      select: { id: true, title: true, status: true },
    },
  },
});
```

---

# 8. Soft Delete Policy

## 8.1 Implementation

```sql
-- All tables have: is_deleted INTEGER NOT NULL DEFAULT 0

-- "Delete" operation
UPDATE goals SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?;

-- Default query filter
WHERE is_deleted = 0
```

## 8.2 Behavior Rules

| Action | Behavior |
|--------|----------|
| Delete goal | Sets `is_deleted = 1`, children remain (orphan) |
| Delete activity | Sets `is_deleted = 1`, events preserved |
| Restore | Sets `is_deleted = 0` |
| Query default | Always filter `is_deleted = 0` |
| Archive view | Query `is_deleted = 1` |

## 8.3 Cascade Behavior

- Deleting a goal does **NOT** cascade to children
- Orphaned sub-goals remain accessible
- Events are **never** deleted
- Insights are **never** deleted

---

# 9. Migration Strategy

## 9.1 Principles

- All schema changes via Prisma migrations
- Schema defined in `prisma/schema.prisma`
- `npx prisma migrate dev` for development
- `npx prisma migrate deploy` for production
- Destructive changes require deprecation period

## 9.2 Migration Workflow

```bash
# After changing schema.prisma:
npx prisma migrate dev --name add_new_field

# This will:
# 1. Generate migration SQL
# 2. Apply to dev database
# 3. Regenerate Prisma Client types
```

## 9.3 Migration Files

```
prisma/migrations/
  20260212120000_initial/
    migration.sql
  20260215090000_add_insights/
    migration.sql
```

## 9.4 Safe Migration Practices

```prisma
// Adding a field (safe)
model Goal {
  // existing fields...
  newField String? @default("default_value") @map("new_field")
}

// Removing a field (requires deprecation)
// Step 1: Stop using field in code
// Step 2: Wait for release cycle
// Step 3: Remove from schema in later migration
```

---

# 10. Data Integrity Rules

- **Foreign keys enabled** via `PRAGMA foreign_keys = ON`
- **Transactions** for multi-table operations
- **No circular parent references** (enforced in service layer)
- **Timestamps always UTC**
- **UUIDs generated client-side** (using `uuid` package)

---

# 11. Event Compaction (Future)

To prevent unbounded event table growth:

```
Phase 1: Keep all events (sufficient for year 1)
Phase 2: Summarize events older than 90 days
Phase 3: Archive raw events to cold storage
```

Compaction is **not MVP scope**.

---

# 12. Future PostgreSQL Migration

When scaling to PostgreSQL:

| SQLite | PostgreSQL |
|--------|------------|
| TEXT (UUID) | UUID native type |
| TEXT (JSON) | JSONB |
| INTEGER (boolean) | BOOLEAN |
| DATETIME | TIMESTAMPTZ |

Migration script will:
1. Create new PostgreSQL schema
2. Copy data with type conversions
3. Validate row counts
4. Switch connection config

---

# 13. Data Model Summary

| Table | Purpose | Phase |
|-------|---------|-------|
| `goals` | Goal definitions with optional targets | MVP |
| `activities` | Logged/planned activities | MVP |
| `events` | Immutable audit log | MVP |
| `insights` | AI-generated analyses | Phase 3 |
| `recurrence_rules` | Recurring activity templates | Phase 3 |

The data model creates a **structured behavioral dataset** that supports:
- Activity-based progress tracking
- Consistency metrics computation
- AI pattern detection (Phase 3+)
- Historical analysis
- Personal analytics
