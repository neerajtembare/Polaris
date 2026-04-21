# Polaris — Session State

**Last Updated:** April 15, 2026 by GitHub Copilot

---

## Current Progress

| Item | Value |
|------|-------|
| **Phase** | TARS Capabilities — Sprint F (next) |
| **Milestone** | TARS Sprints A–E complete. All core capabilities implemented. |
| **Last Completed** | Sprint E — Tier 4 AI features (daily coach, weekly analysis, goal breakdown via TARS phrases) |
| **Current Task** | Sprint F — Advanced flows (conversational goal creation, focus duration, update/delete deferred ops) |
| **Next Up** | Sprint F [4.6] Conversational goal creation (multi-turn) · [1.15–1.16] Focus duration + goal-targeted · [3.5–3.8] Update/delete deferred |
| **Test Baseline** | 94 backend + 97 frontend tests passing. 0 type errors. |
| **Blockers** | None |

---

## TARS Build Status

| Sprint | Description | Status | Completed |
|--------|-------------|--------|-----------|
| Sprint 0 | Provider Foundation | ✅ Complete | April 14, 2026 |
| Sprint 1 | TARS Backend Core | ✅ Complete | April 14, 2026 |
| Sprint 2 | TARS UI Foundation | ✅ Complete | April 14–15, 2026 |
| Sprint A | Bug Fixes + Core UX (Tier 0 + F1, F4–F6) | ✅ Complete | April 15, 2026 |
| Sprint B | Basic Commands + Chat Polish (Tier 1 new + F8, F9) | ✅ Complete | April 15, 2026 |
| Sprint C | Write Flow Polish (F2, F3, F7) | ✅ Complete | April 15, 2026 |
| Sprint D | Data Read Queries (Tier 2) | ✅ Complete | April 15, 2026 |
| Sprint E | Intelligent Features Surface (Tier 4 existing backends) | ✅ Complete | April 15, 2026 |
| Sprint F | Advanced Flows (4.6, 1.15–1.16, 3.5–3.8) | ⬜ Not Started | — |

---

## Sprint A — Bug Fixes + Core UX (✅ Complete)

| # | Task | Status |
|---|------|--------|
| 0.1 | Multi-turn confirmation fix — `pendingActionArgs` short-circuit in `ai.controller.ts` | ✅ |
| 0.2 | Audio auto-play — auto-select lofi preset when no stream loaded | ✅ |
| 0.3 | Single-word command aliases — "music", "hub", "goals", "lofi", "jazz", etc. | ✅ |
| 0.4 | `thinkingBudget: 0` already set in Gemini provider — no action needed | ✅ |
| F1 | Quick Reply Chips system — `QuickReplyChip` type, backend `chipsForAction()`, frontend rendering in `ConversationThread` | ✅ |
| F4 | Screen context awareness — `currentScreen` sent with all chat requests | ✅ |
| F5 | Typing indicator — 3-dot bounce in `ConversationThread` when `isProcessing` | ✅ |
| F6 | Error recovery UX — `[Retry]` + `[Open Manual Form]` chips on error | ✅ |

---

## Sprint B — Basic Commands + Chat Polish (✅ Complete)

| # | Task | Status |
|---|------|--------|
| 1.11 | Play by genre — GENRE_MAP in `useAssistantActions.tsx` | ✅ |
| 1.12 | In-chat genre chips after `audio.play` | ✅ |
| 1.17 | "clear chat" text command | ✅ |
| 1.18 | "dark mode" / "light mode" / "toggle theme" commands | ✅ |
| 1.20 | Help command — 9 HELP_CHIPS by category | ✅ |
| F8 | Input history — Up/Down arrow in `AssistantInput.tsx` | ✅ |
| F9 | Message timestamps on hover in `UserMessage` + `AssistantMessage` | ✅ |

---

## Sprint C — Write Flow Polish (✅ Complete)

| # | Task | Status |
|---|------|--------|
| F2 | Editable `ToolConfirmCard` — real dropdowns for goal, unit, type; `ActivityFields` + `GoalFields` sub-components | ✅ |
| F3 | Undo/Rollback toast — 30-second `react-hot-toast` after every confirmed write. `lastAction` in store. Undo calls `deleteActivity`/`deleteGoal` | ✅ |
| F7 | State persistence — Zustand `persist` middleware in `assistant.store.ts`, key `polaris:tars` v1, last 10 messages + `isOpen` | ✅ |

---

## Sprint D — Data Read Queries (✅ Complete)

