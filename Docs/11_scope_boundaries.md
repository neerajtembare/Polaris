# Project Polaris — Scope Boundaries

## Purpose

This document explicitly defines what Polaris **will** and **will not** build. It prevents scope creep during development and ensures focus on core value.

When a feature request arises, check this document first.

---

# Core Identity

**Polaris is a personal activity tracker with AI coaching potential.**

It is NOT:
- A task management app (Todoist, Things)
- A calendar app (Google Calendar)
- A habit tracker (Habitica, Streaks)
- A journaling app (Day One)
- A project management tool (Asana, Linear)
- A social fitness app (Strava)

---

# Feature Priority Matrix

## ✅ MUST BUILD (MVP Critical)

| Feature | Rationale |
|---------|-----------|
| Create/edit/delete goals | Core entity |
| Flexible goal hierarchy | User-controlled structure |
| Create/edit/delete activities | Core entity |
| Activity types (quantity/duration/completion) | Flexible tracking |
| Link activities to goals | Progress tracking |
| Today View | Primary interface |
| Computed progress | Accumulation toward targets |
| Basic goals list | Navigation |
| Soft delete | Data preservation |
| SQLite storage | Local-first |
| REST API | Clean separation |
| Responsive layout | Mobile access |

## ✅ SHOULD BUILD (Phase 2)

| Feature | Rationale |
|---------|-----------|
| Week view | Temporal navigation |
| Progress visualization (charts) | Motivation |
| Streak tracking | Gamification |
| Goal archive | Lifecycle completion |
| Activity filtering | Find past activities |
| Date range navigation | Historical review |
| Export data (JSON/CSV) | Data ownership |
| PWA manifest + service worker | Installability |

## ✅ WILL BUILD LATER (Phase 3+)

| Feature | Rationale |
|---------|-----------|
| AI activity parsing | Reduce friction |
| AI morning suggestions | Pattern-based planning |
| AI weekly insights | Metacognitive awareness |
| AI goal decomposition | Onboarding help |
| Insight history | Track AI over time |
| AI pattern detection | Behavioral understanding |
| AI-suggested recurrence | Smart repeating |

---

# ❌ WILL NOT BUILD

## Explicitly Out of Scope

| Feature | Why Excluded |
|---------|--------------|
| **User authentication** | Single-user local app. Auth adds complexity without value for solo use. |
| **Multi-user / Teams** | Personal tool. Team features are a different product. |
| **Cloud sync** | Local-first. Sync adds massive complexity (conflicts, auth, servers). |
| **Calendar integration** | External dependencies. Can add later as import feature. |
| **Notifications / Reminders** | Requires platform APIs, daemon processes. Revisit with PWA. |
| **Auto-recurring activities** | Complexity explosion. AI will suggest recurrence instead. |
| **Mobile native app** | PWA first. Native app is expensive and duplicative. |
| **Social features** | Not a social app. No sharing, no friends, no leaderboards. |
| **Integrations (Fitbit, Strava, etc.)** | External APIs, auth, rate limits. Not worth it for MVP. |
| **Voice input** | Browser API limitations. Possible future enhancement. |
| **Widgets / Watch complications** | Platform-specific. Out of scope. |
| **Multiple databases / workspaces** | Adds complexity. One database is enough. |
| **Custom themes / dark mode** | Defer until core is solid. Tailwind makes this easy later. |
| **Undo/Redo** | Nice-to-have. Not critical for MVP. |
| **Offline AI** | Requires local model setup. Cloud AI for MVP. |
| **Activity templates** | Premature optimization. Let patterns emerge first. |
| **Goal templates** | Same as above. |
| **Bulk operations** | Adds UI complexity. Single operations first. |
| **Import from other apps** | Custom parsers per app. Not worth initial investment. |

---

# Boundary Decisions

## Activity vs Task

**Decision**: Activities, not tasks.

- Tasks imply todo-list checkbox behavior
- Activities imply **logging what you did** with **values that accumulate**
- This is fundamental to the product identity

**If someone asks for "checkbox tasks"**, the answer is: "Use activity_type: completion"

---

## Hierarchy Depth

**Decision**: Flexible, not rigid.

- No enforced 5-level hierarchy
- `parent_id` allows any depth
- `timeframe` is a grouping hint, not a structural constraint

**If someone asks for "mandatory year/month/week levels"**, the answer is: "Create those goals if you want them, but they're not required"

---

## AI Control

**Decision**: Suggestion layer, not autonomous agent.

- AI suggests, user confirms
- AI never writes to database directly
- Preview modal before any AI-suggested save

