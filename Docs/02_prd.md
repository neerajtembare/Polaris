# Project Polaris — Product Requirements Document (PRD)

## 1. Overview

Polaris is a **personal activity tracker with AI coaching potential** that connects long-term goals with daily actions through accumulated progress tracking and behavioral analysis.

This document defines the functional and non-functional requirements for MVP and subsequent phases.

---

## 2. Core Concepts

### 2.1 Goals

A **Goal** represents something the user wants to achieve. Goals are flexible:

| Property | Description |
|----------|-------------|
| Title | What you're trying to achieve |
| Description | Optional context |
| Timeframe | Hint for UI grouping: `long`, `medium`, `short` |
| Target Date | Optional deadline (nullable) |
| Target Value | Optional numeric target (e.g., 10000 for "Save ₹10k") |
| Target Unit | Optional unit (₹, km, pages, hours, books, etc.) |
| Parent Goal | Optional link to a parent goal (flexible hierarchy) |
| Status | `active`, `completed`, `paused`, `archived` |

**Key principle:** Goals can exist at any level of specificity. Users aren't forced into a rigid hierarchy.

**Examples:**
- "Save ₹1,00,000 this year" (long-term, target: 100000, unit: ₹)
- "Read 12 books in 2026" (long-term, target: 12, unit: books)
- "Complete B1 German certification" (medium-term, no numeric target)
- "Finish Atomic Habits this month" (short-term, target: 1, unit: books)

---

### 2.2 Activities

An **Activity** is something the user did (or plans to do) that contributes to a goal.

| Property | Description |
|----------|-------------|
| Title | Description of what was done |
| Activity Type | `quantity`, `duration`, `completion` |
| Value | Numeric value (for quantity/duration types) |
| Unit | Inherited from goal or specified |
| Linked Goal | Which goal this contributes to (optional) |
| Activity Date | When it happened/is planned |
| Category | `growth` (toward goals) or `maintenance` (life admin) |
| Status | `planned`, `completed`, `skipped` |
| Notes | Optional additional context |
| AI Generated | Boolean flag |

**Activity Types:**

| Type | Example | Value | Unit |
|------|---------|-------|------|
| `quantity` | "Read 30 pages" | 30 | pages |
| `duration` | "Studied Python for 2 hours" | 120 | minutes |
| `completion` | "Went for a morning walk" | null | null |

**Key principle:** Not everything is quantifiable. "Did yoga" is valid even without duration.

---

### 2.3 Progress Calculation

Progress is **computed, not manually entered**.

**For goals with numeric targets:**
```
progress_value = SUM(activities.value) WHERE goal_id = goal.id
progress_percentage = (progress_value / target_value) * 100
```

**For goals without numeric targets:**
- Track **consistency metrics**: days active, total hours, week-over-week comparison
- Progress is shown as effort summary, not percentage

---

### 2.4 Consistency Metrics (Computed)

For any goal, the system computes:

| Metric | Description |
|--------|-------------|
| Days Active | Count of days with at least one completed activity |
| Total Duration | Sum of duration-type activities |
| Total Quantity | Sum of quantity-type activities |
| Current Streak | Consecutive days with activity |
| This Week vs Last Week | Comparison of effort |
| Activities Count | Number of logged activities |

These metrics are **deterministic** and calculated on demand.

---

# 3. Functional Requirements

## 3.1 Goal Management

### 3.1.1 CRUD Operations
- [ ] Create goal with title, optional description, optional timeframe hint
- [ ] Set optional target (value + unit)
- [ ] Set optional target date
- [ ] Link to parent goal (optional)
- [ ] Edit goal properties
- [ ] Archive goal (soft delete)
- [ ] Restore archived goal
- [ ] View all goals grouped by timeframe

### 3.1.2 Goal Detail View
- [ ] Display goal title, description, target
- [ ] Show progress (percentage or consistency metrics)
- [ ] List all contributing activities (chronological)
- [ ] Show sub-goals (if any)
- [ ] Display consistency metrics

### 3.1.3 Goal Hierarchy
- [ ] Goals can have optional parent_id
- [ ] Sub-goals displayed nested under parent
- [ ] No rigid level enforcement
- [ ] Deleting parent does NOT auto-delete children (orphan handling)

---

## 3.2 Activity Management