| # | Task | Status |
|---|------|--------|
| 2.1 | Today's planned activities via TARS | ✅ |
| 2.2 | Today's completed activities via TARS | ✅ |
| 2.3 | Inline streak response (current + longest) | ✅ |
| 2.4 | Goals list with progress% inline in chat | ✅ |
| 2.5 | Specific goal progress — fuzzy name match | ✅ |
| 2.7 | Weekly stats summary | ✅ |
| 2.8 | Longest streak included in streak response | ✅ |
| 2.9 | Activity count this week | ✅ |

**Implementation:** `tryDirectQuery()` helper in `ai.controller.ts`. Intercepts `query` intent before the LLM call. Formats responses directly from `PolarisContext` (assembled server-side). Zero LLM calls for all these paths.

---

## Sprint E — Intelligent Features Surface (✅ Complete)

| # | Task | Status |
|---|------|--------|
| 4.1 | Daily coaching via TARS phrase — `daily_coach` intent → `aiService.dailyCoach(ctx)` | ✅ |
| 4.3 | Weekly analysis via TARS phrase — `analyze_week` intent → `aiService.analyzeWeek(metrics)` | ✅ |
| 4.4 | Goal breakdown via TARS phrase — `goal_breakdown` intent → fuzzy match → `aiService.breakdownGoal()` | ✅ |
| 4.5 | Activity suggestions — covered by `daily_coach` (suggestion field → ToolConfirmCard) | ✅ |

**New `IntentType` values:** `daily_coach` | `analyze_week` | `goal_breakdown` in `packages/ai/src/tars/intent-classifier.ts`
**Backend:** Sprint E intents handled inline in `chatHandler` with graceful fallthrough to LLM on error.

---

## Sprint F — Advanced Flows (⬜ Not Started)

| # | Task | Priority |
|---|------|----------|
| 4.6 | Conversational goal creation (multi-turn guided) | High |
| 1.15 | Focus for N minutes — "focus for 25 minutes" | Medium |
| 1.16 | Focus on specific goal — "focus on reading" | Medium |
| 3.5 | Update activity status via TARS | Deferred |
| 3.6 | Delete an activity via TARS | Deferred |
| 3.7 | Update a goal via TARS | Deferred |
| 3.8 | Delete a goal via TARS | Deferred |
| 2.6 | Dormant goals inline response | Low |

---

## Sprint 0 — Provider Foundation (✅ Complete — April 14, 2026)

| # | Task | Status |
|---|------|--------|
| 1–14 | See previous SESSION_STATE entries | ✅ All done |

---

## Sprint 1 — TARS Backend Core (✅ Complete — April 14, 2026)

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 1 | `TARSAction` union type, `ActivityDraft`, `GoalDraft`, `ScreenId` | `tars/action-types.ts` | ✅ |
| 2 | LLM function-calling tool schemas | `tars/tool-schemas.ts` | ✅ |
| 3 | Zod validation for tool call output | `tars/action-validator.ts` | ✅ |
| 4 | Heuristic-first intent classifier | `tars/intent-classifier.ts` | ✅ |
| 5 | TARS persona system prompt | `prompts/tars-system.prompt.ts` | ✅ |
| 6 | Briefing prompt template | `prompts/briefing.prompt.ts` | ✅ |
| 7 | `streamBriefing()` async generator | `tars/briefing.ts` | ✅ |
| 8 | Enrich `PolarisContext` — `lastActivityDaysAgo`, `todayPlanned`, `todayCompleted` | `packages/shared/src/types/ai.ts` | ✅ |
| 9 | Update `assemblePolarisContext()` — query new fields | `polaris-context.service.ts` | ✅ |
| 10 | `POST /api/ai/chat` — route + controller handler | `ai.controller.ts`, `ai.routes.ts` | ✅ |
| 11 | `GET /api/ai/briefing` — SSE handler | `ai.controller.ts`, `ai.routes.ts` | ✅ |
| 12 | Export all TARS types + functions from `packages/ai/src/index.ts` | `index.ts` | ✅ |

---

## Sprint 2 — TARS UI Foundation (✅ Complete — April 14–15, 2026)

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 1 | `assistant.store.ts` — Zustand: panel, conversation, tarsState, lastAction, persist | `stores/assistant.store.ts` | ✅ |
| 2 | `AssistantPanel.tsx` — right drawer shell | `components/assistant/AssistantPanel.tsx` | ✅ |
| 3 | `ConversationThread.tsx` — scrollable history + chip rendering + typing indicator | `components/assistant/ConversationThread.tsx` | ✅ |
| 4 | `AssistantMessage.tsx` — TARS bubble + typewriter + timestamp on hover | `components/assistant/AssistantMessage.tsx` | ✅ |
| 5 | `UserMessage.tsx` — user bubble + timestamp on hover | `components/assistant/UserMessage.tsx` | ✅ |
| 6 | `AssistantInput.tsx` — text input + mic button + Up/Down history | `components/assistant/AssistantInput.tsx` | ✅ |
| 7 | `useCommandMatcher.ts` — client-side pattern matching | `hooks/useCommandMatcher.ts` | ✅ |
| 8 | `useAssistant.ts` — send message → API → response handler | `hooks/useAssistant.ts` | ✅ |
| 9 | `useAssistantActions.tsx` — execute confirmed actions + undo toast | `hooks/useAssistantActions.tsx` | ✅ |
| 10 | `ToolConfirmCard.tsx` — editable confirm card | `components/assistant/ToolConfirmCard.tsx` | ✅ |
| 11 | Wire into `App.tsx` — panel + keyboard shortcut + theme + screen context | `App.tsx` | ✅ |

