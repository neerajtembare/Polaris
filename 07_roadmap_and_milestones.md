# Project Polaris — Roadmap & Milestones

## 1. Roadmap Philosophy

Polaris is built **milestone-first, not time-first**.

| Principle | Description |
|-----------|-------------|
| Quality over speed | Each milestone must be stable before moving on |
| Small deliverables | Each milestone achievable in 1-2 weeks |
| Working software | Each milestone produces usable functionality |
| AI-ready foundations | Phase 1-2 builds data structures that enable Phase 3 AI |
| No premature features | Defer complexity until core is solid |

**Rule:** No milestone is complete unless:
- It is usable
- It is stable (no crashes)
- It doesn't require workarounds
- Tests pass
- Documentation updated

---

# 2. Phase Overview

```
PHASE 0: Foundation (2 weeks)
    └── Environment, scaffold, database setup

PHASE 1: Manual Core (4-6 weeks)
    ├── 1.1: Goal System
    ├── 1.2: Activity System  
    ├── 1.3: Today View
    └── 1.4: Dashboard

PHASE 2: Data & Polish (3-4 weeks)
    ├── 2.1: Consistency Metrics
    ├── 2.2: Planner View
    └── 2.3: PWA Foundations

PHASE 3: AI Integration (4-6 weeks)
    ├── 3.1: AI Adapter
    ├── 3.2: Activity Parsing
    ├── 3.3: Goal Breakdown
    └── 3.4: Weekly Analysis

PHASE 4: Hardening (2-3 weeks)
    └── Testing, performance, stability

PHASE 5: Future Expansion
    └── Pattern detection, mobile PWA, etc.
```

---

# 3. Phase 0 — Foundation

**Duration:** ~2 weeks  
**Goal:** Clean development environment ready for feature work

## Deliverables

### 0.1 Project Setup
- [ ] Backend: Node.js + TypeScript + Fastify scaffold
- [ ] Frontend: React + TypeScript + Vite scaffold
- [ ] Monorepo structure (or separate repos)
- [ ] ESLint + Prettier configuration
- [ ] Git repository initialized

### 0.2 Database Setup
- [ ] SQLite integration with Prisma
- [ ] Prisma schema defined
- [ ] Initial migration applied (goals, activities, events)
- [ ] Prisma Client generated
- [ ] Foreign keys enabled

### 0.3 Backend Foundation
- [ ] Layered folder structure (routes/controllers/services)
- [ ] Prisma client module (`lib/prisma.ts`)
- [ ] Health check endpoint: `GET /api/health`
- [ ] Error handling middleware
- [ ] Logger utility (console for MVP)
- [ ] Request validation setup (Zod)

### 0.4 Frontend Foundation
- [ ] Basic layout with sidebar navigation
- [ ] Router setup (React Router)
- [ ] API client (fetch wrapper)
- [ ] TanStack Query setup
- [ ] Tailwind CSS configured

## Acceptance Criteria

- [ ] `npm run dev` starts both backend and frontend
- [ ] API returns `{ status: "healthy" }` on health check
- [ ] Database file created with tables
- [ ] No console errors on boot
- [ ] Basic navigation works

## Exit Condition

Environment stable. Ready to build features.

---

# 4. Phase 1 — Manual Core MVP

**Duration:** ~4-6 weeks  
**Goal:** Fully functional manual system (no AI)

---

## Milestone 1.1: Goal System

**Duration:** ~1-2 weeks

### Backend
- [ ] Goal model with all fields (title, description, timeframe, target_value, target_unit, target_date, parent_id, status)
- [ ] Goal repository (CRUD operations)
- [ ] Goal service (validation, soft delete logic)
- [ ] Goal controller
- [ ] Routes:
  - `GET /api/goals`
  - `GET /api/goals/:id`
  - `POST /api/goals`
  - `PUT /api/goals/:id`
  - `DELETE /api/goals/:id` (soft delete)

### Frontend
- [ ] Goals page with list view
- [ ] Create goal modal/form
- [ ] Edit goal modal/form
- [ ] Delete with confirmation
- [ ] Filter by timeframe tabs