**If someone asks for "auto-save AI suggestions"**, the answer is: "User must confirm. See ADR-006."

---

## Progress Tracking

**Decision**: Computed, not stored.

- Progress is derived from activities
- No `progress` column in goals table
- Calculated on demand

**If someone asks to "store cached progress"**, the answer is: "Premature optimization. Compute it."

---

## Sync Strategy

**Decision**: None for MVP.

- Local SQLite only
- No server, no cloud, no sync
- Data lives on user's machine

**If someone asks for "sync between devices"**, the answer is: "Export/import JSON manually, or backup the SQLite file. Cloud sync is post-MVP."

---

## Authentication

**Decision**: None.

- Single user
- No login required
- No password
- No accounts

**If someone asks for "login"**, the answer is: "This is a personal local app. There's nothing to log into."

---

# Scope Creep Red Flags

Watch for these phrases in feature requests:

| Red Flag | Translation |
|----------|-------------|
| "Just a quick feature..." | Usually not quick |
| "What if users want to..." | You are the user |
| "Other apps have..." | Polaris is not other apps |
| "We could also add..." | Scope expansion |
| "Eventually we'll need..." | Not now |
| "It would be easy to..." | Usually not easy |
| "Users will expect..." | You are the user |

---

# Decision Framework

When evaluating a new feature:

```
1. Is it in "MUST BUILD"? → Build it now
2. Is it in "SHOULD BUILD"? → Build in Phase 2
3. Is it in "WILL BUILD LATER"? → Build in Phase 3+
4. Is it in "WILL NOT BUILD"? → Don't build it
5. Is it unlisted? → Ask these questions:
   
   a. Does it serve the core identity?
      (Activity tracking + AI coaching)
   b. Does it require external dependencies?
      (APIs, auth, servers, native code)
   c. Can Polaris function without it?
   d. Does it add more complexity than value?
   
   If (a) is yes AND (b) is no AND (c) is no AND (d) is no:
   → Consider adding to SHOULD or WILL BUILD
   
   Otherwise:
   → Add to WILL NOT BUILD with rationale
```

---

# MVP Definition

**Polaris MVP is complete when:**

1. ✅ User can create goals with optional targets
2. ✅ User can create activities linked to goals
3. ✅ Activities can be quantity, duration, or completion type
4. ✅ Progress is computed and displayed
5. ✅ Today View shows planned + logged activities
6. ✅ Goals list shows all active goals
7. ✅ Basic navigation between views
8. ✅ Responsive design works on mobile browser
9. ✅ Data persists in SQLite
10. ✅ No crashes, no data loss

**MVP is NOT complete until ALL above criteria are met.**

**MVP is complete when EXACTLY these criteria are met** — not "just one more feature."

---

# Phase Boundaries

## Phase 1 → Phase 2 Gate

Move to Phase 2 only when:
- All MVP criteria are met
- No known critical bugs
- UI is usable (not perfect, usable)
- Codebase is clean enough to extend

## Phase 2 → Phase 3 Gate

Move to Phase 3 only when:
- Week view works
- Charts/visualizations work
- Streaks work
- Data export works
- PWA is installable

## Phase 3 → Phase 4 Gate

Move to Phase 4 only when:
- At least one AI feature works end-to-end
- Provider switching works
- Insights are persisted

---

# Minimum Viable AI

**The smallest AI feature that proves value:**

1. Activity parsing from natural language
2. Single endpoint: `POST /ai/parse-activity`
3. Works with at least one provider (OpenAI or Claude)
4. User confirms before save

If this feature works and adds value, expand AI features.
If it doesn't add value, reconsider AI strategy.

---

# Version 1.0 Definition

**Polaris 1.0 is achieved when:**

- Phase 1 + Phase 2 + Phase 3 are complete
- At least one month of personal daily use
- No critical bugs for 2 weeks
- AI features work reliably
- Performance is acceptable

---

# Future Considerations (Post-1.0)

These features might be considered after 1.0:

| Feature | Consideration |
|---------|--------------|
| Cloud backup | User demand, complexity acceptable |
| Dark mode | Easy with Tailwind |
| Browser notifications | PWA support improves |
| Activity templates | Patterns established |
| Import from other apps | User demand |
| Multi-workspace | User demand |

**But not now.**

---

# The Golden Rule

> **When in doubt, leave it out.**

Every feature has:
- Implementation cost
- Maintenance cost  
- Cognitive load
- Bug surface area
- Documentation requirement

The best feature is often the one you don't build.

---

**This document is the authority on what Polaris builds. Consult it before adding any feature.**