---

## Phase Completion Summary

| Phase | Status | Completed |
|-------|--------|-----------|
| Phase 0A — Postgres migration | ✅ Complete | Earlier sessions |
| Phase 0B — Dead code cleanup | ✅ Complete | Earlier sessions |
| Phase 0C — AI/input refactor | ✅ Complete | Earlier sessions |
| Phase 1 (partial) — Core loop polish | 🟡 Partial | Tasks 1,2,7,8,9,10 done; 3–6,11 pending post-TARS |
| Phase 2A — Focus Sessions | ✅ Complete | April 13, 2026 |
| Phase 2B — Audio Player | ✅ Complete | April 13, 2026 |
| Phase 2C — Daily Coach | ✅ Complete | April 13, 2026 |
| Phase 3 — Depth + Retention | ✅ Complete | April 13, 2026 |
| TARS Sprint 0 — Provider Foundation | ✅ Complete | April 14, 2026 |
| TARS Sprint 1 — Backend Core | ✅ Complete | April 14, 2026 |
| TARS Sprint 2 — UI Foundation | ✅ Complete | April 14–15, 2026 |
| TARS Sprint A — Bug Fixes + Core UX | ✅ Complete | April 15, 2026 |
| TARS Sprint B — Basic Commands | ✅ Complete | April 15, 2026 |
| TARS Sprint C — Write Flow Polish | ✅ Complete | April 15, 2026 |
| TARS Sprint D — Data Read Queries | ✅ Complete | April 15, 2026 |
| TARS Sprint E — AI Features Surface | ✅ Complete | April 15, 2026 |

---

## Key localStorage Keys (documented to avoid collisions)

| Key | Purpose |
|-----|---------|
| `polaris:theme` | `'dark' \| 'light'` |
| `polaris:auth` | `'true' \| 'false'` |
| `polaris:audio` | Zustand audio player state (stream + volume) |
| `polaris:tars` | Zustand TARS state (last 10 messages + `isOpen`, version 1) |
| `polaris:daily-coach:YYYY-MM-DD` | Cached DailyCoachResponse for that day |
| `polaris:banner-dismissed:YYYY-MM-DD` | Whether morning banner was dismissed that day |
| `polaris:ai-threshold` | NLP parse confidence threshold (0–1, default 0.85) |
| `polaris:onboarded` | `'1'` once user completes onboarding — never show again |
| `polaris:intentions:YYYY-MM-DD` | Daily intention strings for that date |
| `polaris:briefing:YYYY-MM-DD` | Whether briefing was shown today |

---

## Environment Status

```
Backend:   Node.js + Fastify + Prisma + SQLite
Frontend:  React 19 + Vite + TanStack Query v5 + Tailwind
AI:        AI_PROVIDER=gemini (default), GEMINI_MODEL=gemma-4-26b-a4b-it (1,500 RPD)
           AI_PROVIDER=ollama also supported (OLLAMA_MODEL=gemma4:e4b)
Build:     All 4 packages typecheck clean (April 15, 2026)
Tests:     94 backend + 97 frontend passing
```

---

## Active Decisions

| Decision | Reason | Date |
|----------|--------|------|
| `tags` stored as JSON string in Prisma (not `String[]`) | SQLite-compatible; JSON string works cross-DB | April 13, 2026 |
| Intentions are localStorage-only (not DB-backed) | Phase 3 scope — lightweight, can migrate to DB later | April 13, 2026 |
| Onboarding detection: 0 goals AND 0 activities | Most reliable proxy for "new user" without auth | April 13, 2026 |
| Gemini as primary AI provider (not Ollama) | Ollama latency 72-278s measured in logs — unusable for chat UX | April 14, 2026 |
| Default model: `gemma-4-26b-a4b-it` (not gemini-2.5-flash) | 1,500 RPD free tier vs 20 RPD — sustainable for dev | April 14, 2026 |
| Context assembled server-side only | Security: never trust client-sent context | April 14, 2026 |
| Command matcher runs client-side | Fixed commands don't need LLM — saves quota + latency | April 14, 2026 |
| `tryDirectQuery()` for Tier 2 | Zero LLM calls for read-only data queries already in context | April 15, 2026 |
| Sprint E intents inline in `chatHandler` | Avoids extra HTTP hops; graceful fallthrough to LLM on error | April 15, 2026 |
| `useAssistantActions.tsx` (not `.ts`) | JSX required for `react-hot-toast` render function (undo button) | April 15, 2026 |