### 3.2.1 CRUD Operations
- [ ] Create activity with title
- [ ] Select activity type (quantity, duration, completion)
- [ ] Enter value if applicable
- [ ] Link to goal (optional)
- [ ] Set activity date (defaults to today)
- [ ] Set category (growth/maintenance)
- [ ] Set status (planned, completed, skipped)
- [ ] Edit activity
- [ ] Delete activity (soft delete)

### 3.2.2 Quick Entry (MVP Foundation for AI)
- [ ] Text input field for activity title
- [ ] System stores raw input for future AI parsing
- [ ] Manual selection of goal, type, value (Phase 1)
- [ ] AI-assisted parsing (Phase 3)

### 3.2.3 Activity Categorization
- [ ] Growth: contributes to a goal
- [ ] Maintenance: life admin, doesn't contribute to tracked goals
- [ ] Visual distinction in UI

---

## 3.3 Today View (Daily Execution)

### 3.3.1 Layout
- [ ] Show activities for current date
- [ ] Separate sections: Planned (to-do) vs Logged (done)
- [ ] Separate Growth vs Maintenance visually
- [ ] Show breadcrumb for linked goal

### 3.3.2 Interactions
- [ ] Quick-add activity
- [ ] Mark activity complete
- [ ] Mark activity skipped
- [ ] Edit activity inline
- [ ] View goal context (click breadcrumb)

### 3.3.3 Behavior
- [ ] Activities do NOT auto-delete at midnight
- [ ] Planned but incomplete activities remain visible
- [ ] History preserved in activity log

---

## 3.4 Goals View (Strategic Overview)

### 3.4.1 Layout
- [ ] Grouped by timeframe: Long-term / Medium-term / Short-term
- [ ] Each goal shows: title, progress indicator, target date
- [ ] Expandable to show sub-goals

### 3.4.2 Interactions
- [ ] Click goal → Goal Detail View
- [ ] Right-click → Edit / Archive / AI Breakdown (Phase 3)
- [ ] Drag to reorder within group (nice-to-have)

---

## 3.5 Dashboard View

### 3.5.1 Content
- [ ] Active goals summary (top 3-5)
- [ ] This week's progress (activities completed)
- [ ] Growth vs Maintenance ratio
- [ ] Streak indicator (if applicable)
- [ ] Consistency metrics summary

### 3.5.2 Behavior
- [ ] Default landing page after login
- [ ] Refreshes on each visit
- [ ] No auto-analysis (AI features are manual-trigger)

---

## 3.6 Planner View (Weekly Planning) — Phase 2

### 3.6.1 Layout
- [ ] Week selector
- [ ] Day columns (Mon-Sun)
- [ ] Activities shown per day

### 3.6.2 Interactions
- [ ] Drag activities between days
- [ ] Add activities to specific days
- [ ] View past weeks (read-only)
- [ ] Duplicate last week's plan (manual confirmation)

---

## 3.7 Event Logging (Background)

### 3.7.1 Automatic Logging
- [ ] Log activity creation
- [ ] Log activity completion
- [ ] Log activity skip
- [ ] Log goal creation/update/archive
- [ ] Include timestamp and state snapshot

### 3.7.2 Purpose
- Serves as dataset for AI behavioral analysis (Phase 3+)
- Enables undo/history features (future)
- Preserves audit trail

---

# 4. AI-Assisted Features (Phase 3+)

AI functionality is **optional, manual-trigger, and confirmation-required**.

## 4.1 Natural Language Activity Entry

**User input:** "I saved ₹500 by skipping lunch"

**System behavior:**
1. Parse intent with AI
2. Suggest: Activity "Saved ₹500", type: quantity, value: 500, unit: ₹, goal: "Save money"
3. Display preview for user confirmation
4. Save only after explicit acceptance

---

## 4.2 Goal Decomposition

**User action:** Right-click goal → "AI Breakdown"

**System behavior:**
1. Send goal context to AI
2. Receive suggested sub-goals and activities
3. Display editable preview
4. User accepts/edits/rejects each suggestion
5. Save only accepted items

---

## 4.3 Morning Planning

**User action:** Click "Plan My Day"

**System behavior:**
1. AI receives: recent activities, active goals, patterns
2. AI suggests: activities for today
3. User reviews, accepts/rejects each
4. Accepted activities added as "planned"

---

## 4.4 Pattern Detection

**System behavior (Phase 4+):**
1. AI detects recurring patterns ("You do yoga every Sunday")
2. Prompts user: "Want to make this recurring?"
3. If accepted, creates recurrence rule
4. Future instances auto-created but user can skip/modify

