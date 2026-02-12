# Project Polaris — User Flows

## Purpose

This document maps key user journeys through the Polaris system, showing step-by-step interactions from user intent to system response.

Each flow includes:
- **Trigger**: What initiates this flow
- **Steps**: User actions and system responses
- **End State**: What the user achieves
- **Phase**: When this flow becomes available

---

# Flow 1: First-Time Setup

**Trigger**: User opens Polaris for the first time  
**Phase**: Phase 1 MVP

## Steps

```
1. User opens app
   ↓
2. System detects no existing data
   ↓
3. System shows welcome screen:
   "Welcome to Polaris. Start by creating your first goal."
   ↓
4. User taps "Create Goal"
   ↓
5. System shows goal creation form:
   - Title (required)
   - Description (optional)
   - Timeframe: Long-term / Medium-term / Short-term
   - Target value (optional): Number + Unit
   ↓
6. User enters: "Read 12 books this year"
   - Timeframe: Long-term
   - Target: 12 books
   ↓
7. User taps "Create"
   ↓
8. System creates goal, shows Today View
   - Empty activity list
   - Goal visible in sidebar/goals list
   ↓
9. System prompts: "Log your first activity toward this goal?"
```

## End State

- One goal exists in system
- User understands basic create → track flow
- Ready to log first activity

---

# Flow 2: Morning Planning Session

**Trigger**: User opens app in morning to plan day  
**Phase**: Phase 1 MVP

## Steps

```
1. User opens Today View
   ↓
2. System shows:
   - Date header (Today, Monday Jan 15)
   - Planned activities (empty or from yesterday's planning)
   - Quick-add bar at bottom
   ↓
3. User decides to plan activities for today
   ↓
4. User taps "Plan Activity" or uses quick-add
   ↓
5. System shows activity creation:
   - Description: "Read for 30 minutes"
   - Type: Duration
   - Target: 30 minutes
   - Linked Goal: "Read 12 books this year"
   - Status: Planned
   ↓
6. User saves activity
   ↓
7. Repeat steps 4-6 for additional planned activities:
   - "Morning run" (Duration: 20 min)
   - "Study chapter 3" (Completion)
   - "Save ₹200" (Quantity: 200)
   ↓
8. User reviews planned activities list
   ↓
9. User closes app, goes about day
```

## End State

- Day has planned activities
- Activities linked to goals
- Ready for execution

---

# Flow 3: Logging an Activity (Ad-hoc)

**Trigger**: User completed something and wants to log it  
**Phase**: Phase 1 MVP

## Steps

```
1. User opens Today View
   ↓
2. User sees planned activities (if any)
   ↓
3. User taps "Log Activity" or "+"
   ↓
4. System shows activity form:
   ↓
5. User enters: "Read 25 pages of Atomic Habits"
   - Type: Quantity
   - Value: 25 pages
   - Linked Goal: "Read 12 books this year" (auto-suggested)
   ↓
6. User taps "Save"
   ↓
7. System:
   - Saves activity with status: logged
   - Updates goal progress (now +25 pages)
   - Shows activity in Today View list
   ↓
8. User sees updated progress on linked goal
```

## End State

- Activity recorded
- Goal progress updated
- User has visibility into accumulation

---

# Flow 4: Completing a Planned Activity

**Trigger**: User planned activity earlier, now completing it  
**Phase**: Phase 1 MVP

## Steps

```
1. User opens Today View
   ↓
2. User sees planned activity: "Morning run (20 min)"
   ↓
3. User taps on activity row
   ↓
4. System shows activity detail/edit:
   - Current status: Planned
   - Target: 20 minutes
   ↓
5. User updates:
   - Actual value: 25 minutes (ran longer!)
   - Status: Completed
   ↓
6. User taps "Save"
   ↓
7. System:
   - Updates activity status to completed
   - Records actual value (25 min)
   - Updates goal progress
   - Visual indicator shows completed
```

## End State

- Planned activity marked done
- Actual value captured (may differ from plan)
- Goal progress reflects reality

---