---

## Known Issues

| Issue | Severity | Workaround | Fix In |
|-------|----------|------------|--------|
| Hub quick-log doesn't expose tags field | Low | Use LogActivityForm (full modal) to add tags | Post-TARS |
| Audio streams (Zeno.fm) paid/broken | Medium | Use PRESET_STREAMS fallback | Future pass |
| Dormant goals not surfaced via TARS [2.6] | Low | Navigate to WeeklyReview screen | Sprint F |

---

## File Change Log

| Session | Files Created | Files Modified |
|---------|---------------|----------------|
| April 13 Phase 3 | `WeeklyReview.tsx`, `OnboardingModal.tsx`, `IntentionsPanel.tsx`, `dormancy.service.ts`, `useDormantGoals.ts`, `useWeeklyAnalysisStream.ts`, `useIntentions.ts` | `App.tsx`, `Hub.tsx`, `GoalMatrix.tsx`, `History.tsx`, `Settings.tsx`, `activity.service.ts`, `ai.controller.ts` |
| April 14 TARS Sprint 0 | `gemini.provider.ts`, `.env.example` | `types.ts` (AIProvider), `ollama.provider.ts`, `openai.provider.ts`, `mock.provider.ts`, `providers/index.ts`, `daily-coach.ts`, `breakdown-goal.ts`, `analyze-week.ts`, `ai.controller.ts`, `useAiConfig.ts`, `Settings.tsx` |
| April 14 TARS Sprint 1 | `tars/action-types.ts`, `tars/tool-schemas.ts`, `tars/action-validator.ts`, `tars/intent-classifier.ts`, `prompts/tars-system.prompt.ts`, `prompts/briefing.prompt.ts`, `tars/briefing.ts` | `packages/shared/types/ai.ts`, `polaris-context.service.ts`, `ai.controller.ts`, `ai.routes.ts`, `packages/ai/index.ts` |
| April 15 TARS Sprint 2 + A–C | `assistant.store.ts`, `AssistantPanel.tsx`, `ConversationThread.tsx`, `AssistantMessage.tsx`, `UserMessage.tsx`, `AssistantInput.tsx`, `useAssistant.ts`, `useAssistantActions.tsx`, `ToolConfirmCard.tsx`, `useCommandMatcher.ts` | `App.tsx`, `packages/ai/src/tars/action-types.ts` (QuickReplyChip, help, toggle_theme) |
| April 15 TARS Sprint D–E | — | `ai.controller.ts` (tryDirectQuery, Sprint E intents), `tars/intent-classifier.ts` (QUERY_PATTERNS extended, daily_coach/analyze_week/goal_breakdown intents + patterns) |

---

## TARS Build Status

| Sprint | Description | Status | Completed |
|--------|-------------|--------|-----------|
| Sprint 0 | Provider Foundation | ✅ Complete | April 14, 2026 |
| Sprint 1 | TARS Backend Core | ✅ Complete | April 14, 2026 |
| Sprint 2 | TARS UI Foundation | 🔄 Next | — |
| Sprint 3 | Tool Calls + Confirmation Flow | ⬜ Not Started | — |
| Sprint 4 | Startup Briefing UI | ⬜ Not Started | — |
| Sprint 5 | Avatar + Voice + Polish | ⬜ Not Started | — |
| Sprint 6 | Session Memory + Multi-Turn | ⬜ Not Started | — |

---

## Sprint 0 — Provider Foundation (✅ Complete)

