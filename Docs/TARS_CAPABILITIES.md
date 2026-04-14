/**
 * @file TARS_CAPABILITIES.md
 * @description Comprehensive capability matrix for TARS — the Polaris AI assistant.
 *              Lists every capability from basic to complex, with current status,
 *              AI-requirement flag, example phrases, and implementation notes.
 *              Use this as the source of truth for all TARS feature work.
 * @module Docs/TARS
 *
 * @relatedFiles
 * - Docs/TARS_AGENT_ARCHITECTURE.md — system design and provider architecture
 * - Docs/tars_updateplan.md — sprint-level bug fix and UX improvement plan
 * - packages/ai/src/tars/ — action types, tool schemas, intent classifier
 * - apps/frontend/src/hooks/useCommandMatcher.ts — client-side command patterns
 * - apps/backend/src/controllers/ai.controller.ts — chat endpoint handler
 */

# TARS — Capability Matrix

> **Version:** 1.0 | **April 14, 2026**
> **Purpose:** Single source of truth for what TARS can, should, and will be able to do.
> **Scope:** Phases 0 & 1 (MVP). AI features from Phase 3+ are listed under Tier 5 (Deferred).

---

## How to Read This Document

Each capability row contains:

| Column | Meaning |
|---|---|
| **Capability** | What the user can do |
| **Status** | ✅ Works · ⚠️ Buggy · ❌ Missing |
| **Needs AI?** | Whether an LLM call is required |
| **Example Phrases** | What the user would say |
| **Implementation Note** | What exists or what needs building |

---

## Architecture Recap

TARS processes commands in two layers:

```
User input
  │
  ▼
[Layer 1] Client-Side Command Matcher (zero network, instant)
  │  Matches fixed patterns: navigate, audio, focus, clear chat
  │  If matched → execute immediately, no API call
  │
  ▼ (no match, falls through)
[Layer 2] POST /api/ai/chat (backend)
  │  Heuristic intent classification → LLM if ambiguous/complex
  │  Write intents → LLM tool call → TARSAction returned to frontend
  │  Read intents → LLM text response
  │
  ▼ (write actions only)
[Layer 3] ToolConfirmCard (frontend)
  │  User sees proposed action with 3s auto-accept countdown
  │  Confirm → execute via API   |   Cancel → discard
```

**Rule:** If no AI is needed, the command is handled at Layer 1 (or as a direct API read). Only write operations and complex queries use the LLM.

---

## Tier 0 — Critical Bug Fixes

These are existing features that are broken. They block everything else and must be resolved first.

| # | Capability | Status | Needs AI? | What's Wrong | Files to Change |
|---|---|---|---|---|---|
| 0.1 | Confirm "yes" executes the CORRECT activity | ⚠️ Buggy | Yes (indirect) | `pendingAction` draft is NOT sent back to the server when user says "yes". The server re-classifies "yes" as `chat` intent without tools, so the LLM re-generates a new (incorrect) activity from history alone | `useAssistant.ts`, `intent-classifier.ts`, `ai.controller.ts` |
| 0.2 | "play music" actually plays audio | ⚠️ Buggy | No | `audio.play` action fires to frontend but `useAssistantActions` calls `audioPlayer.play()` when no stream is selected → silent failure. Need to auto-select a lofi station from Radio Browser if none is loaded | `useAssistantActions.ts`, `audioPlayer.store.ts` |
| 0.3 | Single-word shortcuts work ("music", "hub", "goals") | ⚠️ Buggy | No | Command matcher requires multi-word patterns like "play music". Single words like "music", "hub", "goals", "settings" are not matched → fall through to server → server responds as a query instead of taking action | `useCommandMatcher.ts` |
| 0.4 | AI thinking/reasoning not shown to user | ⚠️ Buggy | Yes | Gemini's chain-of-thought leaks into the response text ("The user wants to..."). Fix: `thinkingBudget: 0` in Gemini API config + hardened system prompt | `gemini.provider.ts`, `tars-system.prompt.ts` |

