# Project Polaris — UX & Behavioral Interaction Design

## 1. UX Philosophy

Polaris must feel:

| Quality | Expression |
|---------|------------|
| **Structured** | Clear hierarchy, predictable navigation |
| **Calm** | No anxiety-inducing red warnings |
| **Intentional** | Every element has purpose |
| **Empowering** | Progress visible, patterns discoverable |
| **Fast** | Logging an activity takes < 10 seconds |

Not:
- Gamified chaos (no badges, points, levels)
- Chatbot-first (AI is a tool, not the interface)
- Notification-heavy (no push notifications in MVP)
- Overstimulating (no animations for animation's sake)

**AI should feel like a helpful consultant, not a co-pilot taking control.**

---

# 2. Layout Structure

## 2.1 Core Layout

```
┌─────────────────────────────────────────────────────────┐
│  POLARIS                               [Settings] [?]   │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│   Sidebar    │            Main Content                  │
│              │                                          │
│   Dashboard  │  ┌────────────────────────────────────┐  │
│   Today      │  │                                    │  │
│   Goals      │  │   (Dynamic view based on nav)      │  │
│   Planner*   │  │                                    │  │
│   Insights*  │  │                                    │  │
│              │  │                                    │  │
│              │  └────────────────────────────────────┘  │
│              │                                          │
└──────────────┴──────────────────────────────────────────┘

* Phase 2+ features
```

## 2.2 Navigation

| Item | Always Visible | Phase |
|------|----------------|-------|
| Dashboard | Yes | MVP |
| Today | Yes | MVP |
| Goals | Yes | MVP |
| Planner | Yes | Phase 2 |
| Insights | Yes | Phase 3 |
| Settings | Yes | MVP |

**Default landing page:** Today View

---

# 3. Primary Screens

## 3.1 Today View (Execution Center)

**Purpose:** Daily action and logging hub

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  TODAY — Thursday, February 12, 2026                    │
│  Growth Streak: 5 days                                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [+ Quick Add Activity................................] │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  PLANNED (3)                                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ○ Study Python — 1 hour                         │   │
│  │   → Learn Python                              ✓ ✗│   │
│  ├─────────────────────────────────────────────────┤   │
│  │ ○ Morning walk                                  │   │
│  │   → Get Fit                                   ✓ ✗│   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  COMPLETED (5)                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ✓ Saved ₹500 (skipped lunch)                    │   │
│  │   → Save ₹1L    [+₹500]                     edit│   │
│  ├─────────────────────────────────────────────────┤   │
│  │ ✓ Read 20 pages — Atomic Habits                 │   │
│  │   → Finish Atomic Habits    [+20 pages]     edit│   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  MAINTENANCE (2)                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ✓ Grocery shopping                              │   │
│  │ ○ Pay electricity bill                        ✓ ✗│   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [AI: Plan My Day] (Phase 3)                           │
└─────────────────────────────────────────────────────────┘
```

### Interactions

| Action | Behavior |
|--------|----------|
| Quick Add | Text input → form expansion (or AI parse in Phase 3) |
| Click ✓ | Mark complete → update progress → log event |
| Click ✗ | Mark skipped → log event |
| Click activity | Expand for edit/details |
| Click goal breadcrumb | Navigate to goal detail |

### Activity Card Details

Each activity shows:
- Status indicator (○ planned, ✓ done, ✗ skipped)
- Title
- Value + unit (if applicable): "+₹500", "+20 pages", "1 hour"
- Goal breadcrumb (if linked)
- Quick actions: complete, skip, edit

### Behavior Rules

- Activities do **NOT** auto-delete at midnight
- Incomplete planned activities remain visible next day
- Show subtle indicator for overdue planned items
- Separate Growth from Maintenance visually

---

## 3.2 Dashboard View (Strategic Overview)

**Purpose:** High-level progress visibility

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  DASHBOARD                                              │
├─────────────────────────────────────────────────────────┤
│  THIS WEEK                                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Activities: 24 completed, 4 skipped            │   │
│  │  Growth: 18  |  Maintenance: 6                  │   │
│  │  Streak: 5 days                                 │   │
│  │  [Analyze Week] (Phase 3)                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ACTIVE GOALS                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Save ₹1,00,000 this year                       │   │
│  │  ████████░░░░░░░░░░░░  ₹15,000 / ₹1,00,000     │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  Learn Python                                   │   │
│  │  18 hours logged  •  12 days active             │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  Finish Atomic Habits                           │   │
│  │  ████████████░░░░░░░░  120 / 256 pages          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  RECENT INSIGHT (Phase 3)                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │  "Strong week with consistent Python study..."   │   │
│  │  Consistency Score: 82                          │   │
│  │  [View Full Insight]                            │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Goal Progress Display

| Goal Type | Progress Display |
|-----------|------------------|
| Numeric target | Progress bar + "current / target" |
| Duration-based | "X hours logged • Y days active" |
| Effort-based | "X activities • Y days active" |

### Interactions

- Click goal card → Navigate to Goal Detail
- "Analyze Week" button (Phase 3) → Trigger AI analysis
- "View Full Insight" → Navigate to Insights view

---

## 3.3 Goals View (Goal Browser)

**Purpose:** Browse and manage all goals

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  GOALS                                   [+ New Goal]   │
├─────────────────────────────────────────────────────────┤
│  [Long-term] [Medium-term] [Short-term] [Archived]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  LONG-TERM GOALS (3)                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ▶ Save ₹1,00,000 this year               15%    │   │
│  │   ├─ Save ₹20,000 by March               75%    │   │
│  │   └─ Emergency fund ₹30,000              10%    │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ ▶ Learn Python                      18h logged  │   │
│  │   └─ Complete Python basics course       40%    │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ ▶ Get Fit                           8 days active│   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  MEDIUM-TERM GOALS (2)                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │   Finish Atomic Habits    120/256 pages    47%  │   │
│  │   Complete tax filing     Due: Mar 31       ○   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Interactions

| Action | Result |
|--------|--------|
| Click goal | Navigate to Goal Detail View |
| Click ▶ | Expand/collapse children |
| Right-click | Context menu: Edit, Archive, AI Breakdown (Phase 3) |
| Drag goal | Reorder within group (nice-to-have) |
| Filter tabs | Show goals by timeframe |

---

## 3.4 Goal Detail View

**Purpose:** Deep dive into a single goal

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  ← Goals                              [Edit] [Archive]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  SAVE ₹1,00,000 THIS YEAR                              │
│  Long-term • Target: Dec 31, 2026                       │
│                                                         │
│  ████████░░░░░░░░░░░░  ₹15,000 / ₹1,00,000  (15%)      │
│                                                         │
│  [AI Breakdown] (Phase 3)                               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  CONSISTENCY                                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Days Active: 12                                │   │
│  │  Current Streak: 3 days                         │   │
│  │  This Week: ₹2,500  |  Last Week: ₹1,800 (+39%)│   │
│  │  Activities: 18 total                           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  SUB-GOALS (2)                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Save ₹20,000 by March                    75%   │   │
│  │  Emergency fund ₹30,000                   10%   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  RECENT ACTIVITIES                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Feb 12: Saved ₹500 (skipped lunch)             │   │
│  │  Feb 10: Saved ₹1,000 (freelance payment)       │   │
│  │  Feb 8: Saved ₹2,000 (sold old phone)           │   │
│  │  Feb 5: Saved ₹500 (brought lunch from home)    │   │
│  │  [Show All 18 Activities]                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Displays

- Progress (numeric or consistency metrics)
- Sub-goals (if any)
- All contributing activities (chronological)
- Consistency metrics

### Interactions

- Edit goal → Modal with goal form
- Archive → Soft delete with confirmation
- AI Breakdown (Phase 3) → Generate sub-goals/activities
- Click activity → Expand/edit
- Click sub-goal → Navigate to its detail

---

## 3.5 Planner View (Phase 2)

**Purpose:** Weekly planning and review

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  PLANNER          [< Week of Feb 10-16, 2026 >]        │
├─────────────────────────────────────────────────────────┤
│  MON    TUE    WED    THU    FRI    SAT    SUN         │
│ ─────  ─────  ─────  ─────  ─────  ─────  ─────        │
│ ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐       │
│ │✓3 │  │✓4 │  │✓2 │  │○2 │  │   │  │   │  │   │       │
│ │✗1 │  │   │  │✗1 │  │   │  │   │  │   │  │   │       │
│ └───┘  └───┘  └───┘  └───┘  └───┘  └───┘  └───┘       │
│                                                         │
│  TODAY: Thursday, Feb 12                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ○ Study Python — 1 hour                        │   │
│  │  ○ Morning walk                                 │   │
│  │  [+ Add Activity]                               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Duplicate Last Week]                                  │
└─────────────────────────────────────────────────────────┘
```

### Interactions

- Click day → View/edit that day's activities
- Drag activity between days → Reschedule
- "Duplicate Last Week" → Copy planned activities (with confirmation)
- Navigate weeks → View history

---

## 3.6 Insights View (Phase 3)

**Purpose:** AI-generated behavioral analyses

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  INSIGHTS                                               │
├─────────────────────────────────────────────────────────┤
│  LATEST ANALYSIS                                        │
│  Week of Feb 3-9, 2026                 Score: 82       │
│  ┌─────────────────────────────────────────────────┐   │
│  │  "Strong week with 24 completed activities,     │   │
│  │   up 20% from last week..."                     │   │
│  │                                                 │   │
│  │  Strengths:                                     │   │
│  │  • Consistent Python study (5 days)             │   │
│  │  • Maintained 5-day growth streak               │   │
│  │                                                 │   │
│  │  Areas for Improvement:                         │   │
│  │  • 4 skipped activities, mostly on Wednesday    │   │
│  │                                                 │   │
│  │  Recommendations:                               │   │
│  │  • Consider lighter Wednesday schedule          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  HISTORY                                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Jan 27 - Feb 2     Score: 68    [View]         │   │
│  │  Jan 20 - Jan 26    Score: 75    [View]         │   │
│  │  Jan 13 - Jan 19    Score: 71    [View]         │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

# 4. Activity Input Flow

## 4.1 Quick Add (MVP)

```
User types → Form expands → Manual selection → Save

┌─────────────────────────────────────────────────────────┐
│  [+ Quick Add: "Saved ₹500 today"                    ] │
├─────────────────────────────────────────────────────────┤
│  Title: Saved ₹500 today                               │
│  Type:  [Quantity ▼]         Value: [500] Unit: [₹ ▼]  │
│  Goal:  [Save ₹1L this year ▼]                         │
│  Category: [● Growth  ○ Maintenance]                   │
│                                          [Cancel] [Save]│
└─────────────────────────────────────────────────────────┘
```

## 4.2 AI-Assisted (Phase 3)

```
User types → AI parses (async) → Form auto-fills → User confirms

┌─────────────────────────────────────────────────────────┐
│  [+ "Saved ₹500 by skipping lunch"                   ] │
├─────────────────────────────────────────────────────────┤
│  ✨ AI Suggestion                                       │
│  Title: Saved ₹500 by skipping lunch                   │
│  Type:  Quantity   Value: 500   Unit: ₹               │
│  Goal:  Save ₹1L this year  (confidence: 95%)         │
│  Category: Growth                                       │
│                                          [Cancel] [Save]│
└─────────────────────────────────────────────────────────┘
```

AI fills the form; user can edit any field before saving.

---

# 5. Forms & Modals

## 5.1 Create/Edit Goal Modal

```
┌─────────────────────────────────────────────────────────┐
│  CREATE GOAL                                     [×]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Title *                                                │
│  [Save ₹1,00,000 this year                          ]  │
│                                                         │
│  Description                                            │
│  [Build emergency fund and investment corpus       ]   │
│                                                         │
│  Timeframe                                              │
│  [● Long-term  ○ Medium-term  ○ Short-term]            │
│                                                         │
│  Target (optional)                                      │
│  [100000    ] [₹           ▼]  By: [Dec 31, 2026   ]  │
│                                                         │
│  Parent Goal (optional)                                 │
│  [None                                            ▼]   │
│                                                         │
│                                 [Cancel] [Create Goal]  │
└─────────────────────────────────────────────────────────┘
```

## 5.2 AI Breakdown Modal (Phase 3)

```
┌─────────────────────────────────────────────────────────┐
│  AI BREAKDOWN: Learn Python                      [×]    │
├─────────────────────────────────────────────────────────┤
│  ✨ Strategic layer suggests:                           │
│                                                         │
│  SUGGESTED SUB-GOALS                                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [✓] Complete Python basics course              │   │
│  │      Medium-term • By Apr 30, 2026              │   │
│  │      [Edit]                                     │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  [✓] Build 3 data analysis projects             │   │
│  │      Target: 3 projects • By Dec 2026           │   │
│  │      [Edit]                                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  SUGGESTED ACTIVITIES                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [✓] Study Python basics — 1 hour daily         │   │
│  │      [Edit]                                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Uncheck items you don't want to add.                   │
│                                 [Cancel] [Add Selected] │
└─────────────────────────────────────────────────────────┘
```

---

# 6. Visual Design Principles

## 6.1 Growth vs Maintenance

| Type | Visual Treatment |
|------|------------------|
| Growth | Accent color (blue/teal), contributes to streak |
| Maintenance | Neutral gray, no strategic weight |

## 6.2 Status Indicators

| Status | Symbol | Color |
|--------|--------|-------|
| Planned | ○ | Default text |
| Completed | ✓ | Green |
| Skipped | ✗ | Gray (not red — no shame) |

## 6.3 Progress Representation

| Goal Type | Display |
|-----------|---------|
| Numeric target | Progress bar + fraction |
| Duration | "X hours logged" |
| Effort | "X activities • Y days active" |

## 6.4 AI Indicators

- ✨ sparkle icon for AI-generated suggestions
- "AI Suggestion" label on auto-filled fields
- Confidence percentage when relevant

---

# 7. Loading & Error States

## 7.1 Loading States

| Scenario | Display |
|----------|---------|
| Page loading | Skeleton loaders |
| Activity saving | Button shows spinner |
| AI processing | "Strategic layer thinking..." with spinner |

## 7.2 Error States

| Error | Display |
|-------|---------|
| Network error | Toast: "Could not save. Retrying..." |
| AI unavailable | Banner: "AI offline. Manual mode active." |
| Validation error | Inline field errors |

## 7.3 Empty States

| Screen | Empty Message |
|--------|---------------|
| Today (no activities) | "No activities for today. Start planning!" |
| Goals (none created) | "Create your first goal to get started." |
| Insights (none yet) | "Complete a week of tracking to get insights." |

---

# 8. Responsive Design

## 8.1 Breakpoints

| Breakpoint | Layout |
|------------|--------|
| Desktop (>1024px) | Sidebar + main content |
| Tablet (768-1024px) | Collapsible sidebar |
| Mobile (<768px) | Bottom nav + full-width content (Phase 2+) |

## 8.2 PWA Considerations (Phase 2+)

- Touch-friendly tap targets (44px minimum)
- Quick-add activity as primary mobile action
- Swipe gestures for complete/skip
- Offline indicator

---

# 9. Accessibility

- Keyboard navigation for all actions
- Focus indicators visible
- ARIA labels for icons
- Color contrast meets WCAG AA
- Screen reader friendly progress indicators

---

# 10. Behavioral Design Principles

| Principle | Implementation |
|-----------|----------------|
| Encourage reflection | Weekly analysis, consistency metrics |
| Avoid anxiety | No red warnings, no "you failed" language |
| Progress visibility | Clear indicators of accumulated progress |
| User control | All AI suggestions require confirmation |
| Quick logging | < 10 seconds to log an activity |

**Polaris should feel disciplined, not stressful.**

---

# 11. Future UX Extensions (Not MVP)

| Feature | Phase | Description |
|---------|-------|-------------|
| Morning briefing | Phase 4 | "Here's your suggested day" banner |
| Weekly auto-analysis | Phase 4 | Opt-in automatic insights generation |
| Trend charts | Phase 5 | Visual charts of progress over time |
| Pattern heatmap | Phase 5 | When you're most productive |
| Mobile PWA | Phase 2 | Full mobile experience |

---

# 12. UX Success Criteria

Polaris UX is successful when:

- [ ] User can log an activity in under 10 seconds
- [ ] Progress toward goals is immediately visible
- [ ] Switching between views is instant
- [ ] AI suggestions feel helpful, not intrusive
- [ ] System is usable without reading documentation
- [ ] User feels motivated, not anxious

---

# 13. Core UX Constraint

**Polaris must be fully usable without AI.**

AI is a power-up, not a requirement.

The user remains in control at all times.