| # | Task | Status |
|---|------|--------|
| 1 | Expand `AIProvider` interface: `chat()` + `chatStream()` + new types | ✅ |
| 2 | Build `gemini.provider.ts` (parse, chat, chatStream, SSE) | ✅ |
| 3 | Upgrade `mock.provider.ts` — chat() + chatStream() | ✅ |
| 4 | Upgrade `ollama.provider.ts` — chat() + chatStream() | ✅ |
| 5 | Upgrade `openai.provider.ts` — chat() + chatStream() | ✅ |
| 6 | Provider factory — add `gemini` case | ✅ |
| 7 | Refactor `breakdown-goal.ts`, `analyze-week.ts`, `daily-coach.ts` → `provider.chat()` | ✅ |
| 8 | Delete `call-provider-text.ts` | ✅ |
| 9 | Create `apps/backend/.env.example` | ✅ |
| 10 | Upgrade `GET /api/ai/config` — provider-agnostic + live health check | ✅ |
| 11 | Upgrade `POST /api/ai/config` — model switching per-provider | ✅ |
| 12 | Settings UI — provider status badges (connected/error/slow/unknown) | ✅ |
| 13 | Settings UI — Gemini model chips (gemma-4-26b, gemini-2.5-flash, etc.) | ✅ |
| 14 | Refactor `analyzeWeekStreamHandler` → `provider.chatStream()` (all providers) | ✅ |

---

## Sprint 1 — TARS Backend Core (✅ Complete)

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 1 | `TARSAction` union type, `ActivityDraft`, `GoalDraft`, `ScreenId` | `tars/action-types.ts` | ✅ |
| 2 | LLM function-calling tool schemas | `tars/tool-schemas.ts` | ✅ |
| 3 | Zod validation for tool call output | `tars/action-validator.ts` | ✅ |
| 4 | Heuristic-first intent classifier | `tars/intent-classifier.ts` | ✅ |
| 5 | TARS persona system prompt | `prompts/tars-system.prompt.ts` | ✅ |
| 6 | Briefing prompt template | `prompts/briefing.prompt.ts` | ✅ |
| 7 | `streamBriefing()` async generator | `tars/briefing.ts` | ✅ |
| 8 | Enrich `PolarisContext` — `lastActivityDaysAgo`, `todayPlanned`, `todayCompleted` | `packages/shared/src/types/ai.ts` | ✅ |
| 9 | Update `assemblePolarisContext()` — query new fields | `polaris-context.service.ts` | ✅ |
| 10 | `POST /api/ai/chat` — route + controller handler | `ai.controller.ts`, `ai.routes.ts` | ✅ |
| 11 | `GET /api/ai/briefing` — SSE handler | `ai.controller.ts`, `ai.routes.ts` | ✅ |
| 12 | Export all TARS types + functions from `packages/ai/src/index.ts` | `index.ts` | ✅ |
| 13 | Typecheck all packages + test verification (94+97) | — | ✅ |

---

## Sprint 2 — TARS UI Foundation (🔄 Next)

Tasks to build (in order — each depends on previous):

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 1 | `assistant.store.ts` — Zustand: panel state, conversation history, tarsState | `stores/assistant.store.ts` | ⬜ |
| 2 | `AssistantPanel.tsx` — right drawer shell (400px desktop, full mobile) | `components/assistant/AssistantPanel.tsx` | ⬜ |
| 3 | `ConversationThread.tsx` — scrollable message history | `components/assistant/ConversationThread.tsx` | ⬜ |
| 4 | `AssistantMessage.tsx` — TARS bubble + typewriter animation | `components/assistant/AssistantMessage.tsx` | ⬜ |
| 5 | `UserMessage.tsx` — user bubble | `components/assistant/UserMessage.tsx` | ⬜ |
| 6 | `AssistantInput.tsx` — text input + mic button | `components/assistant/AssistantInput.tsx` | ⬜ |
| 7 | `useCommandMatcher.ts` — client-side pattern matching (no API call) | `hooks/useCommandMatcher.ts` | ⬜ |
| 8 | `useAssistant.ts` — send message → POST /api/ai/chat → response | `hooks/useAssistant.ts` | ⬜ |
| 9 | Wire keyboard shortcut (`Cmd+/`) to toggle panel | `App.tsx` or `AssistantPanel` | ⬜ |
| 10 | Integrate panel into App.tsx (floating, persistent) | `App.tsx` | ⬜ |

**Done when:** Panel opens, user types a message, real API response displays with typewriter animation.

---

## Phase Completion Summary

| Phase | Status | Completed |
|-------|--------|-----------|
| Phase 0A — Postgres migration | ✅ Complete | Earlier sessions |
| Phase 0B — Dead code cleanup | ✅ Complete | Earlier sessions |
| Phase 0C — AI/input refactor | ✅ Complete | Earlier sessions |
| Phase 1 (partial) — Core loop polish | 🟡 Partial | Tasks 1,2,7,8,9,10 done; 3,4,5,6,11 pending |
| Phase 2A — Focus Sessions | ✅ Complete | April 13, 2026 |
| Phase 2B — Audio Player | ✅ Complete | April 13, 2026 |
| Phase 2C — Daily Coach | ✅ Complete | April 13, 2026 |
| Phase 3 — Depth + Retention | ✅ Complete | April 13, 2026 |
| TARS Sprint 0 — Provider Foundation | ✅ Complete | April 14, 2026 |
| TARS Sprint 1 — Backend Core | ✅ Complete | April 14, 2026 |
| TARS Sprint 2 — UI Foundation | 🔄 Next | — |

