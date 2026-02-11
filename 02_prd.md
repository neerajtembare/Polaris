# Project Polaris — Product Requirements Document (PRD)

## 1. Overview

Polaris is a local-first life management system that connects long-term strategic goals with daily execution and behavioral analysis.

This document defines the functional and non-functional requirements for the MVP and near-term phases.

---

# 2. Functional Requirements

## 2.1 Goal Hierarchy System

### 2.1.1 Time Horizons
The system must support the following structured goal levels:

- Vision (5-year)
- Yearly
- Monthly
- Weekly
- Daily (tasks)

Each goal must:
- Have a title
- Have optional description
- Have a start and end date
- Have a parent (except Vision)
- Track progress percentage
- Track status (planned, active, completed, paused)

---

## 2.2 Task System (Ground Level)

### 2.2.1 Task Types
Tasks must be classified as:

- Growth (contributes to a higher goal)
- Maintenance (daily life / non-growth tasks)

Each task must:
- Have title
- Optional description
- Optional linked goal
- Scheduled date (optional)
- Duration estimate (optional)
- Status (todo, done, skipped)
- AI-generated flag (boolean)

---

## 2.3 Parent-Child Linking

- Tasks may link to any goal level.
- Deleting a parent goal must:
  - Either cascade delete children
  - Or prompt reassignment (decision handled in UX spec)
- Goal progress must roll up from completed child tasks.

---

## 2.4 Daily View ("Today")

The system must provide a Today view that:

- Shows all tasks scheduled for current day
- Allows marking complete or skipped
- Displays breadcrumb of parent goal
- Separates Growth vs Maintenance visually
- Does NOT auto-delete tasks after 24 hours
- Archives history in logs

---

## 2.5 Weekly Planning

The system must allow:

- Creating a weekly plan block
- Assigning tasks to specific days
- Viewing past weeks
- Duplicating last week (manual confirmation only)

---

## 2.6 Dashboard

The dashboard must show:

- Active Vision and Year goals
- Progress % for Monthly goals
- Weekly completion rate
- Growth vs Maintenance distribution
- Active streaks

---

## 2.7 Streak Engine

The system must:

- Calculate streaks for Growth tasks
- Reset streak on missed day (configurable later)
- Persist streak history
- Display streak visually

---

# 3. AI-Assisted Features (Phase 2+)

AI functionality must be optional and never autonomous.

---

## 3.1 Natural Language Goal Entry

User input:
"Add a goal to learn Python by December"

System must:
- Parse goal level
- Assign timeframe
- Create structured goal object
- Require user confirmation before save

---

## 3.2 Goal Decomposition

User action:
Right-click → "AI Breakdown"

System must:
- Send goal context to LLM
- Receive structured JSON sub-goals
- Display editable preview
- Save only upon explicit acceptance

---

## 3.3 Spaced Revision Suggestion

When completing a study task:

System may:
- Suggest a 5–15 minute revision in X days
- Allow user to accept/reject
- Create revision task if accepted

---

## 3.4 Behavioral Analysis

User action:
Click "Analyze Week"

System must:
- Send last 7 days summary to LLM
- Receive structured analysis
- Persist result in Insights table
- Display:
  - Summary
  - Productivity score
  - Behavioral suggestions

---

# 4. Logs & Insights

## 4.1 Logs

The system must:
- Log task completion
- Log skipped tasks
- Log goal state changes
- Timestamp all events

---

## 4.2 Insights

The system must:
- Persist AI outputs
- Store:
  - Raw prompt
  - Raw response
  - Parsed metrics
  - Timestamp
  - Model version

---

# 5. Non-Functional Requirements

## 5.1 Local-First

- Must run entirely on localhost.
- No internet required.
- Ollama runs locally.

---

## 5.2 Performance

- UI must remain responsive during AI calls.
- AI calls must be asynchronous.
- Basic task operations must complete under 200ms locally.

---

## 5.3 Reliability

- If Ollama is unavailable:
  - Show "Brain Offline"
  - Manual features remain usable
- System must not crash on malformed AI output.

---

## 5.4 Data Integrity

- Database migrations must be versioned.
- No destructive schema changes without migration.
- Deleting parent goals must preserve integrity.

---

## 5.5 Extensibility

System must allow future addition of:

- Financial tracking
- PWA support
- Multi-model LLM support
- Optional sync
- Plugin modules

---

# 6. Explicit Non-Requirements (MVP)

- Cloud sync
- Multi-user accounts
- Collaboration
- Social features
- Push notifications when app is closed
- Automatic recurring tasks
- Full financial ledger

---

# 7. Definition of Done (MVP)

Polaris MVP is complete when:

- Goals and tasks can be created, edited, deleted.
- Hierarchy works correctly.
- Progress rolls up correctly.
- Weekly planning works.
- Streaks calculate correctly.
- AI breakdown works with confirmation flow.
- AI weekly analysis persists insights.
- System runs locally without internet.