> **Reference:** Full fix details are in [tars_updateplan.md](./tars_updateplan.md) (Phases 1–3).

---

## Tier 1 — Basic Commands (No AI)

Instant, client-side execution. Zero network calls. These must work reliably for every user.

### 1A. Navigation

| # | Capability | Status | Needs AI? | Example Phrases | Note |
|---|---|---|---|---|---|
| 1.1 | Navigate to Hub (Dashboard) | ✅ Works | ❌ No | "hub", "home", "dashboard", "go to hub" | Client-side. Add: "take me home", "go home" |
| 1.2 | Navigate to Goals | ✅ Works | ❌ No | "goals", "go to goals", "show goals" | Client-side. Add: "goal list", "my goals" |
| 1.3 | Navigate to Insights | ✅ Works | ❌ No | "insights", "go to insights", "stats", "analytics" | Client-side |
| 1.4 | Navigate to History | ✅ Works | ❌ No | "history", "go to history", "past activities" | Client-side |
| 1.5 | Navigate to Settings | ✅ Works | ❌ No | "settings", "go to settings", "preferences" | Client-side |
| 1.6 | Navigate to Weekly Review | ✅ Works | ❌ No | "weekly review", "weekly", "review" | Client-side |
| 1.7 | Navigate to Focus Mode | ✅ Works | ❌ No | "focus mode", "focus", "pomodoro" | Client-side via `focus.start` action |

### 1B. Audio Control

| # | Capability | Status | Needs AI? | Example Phrases | Note |
|---|---|---|---|---|---|
| 1.8 | Play music (auto-select lofi default) | ⚠️ Buggy | ❌ No | "play music", "music", "play", "start music" | Tier 0.2 fix: auto-load lofi station if none selected |
| 1.9 | Stop / pause music | ✅ Works | ❌ No | "stop music", "pause", "music off", "stop" | Client-side |
| 1.10 | Skip to next track | ✅ Works | ❌ No | "next track", "skip", "next" | Client-side |
| 1.11 | Play by genre | ❌ Missing | ❌ No | "play lofi", "play jazz", "play classical", "play ambient" | Client-side: match genre keyword → `{ type: 'audio.play', genre: 'lofi' }` → Radio Browser search |
| 1.12 | In-chat genre buttons | ❌ Missing | ❌ No | *(auto-shown after "play music")* | When `audio.play` fires with no genre, TARS replies with quick-select buttons: Lo-fi · Jazz · Classical · Ambient |

### 1C. Focus Session

| # | Capability | Status | Needs AI? | Example Phrases | Note |
|---|---|---|---|---|---|
| 1.13 | Start focus session | ✅ Works | ❌ No | "start focus", "focus mode", "pomodoro" | Client-side |
| 1.14 | Stop focus session | ✅ Works | ❌ No | "stop focus", "end focus", "done focusing" | Client-side |
| 1.15 | Start focus for N minutes | ❌ Missing | ❌ No | "focus for 25 minutes", "25 min session" | Client-side: parse duration from phrase → `{ type: 'focus.start', durationMins: 25 }` |
| 1.16 | Start focus on a specific goal | ❌ Missing | ❌ No | "focus on reading", "start pomodoro for gym goal" | Client-side: match goal name → `{ type: 'focus.start', goalId }` (requires goals in client context) |

### 1D. UI Control

| # | Capability | Status | Needs AI? | Example Phrases | Note |
|---|---|---|---|---|---|
| 1.17 | Clear TARS chat history | ❌ Missing | ❌ No | "clear chat", "reset", "start over", "clear" | Client-side: `clearHistory()` in Zustand store. Button exists in panel header but not as a voice/text command |
| 1.18 | Toggle dark/light theme | ❌ Missing | ❌ No | "dark mode", "light mode", "toggle theme", "switch theme" | Client-side: dispatch theme action (theme state lives in App.tsx) |
| 1.19 | Open/close TARS panel | ✅ Works | ❌ No | *(keyboard: Ctrl+T, Esc)* | Already works via hotkeys. Could add: "open tars", "close" as text commands |