---

## Phase 3 Completed Tasks

| # | Task | Implementation |
|---|------|---------------|
| 1 | Weekly Review screen | `WeeklyReview.tsx` — stats grid, AI panel, dormant goals |
| 2 | AI weekly analysis streaming | `GET /api/ai/analyze-week/stream` SSE + `useWeeklyAnalysisStream` hook |
| 3 | Goal dormancy detection | `dormancy.service.ts` + `GET /api/goals/dormant` + `useDormantGoals` |
| 4 | Smart "add to today" from dormant | `useAddDormantToToday` mutation + DormantGoalCard |
| 5 | Daily Intentions | `IntentionsPanel.tsx` + `useIntentions` (localStorage-scoped by day) |
| 6 | Activity tagging | `tags: string[]` on Activity (Prisma JSON col) + LogActivityForm chips + History filter |
| 7 | Settings page completion | Appearance toggle, Audio prefs (volume + stream preset), NLP threshold slider |
| 8 | Onboarding flow | `OnboardingModal.tsx` — 3-step: welcome → first goal → first activity |

---

## Phase 1 Skipped Tasks (to revisit post-TARS)

| # | Task | Why skipped |
|---|------|-------------|
| 3 | Activity templates | Low urgency, deferred |
| 4 | LogActivityForm cleanup | UX polish, deferred |
| 5 | GoalConstellation data-driven | Nice-to-have, deferred |
| 6 | ProgressBar animations | Polish, deferred |
| 11 | React Router cleanup | Tech debt, deferred |

---

## Key localStorage Keys (documented to avoid collisions)

| Key | Purpose |
|-----|---------|
| `polaris:theme` | `'dark' \| 'light'` |
| `polaris:auth` | `'true' \| 'false'` |
| `polaris:audio` | Zustand audio player state (stream + volume) |
| `polaris:daily-coach:YYYY-MM-DD` | Cached DailyCoachResponse for that day |
| `polaris:banner-dismissed:YYYY-MM-DD` | Whether morning banner was dismissed that day |
| `polaris:ai-threshold` | NLP parse confidence threshold (0–1, default 0.85) |
| `polaris:onboarded` | `'1'` once user completes onboarding — never show again |
| `polaris:intentions:YYYY-MM-DD` | Daily intention strings for that date |
| `polaris:briefing:YYYY-MM-DD` | Whether briefing was shown today (prevents duplicate SSE calls) |

---

## Environment Status

```
Backend:   Node.js + Fastify + Prisma + PostgreSQL
Frontend:  React 19 + Vite + TanStack Query v5 + Tailwind v4
AI:        AI_PROVIDER=gemini (default), GEMINI_MODEL=gemma-4-26b-a4b-it (1,500 RPD)
           AI_PROVIDER=ollama also supported (OLLAMA_MODEL=gemma4:e4b)
Build:     All 4 packages typecheck clean (April 14, 2026)
Tests:     94 backend + 97 frontend passing
```

---

## Active Decisions

| Decision | Reason | Date |
|----------|--------|------|
| `tags` stored as JSON string in Prisma (not `String[]`) | PostgreSQL native array requires migration; JSON string works cross-DB | April 13, 2026 |
| Intentions are localStorage-only (not DB-backed) | Phase 3 scope — lightweight, can migrate to DB later | April 13, 2026 |
| Onboarding detection: 0 goals AND 0 activities | Most reliable proxy for "new user" without auth | April 13, 2026 |
| Gemini as primary AI provider (not Ollama) | Ollama latency 72-278s measured in logs — unusable for chat UX | April 14, 2026 |
| Default model: `gemma-4-26b-a4b-it` (not gemini-2.5-flash) | 1,500 RPD free tier vs 20 RPD — sustainable for dev sessions | April 14, 2026 |
| Context assembled server-side only | Security: never trust client-sent context — could be stale/manipulated | April 14, 2026 |
| Command matcher runs client-side (no API call) | Fixed commands (play/navigate) don't need LLM — saves quota + latency | April 14, 2026 |

---

## Known Issues

| Issue | Severity | Workaround | Fix In |
|-------|----------|------------|--------|
| Hub quick-log doesn't expose tags field | Low | Use LogActivityForm (full modal) to add tags | Post-TARS |
| Audio streams (Zeno.fm) paid/broken | Medium | Deferred | Future pass |

---

## File Change Log