---

## 4.5 Weekly Analysis

**User action:** Click "Analyze Week"

**System behavior:**
1. Summarize last 7 days' activities
2. Send to AI for analysis
3. Receive structured insights
4. Display:
   - Summary paragraph
   - Consistency score
   - Strengths / Weaknesses
   - Recommendations
5. Persist insight for future reference

---

# 5. Recurrence System (Phase 3+)

## 5.1 Recurrence Rules

| Property | Description |
|----------|-------------|
| ID | Unique identifier |
| Activity Template | Title, type, value, goal link |
| Frequency | daily, weekly, custom |
| Days | Specific days (e.g., Mon/Wed/Fri) |
| Active | Boolean |
| Source | `manual` or `ai_suggested` |

## 5.2 Behavior

- Recurrence rules generate planned activities
- User must complete/skip each instance
- Missing an instance does NOT break anything — it's just data
- AI can suggest recurrence based on detected patterns (Phase 4)

---

# 6. Non-Functional Requirements

## 6.1 Local-First Architecture

- [ ] All data stored in local SQLite database
- [ ] Core functionality works without internet
- [ ] AI adapter supports both local (Ollama) and cloud providers
- [ ] No mandatory cloud dependency in MVP

## 6.2 Performance

- [ ] UI remains responsive during AI calls
- [ ] AI calls are asynchronous with loading indicators
- [ ] Basic CRUD operations complete under 200ms
- [ ] Page loads under 1 second

## 6.3 Reliability

- [ ] System functions fully when AI is unavailable
- [ ] Invalid AI responses handled gracefully (no crashes)
- [ ] Database operations are transactional
- [ ] No data loss on unexpected shutdown

## 6.4 Data Integrity

- [ ] All schema changes via migrations
- [ ] Soft delete preserves history
- [ ] Foreign key constraints enforced
- [ ] Timestamps in UTC

## 6.5 PWA Readiness (Phase 2+)

- [ ] Responsive design from day 1
- [ ] Service worker hooks prepared
- [ ] Offline-first data layer
- [ ] Manifest file ready

## 6.6 AI Provider Flexibility

- [ ] AI adapter is provider-agnostic
- [ ] Supports configuration swap (Ollama ↔ OpenAI ↔ Claude)
- [ ] Provider selection in settings

---

# 7. Explicit Non-Requirements (MVP)

| Feature | Status | Rationale |
|---------|--------|-----------|
| AI features | Phase 3 | Build solid manual foundation first |
| Recurrence engine | Phase 3 | Wait for AI pattern detection |
| Weekly planner view | Phase 2 | Today view is sufficient for MVP |
| Push notifications | Never (browser) | PWA limitation |
| Team collaboration | Never (scope) | Solo-first product |
| Financial ledger | Never (scope) | Inspired by budget tracking, not a finance app |
| Cloud sync | Phase 5+ | Local-first must be stable first |
| Mobile app | Phase 5+ | PWA first, native later if needed |

---

# 8. Definition of Done (MVP — Phase 1)

Polaris MVP is complete when:

- [ ] Goals can be created, edited, archived, restored
- [ ] Goals support optional numeric targets
- [ ] Goals support optional parent linking
- [ ] Activities can be logged with flexible types
- [ ] Activities update goal progress automatically
- [ ] Today view shows planned and completed activities
- [ ] Goals view shows all goals grouped by timeframe
- [ ] Goal detail view shows contributing activities
- [ ] Dashboard shows basic progress summary
- [ ] Event log captures all mutations
- [ ] System runs locally without internet
- [ ] Architecture supports future AI integration

---

# 9. Definition of Done (Phase 2)

- [ ] Weekly planner view functional
- [ ] Consistency metrics computed and displayed
- [ ] Streak calculation working
- [ ] Historical view (past weeks)
- [ ] Archive view for soft-deleted items
- [ ] PWA manifest and service worker basics

---

# 10. Definition of Done (Phase 3)

- [ ] AI adapter integrated (OpenAI/Claude or Ollama)
- [ ] Natural language activity parsing works
- [ ] Goal decomposition works with confirmation flow
- [ ] Weekly analysis generates and persists insights
- [ ] AI errors handled gracefully ("Brain Offline" mode)
- [ ] Manual system unaffected by AI failures