---

## Tier 2 — Data Read Queries (No AI, or minimal AI for formatting)

These query the backend and return data as a text response. No data is written. No confirmation needed.

| # | Capability | Status | Needs AI? | Example Phrases | Note |
|---|---|---|---|---|---|
| 2.1 | Today's planned activities | ❌ Missing | ❌ No | "what's planned today?", "what do I have today?", "today's list" | Call `GET /api/activities/today`, format response in plain text. No LLM needed |
| 2.2 | Today's completed activities | ❌ Missing | ❌ No | "what did I do today?", "today's progress" | Same endpoint (`GET /api/activities/today`), filter completed |
| 2.3 | Current streak | ⚠️ Partial | ❌ No | "my streak", "what's my streak?", "streak count" | `show_streak` action exists. Currently just navigates or shows context data. Could return inline text: "3-day streak." |
| 2.4 | Goal list (all active) | ⚠️ Partial | ❌ No | "list my goals", "show all goals", "what goals do I have?" | `show_goals` → navigates to Goals screen. Could also return a summary inline in chat |
| 2.5 | Progress on a specific goal | ❌ Missing | ❌ No | "how's my reading goal?", "reading progress", "gym goal %" | Call `GET /api/goals/:id?includeProgress=true`. Requires goal name→ID resolution |
| 2.6 | Dormant / inactive goals | ❌ Missing | ❌ No | "which goals am I neglecting?", "dormant goals", "inactive goals" | Call `GET /api/goals/-/dormant` and summarize |
| 2.7 | Dashboard metrics summary | ❌ Missing | ❌ No | "how active was I this week?", "my stats", "weekly summary" | Call `GET /api/metrics/dashboard?period=week` and format key numbers |
| 2.8 | Longest streak | ❌ Missing | ❌ No | "what's my longest streak?", "best streak" | Available in `GET /api/metrics/dashboard` under `longestStreak` |
| 2.9 | Activity count this week/month | ❌ Missing | ❌ No | "how many activities this week?", "monthly count" | From dashboard metrics endpoint |

> **Implementation Note:** These should be handled server-side by the `/api/ai/chat` endpoint using the `query` intent. The `PolarisContext` already injects goals, activities, and streak data into every prompt — so the LLM can answer these accurately from context alone, without needing extra API calls. New direct-query capabilities (2.1, 2.2) should be handled with a dedicated `query` tool that constructs the formatted reply from context data.

---

## Tier 3 — Write Operations (AI Required + User Confirmation)

All writes go through the LLM → `ToolConfirmCard` confirmation flow. The user must confirm before any data is mutated. The 3-second auto-accept countdown is shown.

| # | Capability | Status | Needs AI? | Example Phrases | Note |
|---|---|---|---|---|---|
| 3.1 | Log a completed activity | ⚠️ Buggy | ✅ Yes | "I read 30 pages", "ran 5km today", "meditated for 20 minutes" | Architecture is correct. Blocked by Tier 0.1 bug (confirmation logs wrong activity) |
| 3.2 | Plan a future activity | ⚠️ Buggy | ✅ Yes | "I'm going to run tomorrow", "plan to study tonight", "going to meditate at 9pm" | Same bug as 3.1 |
| 3.3 | Create a new goal | ⚠️ Buggy | ✅ Yes | "new goal: read 24 books this year", "I want to run a 5K", "create a goal to learn guitar" | Same bug as 3.1. Also: multi-turn guided creation (see 4.4) would improve this |
| 3.4 | Log with automatic goal linking | ⚠️ Buggy | ✅ Yes | "read 30 pages" (when reading goal exists) | LLM should use `goalId` from context. Works architecturally; blocked by same confirmation bug |
| 3.5 | Update activity status | ❌ Deferred | ✅ Yes | "mark today's reading as done", "skip gym today", "complete planned run" | Deferred to later stage. Needs new `TARSAction` type + `PATCH /api/activities/:id` |
| 3.6 | Delete an activity | ❌ Deferred | ✅ Yes | "remove last activity", "delete today's meditation log" | Deferred to later stage. Needs new `TARSAction` type + `DELETE /api/activities/:id` |
| 3.7 | Update a goal | ❌ Deferred | ✅ Yes | "change reading target to 30 books", "pause exercise goal" | Deferred to later stage. Needs new `TARSAction` type + `PATCH /api/goals/:id` |
| 3.8 | Delete a goal | ❌ Deferred | ✅ Yes | "remove my guitar goal", "delete reading goal" | Deferred to later stage |