| Session | Files Created | Files Modified |
|---------|---------------|----------------|
| April 13 Phase 3 | `WeeklyReview.tsx`, `OnboardingModal.tsx`, `IntentionsPanel.tsx`, `dormancy.service.ts`, `useDormantGoals.ts`, `useWeeklyAnalysisStream.ts`, `useIntentions.ts` | `App.tsx`, `Hub.tsx`, `GoalMatrix.tsx`, `History.tsx`, `Settings.tsx`, `activity.service.ts`, `ai.controller.ts` |
| April 14 TARS Sprint 0 | `gemini.provider.ts`, `.env.example` | `types.ts` (AIProvider), `ollama.provider.ts`, `openai.provider.ts`, `mock.provider.ts`, `providers/index.ts`, `daily-coach.ts`, `breakdown-goal.ts`, `analyze-week.ts`, `ai.controller.ts`, `useAiConfig.ts`, `Settings.tsx` |
| April 14 TARS Sprint 1 | `tars/action-types.ts`, `tars/tool-schemas.ts`, `tars/action-validator.ts`, `tars/intent-classifier.ts`, `prompts/tars-system.prompt.ts`, `prompts/briefing.prompt.ts`, `tars/briefing.ts` | `packages/shared/types/ai.ts`, `polaris-context.service.ts`, `ai.controller.ts`, `ai.routes.ts`, `packages/ai/index.ts`, `ai.service.test.ts` |

---

## Phase Completion Summary

| Phase | Status | Completed |
|-------|--------|-----------|
| Phase 0A — Postgres migration | ✅ Complete | Earlier sessions |
| Phase 0B — Dead code cleanup | ✅ Complete | Earlier sessions |
| Phase 0C — AI/input refactor | ✅ Complete | Earlier sessions |
| Phase 1 (partial) — Core loop polish | 🟡 Partial | Tasks 1,2,7,8,9,10 done; 3,4,5,6,11 pending |
| Phase 2A — Focus Sessions | ✅ Complete | April 13, 2026 |
| Phase 2B — Audio Player | ✅ Complete | April 13, 2026 |
| Phase 2C — Daily Coach | ✅ Complete | April 13, 2026 |
| Phase 3 — Depth + Retention | ✅ Complete | April 13, 2026 |

---

## Phase 3 Completed Tasks

| # | Task | Implementation |
|---|------|---------------|
| 1 | Weekly Review screen | `WeeklyReview.tsx` — stats grid, AI panel, dormant goals |
| 2 | AI weekly analysis streaming | `GET /api/ai/analyze-week/stream` SSE + `useWeeklyAnalysisStream` hook |
| 3 | Goal dormancy detection | `dormancy.service.ts` + `GET /api/goals/dormant` + `useDormantGoals` |
| 4 | Smart "add to today" from dormant | `useAddDormantToToday` mutation + DormantGoalCard |
| 5 | Daily Intentions | `IntentionsPanel.tsx` + `useIntentions` (localStorage-scoped by day) |
| 6 | Activity tagging | `tags: string[]` on Activity (Prisma JSON col) + LogActivityForm chips + History filter |
| 7 | Settings page completion | Appearance toggle, Audio prefs (volume + stream preset), NLP threshold slider |
| 8 | Onboarding flow | `OnboardingModal.tsx` — 3-step: welcome → first goal → first activity |

---

## Phase 1 Skipped Tasks (to revisit)

| # | Task | Why skipped |
|---|------|-------------|
| 3 | Activity templates | Low urgency, deferred to Phase 3 |
| 4 | LogActivityForm cleanup | UX polish, deferred |
| 5 | GoalConstellation data-driven | Nice-to-have, deferred |
| 6 | ProgressBar animations | Polish, deferred |
| 11 | React Router cleanup | Tech debt, deferred |

---

## Key localStorage Keys (documented to avoid collisions)

| Key | Purpose |
|-----|---------|
| `polaris:theme` | `'dark' \| 'light'` |
| `polaris:auth` | `'true' \| 'false'` |
| `polaris:audio` | Zustand audio player state (stream + volume) |
| `polaris:daily-coach:YYYY-MM-DD` | Cached DailyCoachResponse for that day |
| `polaris:banner-dismissed:YYYY-MM-DD` | Whether morning banner was dismissed that day |
| `polaris:ai-threshold` | NLP parse confidence threshold (0–1, default 0.85) |
| `polaris:onboarded` | `'1'` once user completes onboarding — never show again |
| `polaris:intentions:YYYY-MM-DD` | Daily intention strings for that date |

---

## Environment Status