# Flow 5: Creating a Sub-Goal

**Trigger**: User wants to break down a large goal  
**Phase**: Phase 1 MVP

## Steps

```
1. User views Goals List
   ↓
2. User taps on "Read 12 books this year"
   ↓
3. System shows goal detail view:
   - Progress: 2 books / 12 target
   - Recent activities
   - Child goals: (empty)
   ↓
4. User taps "Add Sub-Goal"
   ↓
5. System shows goal creation with parent pre-set:
   - Parent: "Read 12 books this year"
   ↓
6. User enters:
   - Title: "Finish Atomic Habits"
   - Target: 1 book
   - Timeframe: Short-term
   ↓
7. User saves
   ↓
8. System:
   - Creates child goal
   - Links to parent
   - Shows in parent's sub-goals list
```

## End State

- Goal hierarchy established
- Sub-goal progress will roll up to parent
- User can track granular and aggregate progress

---

# Flow 6: Viewing Progress Dashboard

**Trigger**: User wants to see overall progress  
**Phase**: Phase 1 MVP (basic), Phase 2 (enhanced)

## Steps

```
1. User navigates to Progress/Dashboard view
   ↓
2. System shows:
   
   MVP (Phase 1):
   - Goals list with progress bars
   - This week's activity count
   - Current streak
   
   Enhanced (Phase 2):
   - Progress chart over time
   - Goal completion rate
   - Week-over-week comparison
   - Activity type breakdown
   ↓
3. User taps on specific goal
   ↓
4. System shows goal detail:
   - Progress toward target
   - Activity history
   - Sub-goals (if any)
   ↓
5. User can drill into activities or edit goal
```

## End State

- User understands overall progress
- Can identify lagging areas
- Motivated by visible progress

---

# Flow 7: Weekly Review

**Trigger**: User wants to review past week  
**Phase**: Phase 2

## Steps

```
1. User opens Week View
   ↓
2. System shows:
   - 7-day calendar grid
   - Activities per day
   - Goals touched this week
   - Consistency metrics
   ↓
3. User reviews each day:
   - Monday: 3 activities ✓
   - Tuesday: 0 activities ✗
   - Wednesday: 2 activities ✓
   ...
   ↓
4. User identifies patterns:
   "I always skip Tuesday"
   ↓
5. User can:
   - Add missed activities retroactively
   - Adjust goals based on reality
   - Plan for next week
```

## End State

- User has weekly perspective
- Patterns visible
- Foundation for AI insights later

---

# Flow 8: AI-Assisted Activity Parsing

**Trigger**: User enters natural language activity  
**Phase**: Phase 3

## Steps

```
1. User opens Today View
   ↓
2. User types in quick-add: "Read 30 pages of Sapiens"
   ↓
3. System sends to AI parser
   ↓
4. AI returns structured suggestion:
   {
     description: "Read 30 pages of Sapiens",
     type: "quantity",
     value: 30,
     unit: "pages",
     suggested_goal: "Read 12 books this year"
   }
   ↓
5. System shows preview:
   "📖 Read 30 pages of Sapiens
    Type: Quantity (30 pages)
    Goal: Read 12 books this year
    
    [Confirm] [Edit] [Cancel]"
   ↓
6. User taps "Confirm"
   ↓
7. System saves activity
```

## End State

- Natural language input works
- AI handles parsing
- User confirms before save (ADR-006)

---

# Flow 9: Morning AI Suggestions

**Trigger**: User opens app in morning, AI suggests plan  
**Phase**: Phase 3

## Steps

```
1. User opens Today View (morning)
   ↓
2. System detects:
   - No activities planned for today
   - AI feature enabled
   ↓
3. System sends context to AI:
   - Recent activity patterns
   - Active goals
   - Day of week patterns
   ↓
4. AI returns suggestions:
   [
     "Morning run (20 min) - you usually run Mon/Wed/Fri",
     "Read 30 pages - 3 days since last reading",
     "Practice guitar (15 min) - goal falling behind"
   ]
   ↓
5. System shows suggestion panel:
   "Good morning! Based on your patterns:
    
    □ Morning run (20 min)
    □ Read 30 pages
    □ Practice guitar (15 min)
    
    [Add Selected] [Dismiss]"
   ↓
6. User checks desired items, taps "Add Selected"
   ↓
7. System creates planned activities
```