### Acceptance Criteria
- [ ] Create goal with all field types
- [ ] Edit existing goal
- [ ] Delete goal (soft delete)
- [ ] View goals grouped by timeframe
- [ ] Parent-child relationship works

---

## Milestone 1.2: Activity System

**Duration:** ~1-2 weeks

### Backend
- [ ] Activity model with all fields
- [ ] Activity repository
- [ ] Activity service (validation, goal linking, event logging)
- [ ] Progress service (calculate goal progress from activities)
- [ ] Activity controller
- [ ] Routes:
  - `GET /api/activities`
  - `GET /api/activities/today`
  - `GET /api/activities/:id`
  - `POST /api/activities`
  - `PUT /api/activities/:id`
  - `DELETE /api/activities/:id`
  - `POST /api/activities/:id/complete`
  - `POST /api/activities/:id/skip`
  - `GET /api/goals/:id/activities`

### Frontend
- [ ] Activity card component
- [ ] Create activity form (all types: quantity, duration, completion)
- [ ] Edit activity
- [ ] Mark complete / skip
- [ ] Goal breadcrumb on activity

### Acceptance Criteria
- [ ] Log activity with numeric value
- [ ] Log activity with duration
- [ ] Log completion-only activity
- [ ] Link activity to goal
- [ ] Complete/skip activity updates status
- [ ] Goal progress updates when activity completed

---

## Milestone 1.3: Today View

**Duration:** ~1 week

### Backend
- [ ] `GET /api/activities/today` returns today's activities
- [ ] Event logging on activity mutations

### Frontend
- [ ] Today page layout
- [ ] Quick-add activity input (manual form)
- [ ] Sections: Planned, Completed, Maintenance
- [ ] Activity cards with actions
- [ ] Real-time updates (TanStack Query invalidation)

### Acceptance Criteria
- [ ] View today's activities
- [ ] Quick-add activity
- [ ] Mark activity complete → progress updates
- [ ] Mark activity skipped
- [ ] Completed activities move to Completed section
- [ ] Growth/Maintenance visually separated

---

## Milestone 1.4: Dashboard & Goal Detail

**Duration:** ~1 week

### Backend
- [ ] `GET /api/dashboard/summary` endpoint
- [ ] `GET /api/goals/:id/metrics` endpoint (basic metrics)

### Frontend
- [ ] Dashboard page with summary cards
- [ ] Active goals list with progress
- [ ] Week summary (activities completed)
- [ ] Goal Detail page
  - Progress display
  - Sub-goals list
  - Activities list

### Acceptance Criteria
- [ ] Dashboard shows active goals with progress
- [ ] Dashboard shows this week's activity count
- [ ] Click goal → navigates to detail
- [ ] Goal detail shows all contributing activities
- [ ] Goal detail shows sub-goals

---

## Phase 1 Exit Criteria

**The system is usable daily as a manual goal + activity tracker:**

- [ ] Create and manage goals (with targets)
- [ ] Log activities (quantity, duration, completion)
- [ ] See progress accumulate on goals
- [ ] Today view shows daily activities
- [ ] Dashboard shows strategic overview
- [ ] Event log captures all mutations
- [ ] No AI features yet
- [ ] Runs locally without internet

---

# 5. Phase 2 — Data & Polish

**Duration:** ~3-4 weeks  
**Goal:** Richer metrics, planner view, PWA foundations

---

## Milestone 2.1: Consistency Metrics

**Duration:** ~1 week

### Backend
- [ ] Metrics service:
  - Days active
  - Current streak calculation
  - This week vs last week
  - Total duration sum
- [ ] `GET /api/goals/:id/metrics` enhanced

### Frontend
- [ ] Consistency metrics display on Goal Detail
- [ ] Streak display on Today View header
- [ ] Week-over-week comparison

### Acceptance Criteria
- [ ] Streak calculates correctly
- [ ] Days active count accurate
- [ ] Week comparison shows % change

---

## Milestone 2.2: Planner View

**Duration:** ~1-2 weeks

### Backend
- [ ] `GET /api/activities` with date range filter
- [ ] `PUT /api/activities/:id` supports date change