```
Backend:   Node.js + Fastify + Prisma + PostgreSQL
Frontend:  React 19 + Vite + TanStack Query v5 + Tailwind v4
AI Model:  gemma4:e4b (Ollama) — configured via AI_PROVIDER + OLLAMA_MODEL env
Build:     Both apps compile clean (April 13, 2026)
```

---

## Next Session Should

1. Start **Phase 4** (Auth + multi-user) — `userId` columns already in schema, just nullable
2. Or revisit **Phase 1 skipped tasks** — Activity templates + GoalConstellation data-driven are highest UX impact
3. Consider wiring the **PulseWave background into FocusMode** (Phase 2A task 7, still pending)

---

## Active Decisions

Decisions made during implementation that deviate from docs or add clarity:

| Decision | Reason | Date |
|----------|--------|------|
| `tags` stored as JSON string in Prisma (not `String[]`) | PostgreSQL native array requires migration; JSON string works cross-DB and Prisma parses it at service layer | April 13, 2026 |
| Intentions are localStorage-only (not DB-backed) | Phase 3 scope — keep lightweight, can migrate to DB in Phase 4 | April 13, 2026 |
| Onboarding detection: 0 goals AND 0 activities | Most reliable proxy for "new user" without auth | April 13, 2026 |
| SSE headers now written AFTER metrics fetch | Ensures HTTP errors can propagate if data fetch fails before stream starts | April 13, 2026 |

---

## Known Issues

| Issue | Severity | Workaround | Fix In |
|-------|----------|------------|--------|
| Hub quick-log doesn't expose tags field | Low | Use LogActivityForm (full modal) to add tags | Phase 4 |

---

## File Change Log

| Session | Files Created | Files Modified |
|---------|---------------|----------------|
| April 13 Phase 3 | `WeeklyReview.tsx`, `OnboardingModal.tsx`, `IntentionsPanel.tsx`, `dormancy.service.ts`, `useDormantGoals.ts`, `useWeeklyAnalysisStream.ts`, `useIntentions.ts` | `App.tsx`, `Hub.tsx`, `GoalMatrix.tsx`, `History.tsx`, `Settings.tsx`, `activity.service.ts`, `activity.controller.ts`, `activities.ts (routes)`, `ai.controller.ts`, `goals.ts (routes)`, shared `activity.ts` types |


| # | Task | Why skipped |
|---|------|-------------|
| 3 | Activity templates | Low urgency, deferred to Phase 3 |
| 4 | LogActivityForm cleanup | UX polish, deferred |
| 5 | GoalConstellation data-driven | Nice-to-have, deferred |
| 6 | ProgressBar animations | Polish, deferred |
| 11 | React Router cleanup | Tech debt, deferred |

---

## Key localStorage Keys (documented to avoid collisions)

| Key | Purpose |
|-----|---------|
| `polaris:theme` | `'dark' \| 'light'` |
| `polaris:auth` | `'true' \| 'false'` |
| `polaris:audio` | Zustand audio player state (stream + volume) |
| `polaris:daily-coach:YYYY-MM-DD` | Cached DailyCoachResponse for that day |
| `polaris:banner-dismissed:YYYY-MM-DD` | Whether morning banner was dismissed that day |

---

## Environment Status

```
Backend:   Node.js + Fastify + Prisma + PostgreSQL
Frontend:  React 19 + Vite + TanStack Query v5 + Tailwind v4
AI Model:  gemma4:e4b (Ollama) — configured via AI_PROVIDER + OLLAMA_MODEL env
Build:     Both apps compile clean (April 13, 2026)
```

---

## Next Session Should

1. Start **Phase 3** — next logical task is Weekly Review screen (dedicated screen, not a card)
2. Or revisit **Phase 1 skipped tasks** — Activity templates + GoalConstellation are the highest UX impact
3. Consider wiring the **PulseWave background into FocusMode** (Phase 2A task 7, still pending)
```

---

## Active Decisions

Decisions made during implementation that deviate from docs or add clarity:

| Decision | Reason | Date |
|----------|--------|------|
| [Example: Using pnpm instead of npm] | [Faster, better monorepo support] | [Date] |

---

## Known Issues

| Issue | Severity | Workaround | Fix In |
|-------|----------|------------|--------|
| [None currently] | - | - | - |

---

## File Change Log

Recent files created/modified (helps track what changed):

| Session | Files Created | Files Modified |
|---------|---------------|----------------|
| [Session 1] | [list] | [list] |

---

## How to Use This File

1. **Start of session:** Read this file to understand current state
2. **During session:** Note important decisions
3. **End of session:** Update all sections, especially:
   - Current Progress
   - Session Log (add new entry)
   - Active Decisions (if any)
   - File Change Log

This file is the **memory** between AI sessions. Keep it updated!