## End State

- AI reduces planning friction
- User stays in control
- Suggestions based on actual patterns

---

# Flow 10: Viewing AI Insight

**Trigger**: AI has generated a weekly insight  
**Phase**: Phase 3

## Steps

```
1. User opens Dashboard
   ↓
2. System shows insight card:
   "Weekly Insight (generated Sunday)
    
    You logged 18 activities this week, up from 14 last week.
    Reading is consistent (5/7 days), but exercise dropped.
    Consider: Schedule runs earlier in the day.
    
    [Dismiss] [Save Insight]"
   ↓
3. User reads insight
   ↓
4. User taps "Save Insight"
   ↓
5. System saves insight to history
   ↓
6. User can view past insights in Insights tab
```

## End State

- AI provides non-obvious patterns
- User gains metacognitive awareness
- Insights preserved for reference

---

# Flow 11: Quick Win — Micro Activity

**Trigger**: User completed something small, wants quick capture  
**Phase**: Phase 1 MVP

## Steps

```
1. User is in Today View
   ↓
2. User sees quick-add bar at bottom
   ↓
3. User types: "Drank 2L water"
   ↓
4. User taps "Log" (no goal link needed)
   ↓
5. System saves as:
   - Activity type: Quantity
   - Value: 2
   - Unit: L
   - Goal: None (orphan activity OK)
   ↓
6. Activity appears in today's list
```

## End State

- Low-friction logging
- Not everything needs a goal
- Builds activity logging habit

---

# Flow 12: Archiving a Completed Goal

**Trigger**: User finished a goal entirely  
**Phase**: Phase 2

## Steps

```
1. User views goal: "Finish Atomic Habits"
   ↓
2. Progress shows: 1/1 complete (100%)
   ↓
3. User taps "Archive Goal"
   ↓
4. System confirms:
   "Archive this goal? It will move to completed goals."
   ↓
5. User confirms
   ↓
6. System:
   - Sets goal status to archived
   - Removes from active goals list
   - Shows in "Completed" filter
   - Parent goal progress may update
```

## End State

- Goal lifecycle complete
- Historical record preserved
- UI uncluttered

---

# Error Flows

## E1: Activity Save Fails

```
1. User submits activity
   ↓
2. System fails to save (DB error, validation error)
   ↓
3. System shows inline error:
   "Couldn't save activity. Please try again."
   ↓
4. Form data preserved
   ↓
5. User can retry or cancel
```

## E2: AI Parse Fails

```
1. User enters: "asdfkjahsdf"
   ↓
2. AI returns low confidence / error
   ↓
3. System shows:
   "Couldn't parse that. Please enter manually."
   ↓
4. Falls back to manual form
```

## E3: Offline State

```
1. User opens app (no network)
   ↓
2. Core features work (local SQLite)
   ↓
3. AI features disabled:
   "AI suggestions unavailable offline"
   ↓
4. User can still log activities manually
   ↓
5. When online, AI features resume
```

---

# Flow Matrix by Phase

| Flow | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| First-Time Setup | ✓ | ✓ | ✓ |
| Morning Planning | ✓ | ✓ | ✓ |
| Logging Activity | ✓ | ✓ | ✓ |
| Completing Planned | ✓ | ✓ | ✓ |
| Creating Sub-Goal | ✓ | ✓ | ✓ |
| Progress Dashboard | Basic | Enhanced | + AI |
| Weekly Review | - | ✓ | ✓ |
| AI Activity Parse | - | - | ✓ |
| AI Suggestions | - | - | ✓ |
| AI Insights | - | - | ✓ |
| Quick Win | ✓ | ✓ | ✓ |
| Archive Goal | - | ✓ | ✓ |

---

**Every feature should trace back to a user flow. If a flow isn't documented, the feature isn't designed.**