### Frontend
- [ ] Planner page with week view
- [ ] Day columns showing activities
- [ ] Drag-drop activities between days (nice-to-have)
- [ ] Add activity to specific day
- [ ] Navigate between weeks
- [ ] "Duplicate last week" button

### Acceptance Criteria
- [ ] View activities by week
- [ ] Add activity to future day
- [ ] Move activity to different day
- [ ] View past weeks (read-only feel)
- [ ] Duplicate last week with confirmation

---

## Milestone 2.3: PWA Foundations & Polish

**Duration:** ~1 week

### PWA Setup
- [ ] Manifest.json with app metadata
- [ ] Service worker registration (basic)
- [ ] Offline detection (show banner when offline)

### Polish
- [ ] Loading states (skeletons)
- [ ] Error states (toasts)
- [ ] Empty states (helpful messages)
- [ ] Archive view (view soft-deleted items)
- [ ] Restore from archive

### Acceptance Criteria
- [ ] App installable as PWA (basic)
- [ ] Shows offline indicator when disconnected
- [ ] All views have loading/empty/error states
- [ ] Can view and restore archived items

---

## Phase 2 Exit Criteria

- [ ] Consistency metrics calculated and displayed
- [ ] Streak tracking works
- [ ] Planner view functional
- [ ] PWA installable (basic)
- [ ] UI polish complete
- [ ] Ready for AI integration

---

# 6. Phase 3 — AI Integration

**Duration:** ~4-6 weeks  
**Goal:** Add AI features with graceful degradation

---

## Milestone 3.1: AI Adapter Foundation

**Duration:** ~1 week

### Backend
- [ ] AI adapter interface defined
- [ ] OpenAI adapter implementation
- [ ] Mock adapter for testing
- [ ] AI configuration (provider selection, model, timeouts)
- [ ] Prompt registry with versioned prompts
- [ ] Schema validation for AI responses
- [ ] Error handling (AI unavailable, parse errors)
- [ ] `GET /api/ai/status` endpoint

### Frontend
- [ ] "AI Status" indicator (online/offline)
- [ ] Loading state for AI operations

### Acceptance Criteria
- [ ] AI adapter connects to OpenAI
- [ ] Mock adapter works for tests
- [ ] Invalid responses handled gracefully
- [ ] "Brain Offline" state displays correctly

---

## Milestone 3.2: Activity Parsing

**Duration:** ~1-2 weeks

### Backend
- [ ] `POST /api/ai/parse-activity` endpoint
- [ ] Activity parsing prompt in registry
- [ ] Response schema validation
- [ ] Caching for identical inputs

### Frontend
- [ ] AI-assisted quick-add flow
- [ ] Form auto-fills from AI suggestion
- [ ] User can edit before saving
- [ ] "AI Suggestion" indicator

### Acceptance Criteria
- [ ] Type "saved ₹500" → AI parses correctly
- [ ] Goal suggestion based on context
- [ ] User can override AI suggestions
- [ ] Works gracefully when AI offline

---

## Milestone 3.3: Goal Breakdown

**Duration:** ~1-2 weeks

### Backend
- [ ] `POST /api/ai/breakdown` endpoint
- [ ] Goal breakdown prompt in registry
- [ ] Returns suggested sub-goals and activities

### Frontend
- [ ] "AI Breakdown" button on goal
- [ ] Modal showing suggestions
- [ ] Checkboxes to accept/reject each
- [ ] Edit suggestions before accepting

### Acceptance Criteria
- [ ] AI generates relevant sub-goals
- [ ] User can accept/reject each suggestion
- [ ] Accepted items saved correctly
- [ ] Works gracefully when AI offline

---

## Milestone 3.4: Weekly Analysis

**Duration:** ~1 week

### Backend
- [ ] `POST /api/ai/analyze-week` endpoint
- [ ] Insights table created
- [ ] Analysis prompt in registry
- [ ] Context summarization (not raw data)
- [ ] Insight persistence

### Frontend
- [ ] "Analyze Week" button on dashboard
- [ ] Analysis display modal/panel
- [ ] Insights page listing past analyses