> **Deferred items (3.5–3.8)** require new entries in `TARSAction` union type, new Zod validators, new LLM tool schemas, and new intent patterns. Scope this as a dedicated sprint after the basic operations are stable.

---

## Tier 4 — Intelligent Features (AI Required, No Confirmation Needed)

These query, analyse, or coach — they don't write data. Backend services already exist for most; they just need TARS routing.

| # | Capability | Status | Needs AI? | Example Phrases | Note |
|---|---|---|---|---|---|
| 4.1 | Daily coaching message | ✅ Backend exists | ✅ Yes | "coach me", "what should I focus on today?", "daily advice" | `GET /api/ai/daily-coach` already exists (also surfaces via MorningBanner). TARS just needs to call it on this phrase |
| 4.2 | Startup briefing | ✅ Works | ✅ Yes | *(auto-displayed on app load once per day)* | SSE stream via `GET /api/ai/briefing`. Already implemented in StartupBriefing component |
| 4.3 | Weekly analysis / reflection | ✅ Backend exists | ✅ Yes | "analyze my week", "how was last week?", "weekly insights" | `POST /api/ai/analyze-week` exists. TARS routing just needs to call this endpoint on command |
| 4.4 | Goal breakdown into sub-goals | ✅ Backend exists | ✅ Yes | "break down my reading goal", "how do I achieve this goal?", "sub-goals for gym" | `POST /api/ai/breakdown` exists. Returns suggested sub-goals and activities |
| 4.5 | Activity suggestions | ❌ Missing | ✅ Yes | "what should I do next?", "suggest an activity", "what's a good task?" | Would call `/api/ai/daily-coach` and surface the `suggestedActivity` from its response |
| 4.6 | Conversational goal creation | ❌ Missing | ✅ Yes | "I want to learn guitar" → TARS asks: timeframe? target? → drafts goal → confirm | Multi-turn flow. TARS asks clarifying questions, accumulates answers over 2–3 turns, then proposes a `create_goal` action. Requires conversation memory (Tier 0.1 fix is a prerequisite) |
| 4.7 | Progress coaching / insight | ❌ Missing | ✅ Yes | "am I on track?", "what's holding me back?", "encourage me" | Use PolarisContext (already injected) + LLM general `chat` intent. Should work today once Tier 0.4 (thinking leak) is fixed — LLM already has all the data |

---

## Tier 5 — Future / Deferred (Phase 3+ per Roadmap)

Not in scope for Phase 0/1. Listed here for completeness and planning.

| # | Capability | When | Description |
|---|---|---|---|
| 5.1 | Voice assistant auto-submit | Phase 2 | Voice transcript auto-submitted to TARS without touching text bar. Currently it fills the text box only. |
| 5.2 | Proactive nudges | Phase 3 | TARS initiates: "You haven't logged anything today — want to log now?" triggered by inactivity |
| 5.3 | Pattern detection | Phase 4 | "When am I most productive?", "show my patterns", "what times do I usually train?" |
| 5.4 | Recurring activities | Phase 3 | "I run every Monday and Wednesday", "daily meditation at 7am" |
| 5.5 | TARS personality customisation | Phase 3 | Adjust humor level, verbosity, proactivity (currently wired in the UI prototype but does nothing) |
| 5.6 | Multi-device / cloud sync | Phase 5 | TARS context persisted across devices |
| 5.7 | External integrations | Phase 4+ | Apple Health, Strava, calendar imports |