### Acceptance Criteria
- [ ] Weekly analysis generates insight
- [ ] Insight persisted with metadata
- [ ] Past insights viewable in Insights page
- [ ] Works gracefully when AI offline

---

## Phase 3 Exit Criteria

- [ ] AI adapter works with provider switching
- [ ] Activity parsing functional
- [ ] Goal breakdown functional
- [ ] Weekly analysis functional
- [ ] All AI features have confirmation flow
- [ ] System works fully when AI offline

---

# 7. Phase 4 — Hardening

**Duration:** ~2-3 weeks  
**Goal:** Production-ready stability

## Deliverables

### Testing
- [ ] Unit tests for services (progress, metrics, AI)
- [ ] Integration tests for API endpoints
- [ ] E2E tests for critical flows (Today view, goal creation)

### Performance
- [ ] Database query optimization
- [ ] Index validation
- [ ] API response time profiling
- [ ] Frontend bundle size check

### Reliability
- [ ] Error logging improvement
- [ ] Database backup strategy
- [ ] Data export feature (JSON)

### Documentation
- [ ] README updated
- [ ] API documentation
- [ ] Local setup guide

## Acceptance Criteria

- [ ] All tests pass
- [ ] No blocking bugs
- [ ] App stable for daily use
- [ ] Data export works
- [ ] Documentation complete

---

# 8. Phase 5 — Future Expansion

**Not MVP. Potential future features.**

| Feature | Description |
|---------|-------------|
| Morning Planning | AI suggests day's activities |
| Pattern Detection | AI detects recurring behaviors |
| Smart Recurrence | Auto-suggest recurrence rules |
| Ollama Support | Local LLM provider |
| Mobile PWA | Full mobile experience |
| Cloud Sync | Optional multi-device sync |
| Trend Charts | Visual analytics |
| PostgreSQL | Scale to larger datasets |

---

# 9. AI Readiness Checkpoints

At the end of each phase, verify AI foundations:

| Phase | Checkpoint |
|-------|------------|
| Phase 1 | Event logging captures all mutations |
| Phase 1 | Activities store raw_input field |
| Phase 1 | Goals have clear targets and units |
| Phase 2 | Metrics service works (AI uses same data) |
| Phase 2 | API supports preview-confirm pattern |
| Phase 3 | AI adapter is provider-agnostic |
| Phase 3 | Prompts are versioned and registered |

---

# 10. Milestone Tracking Template

For each milestone, track:

```markdown
## Milestone X.Y: [Name]

**Status:** Not Started | In Progress | Complete
**Started:** [Date]
**Completed:** [Date]

### Deliverables
- [ ] Item 1
- [ ] Item 2

### Blockers
- None

### Notes
- 
```

---

# 11. Risk Checkpoints

At the end of each phase, ask:

| Question | If Yes... |
|----------|-----------|
| Is the system overcomplicated? | Simplify before proceeding |
| Are we adding features prematurely? | Defer to later phase |
| Is the code clean and modular? | Refactor before proceeding |
| Is documentation up to date? | Update before proceeding |
| Does the system work offline? | Fix before proceeding |

---

# 12. Core Discipline Rule

**No new feature before:**

- [ ] Current milestone is stable
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Data model changes migrated
- [ ] No known critical bugs

**Polaris evolves through discipline, not feature accumulation.**

---

# 13. Definition of Done (Personal v1.0)

Polaris v1.0 is complete when:

- [ ] Used daily for 30 consecutive days
- [ ] No major bug interrupts workflow
- [ ] AI features work reliably
- [ ] System stable under data growth
- [ ] Can be paused and resumed without data loss
- [ ] Provides genuine insight into personal progress

---

# 14. Time Estimates Summary

| Phase | Estimated Duration |
|-------|-------------------|
| Phase 0: Foundation | 2 weeks |
| Phase 1: Manual Core | 4-6 weeks |
| Phase 2: Data & Polish | 3-4 weeks |
| Phase 3: AI Integration | 4-6 weeks |
| Phase 4: Hardening | 2-3 weeks |
| **Total to v1.0** | **15-21 weeks** |

*Estimates assume part-time solo development. Adjust based on availability.*