---

## Implementation Priority Order

### Sprint A — Make Existing Features Actually Work (Tier 0 + Tier 1 fixes)

This is the minimum viable TARS. Everything after this is additive.

1. **[0.1]** Fix multi-turn confirmation — `pendingAction` draft must survive the "yes" round-trip
2. **[0.2]** Fix audio playback — auto-select lofi station, add in-chat genre buttons  
3. **[0.3]** Expand command matcher — single-word shortcuts ("music", "hub", "goals", "settings", etc.)
4. **[0.4]** Suppress Gemini thinking output — `thinkingBudget: 0` in Gemini provider
5. **[1.11]** Play by genre — "play lofi", "play jazz"
6. **[1.12]** In-chat genre quick-select buttons after "play music"
7. **[1.17]** "clear chat" text command → wire to existing `clearHistory()` in store
8. **[1.18]** "dark mode" / "light mode" commands → toggle theme from TARS

### Sprint B — Data Read Queries (Tier 2)

9. **[2.1–2.2]** Today's planned/completed activities — inline text response in chat
10. **[2.3]** Inline streak response instead of just navigating
11. **[2.5]** Progress on a specific goal — "how's my reading goal?"
12. **[2.7–2.9]** Dashboard metrics via TARS — "my stats this week"

### Sprint C — Intelligent Features Surface (Tier 4 items that already have backends)

13. **[4.1]** Daily coaching via TARS phrase
14. **[4.3]** Weekly analysis via TARS phrase
15. **[4.4]** Goal breakdown via TARS phrase
16. **[4.5]** Activity suggestions via TARS phrase

### Sprint D — Advanced Write Flows

17. **[4.6]** Conversational goal creation (multi-turn guided)
18. **[1.15–1.16]** Focus duration + goal-targeted focus
19. **[3.5–3.8]** Update/delete activities and goals (deferred per user decision)

---

## Command Reference Card

Quick lookup of all supported phrases (Sprint A target state):

```
NAVIGATION
  hub | home | dashboard
  goals | my goals | goal list
  insights | stats | analytics
  history | past activities
  settings | preferences
  weekly review | weekly | review
  focus mode | focus | pomodoro

AUDIO
  play music | music | play
  stop music | pause | stop
  next track | skip | next
  play lofi | play jazz | play classical | play ambient

FOCUS
  start focus | focus mode | pomodoro
  stop focus | end focus | done focusing

UI
  clear chat | reset | start over
  dark mode | light mode | toggle theme

WRITE OPERATIONS (ask + confirm)
  "I [did X]" → log completed activity
  "I'm going to [do X]" → plan activity
  "new goal: [X]" | "I want to [X]" → create goal

DATA QUERIES (inline response)
  what's planned today? | today's list
  what did I do today?
  my streak | what's my streak?
  how's my [goal name] goal?
  my stats | weekly summary

INTELLIGENT
  coach me | what should I focus on?
  analyze my week | weekly insights
  break down [goal name] goal
  suggest an activity
```

---

## Decision Log

| Decision | Rationale |
|---|---|
| Audio defaults to lofi auto-pick | Removes friction. Genre buttons shown in-chat as quick alternatives |
| Update/Delete operations deferred | Basic CRUD must be stable before adding mutation complexity |
| All writes require user confirmation | Core safety principle — TARS never mutates data without explicit user OK |
| Client-side match always wins over server | Zero-latency UX for fixed commands. Server is for intent-ambiguous inputs only |
| Voice auto-submit deferred | Current behaviour (fills text bar) is acceptable for Phase 1. Full voice assistant mode is Phase 2 |
| Capabilities doc lives in Docs/ | Alongside TARS_AGENT_ARCHITECTURE.md and tars_updateplan.md |
