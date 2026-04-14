# Plan: TARS Assistant Overhaul

## TL;DR
Fix conversation memory (multi-turn), fix intent classification for follow-ups, fix thinking leakage via API config, fix tool routing for confirmations, make TARS a draggable floating window, dual-theme styling (clean light / sci-fi dark), proper chatbot UX (stop, retry, clear, logging).

---

## Phase 1: Conversation Memory + Intent-Aware Follow-Ups — *Critical fix*

**Root cause of "I don't have context for 'yes'"**: Two compounding problems:
1. No conversation history sent to LLM — only `[system, user]` per request
2. Intent classification is stateless — `classifyIntent("yes")` → `chat` → no tools provided → LLM *cannot* call `log_activity` even if it understood the context

### Steps

1. **Backend: Accept conversation history + pending action context**
   - File: `apps/backend/src/controllers/ai.controller.ts`
   - Change `ChatBody` to: `{ message: string; history?: Array<{ role: 'user' | 'assistant'; content: string }>; pendingActionType?: string }`
   - Build LLM messages as: `[system, ...history.slice(-20), { role: 'user', content: message }]`
   - Cap history at 20 messages server-side

2. **Fix intent classification for follow-up messages**
   - File: `packages/ai/src/tars/intent-classifier.ts`
   - Add `classifyIntent(input, options?: { hasPendingAction?: string; history?: ChatMessage[] })`
   - When `hasPendingAction` is set and input is a short confirmation word ("yes", "yeah", "sure", "do it", "confirm", "go ahead", "no", "cancel", "nevermind"), return the pending action's intent type with high confidence
   - This ensures tools are included when the user is confirming/denying a proposed action
   - Also scan recent history: if the last assistant message proposed an action and user replies affirmatively, treat as confirmation

3. **Frontend: Send history + pending action type with each message**
   - File: `apps/frontend/src/hooks/useAssistant.ts`
   - Read `messages` from Zustand store, map to `{ role, content }` (strip id/timestamp/action)
   - Read `pendingAction` type from store
   - Send: `{ message: trimmed, history: last20, pendingActionType: pendingAction?.type ?? undefined }`

4. **No provider changes needed** — Gemini and Ollama `chat()` already accept `ChatMessage[]`

---

## Phase 2: Fix Thinking Leakage (Plain Text Reasoning)

**Problem**: gemma-4-26b-a4b-it outputs its chain-of-thought as visible plain text. This is NOT `<think>` tags — it's the model's thinking output that Gemini exposes directly.

### Steps

5. **Add `thinkingConfig` to suppress reasoning in Gemini API requests**
   - File: `packages/ai/src/providers/gemini.provider.ts`
   - In `chat()` method, when building request body, add to `generationConfig`:
     ```
     thinkingConfig: { thinkingBudget: 0 }
     ```
   - This is the correct Gemini API approach — tells the model to not generate thinking tokens
   - Apply to `chatStream()` as well
   - Keep existing `<think>` regex as safety net for edge cases

6. **Strengthen TARS system prompt**
   - File: `packages/ai/src/prompts/tars-system.prompt.ts`
   - Add explicit instruction: "Never output your reasoning process, internal deliberation, step-by-step analysis, or chain of thought. Never show lines like 'The user says...' or 'I should...'. Output ONLY your final response to the user."
   - Already partially done in previous iteration — needs reinforcement specifically against the plain-text reasoning pattern seen

---

## Phase 3: Prompt & Response Quality Improvements

### Steps

7. **Improve tool descriptions for clearer LLM behavior**
   - File: `packages/ai/src/tars/tool-schemas.ts`
   - `log_activity` description: add "When the user confirms a previously proposed activity (e.g. says 'yes'), use the details from your prior message."
   - `plan_activity` description: add "For future activities. When user says 'yeah I'll do X tomorrow', plan it with the details given."
   - This helps the LLM understand it should reference conversation history for confirmations

8. **Add fallback text when tool call validation fails**
   - File: `apps/backend/src/controllers/ai.controller.ts`
   - Currently: validation failure silently falls through to text-only response
   - Add: if `!validated.ok`, log the reason and include `result.text` with a note like "(I tried to [action] but couldn't parse the details. Could you rephrase?)"
   - This prevents dead-end responses where the LLM tried to act but validation ate the response

9. **Review maxTokens budget**
   - Current: `maxTokens: 400` for all chat responses
   - This is fine for terse TARS responses but may truncate longer tool call JSON
   - Increase to `maxTokens: 600` when tools are included (tool calls need room for JSON args)

---

## Phase 4: Chatbot UX Essentials

### Steps

10. **Stop/cancel button** — abort in-flight requests
    - File: `apps/frontend/src/hooks/useAssistant.ts`
    - Store an `AbortController` ref; pass its `signal` to `fetch()`
    - Expose `cancelRequest()` from the hook
    - File: `apps/frontend/src/components/assistant/AssistantInput.tsx`
    - When `tarsState === 'processing'`, show a stop button (square icon) instead of send

11. **Retry failed messages**
    - File: `apps/frontend/src/components/assistant/AssistantMessage.tsx`
    - On error messages, show a "Retry" button
    - Clicking it calls `sendMessage()` with the previous user message

12. **Clear conversation button**
    - File: `apps/frontend/src/components/assistant/AssistantPanel.tsx`
    - Add a "Clear" icon in header (next to close)
    - Calls `clearHistory()` from the Zustand store + clears `pendingAction`

13. **TARS-specific logging** (separate from HTTP logs)
    - File: `apps/backend/src/controllers/ai.controller.ts`
    - After successful response: `request.log.info({ intent, provider, latencyMs }, '[TARS] chat')`
    - On error: `request.log.error({ err, userMessage: message.slice(0,100) }, '[TARS] chat failed')`

---

## Phase 5: Draggable Floating Window

### Steps

14. **Refactor AssistantPanel from fixed sidebar to floating window**
    - File: `apps/frontend/src/components/assistant/AssistantPanel.tsx`
    - Default position: bottom-right, ~380×520px
    - Drag via `onPointerDown` on header bar, track `{ x, y }` in state
    - Store position in Zustand (session-only, persists across open/close within session)
    - Mobile (< 768px): keep full-screen overlay (no drag)

15. **Minimize behavior**
    - Close button → back to FAB (existing)
    - FAB: bottom-right floating button with unread badge

---

## Phase 6: Dual-Theme Styling

### Steps

16. **Light theme: Clean professional**
    - Keep current indigo/slate palette
    - Polish with UI_Upgrade_code CSS tokens (proper spacing, font weights)

17. **Dark theme: Sci-fi aesthetic**
    - TARS bubbles: subtle cyan glow (`border-cyan-500/20`, `shadow-[0_0_8px_rgba(34,211,238,0.1)]`)
    - Deeper backgrounds (`bg-[#060a14]` panels)
    - Input: terminal-feel with subtle monospace hint for TARS responses
    - Avatar: cyan accent in dark mode
    - Reference TARS reference build but toned down (no CRT)

---

## Relevant Files

- `apps/backend/src/controllers/ai.controller.ts` — chat handler: history, tools, logging
- `apps/frontend/src/hooks/useAssistant.ts` — send history, abort, retry
- `apps/frontend/src/stores/assistant.store.ts` — panel position, window state
- `apps/frontend/src/components/assistant/AssistantPanel.tsx` — floating, drag, header
- `apps/frontend/src/components/assistant/AssistantInput.tsx` — stop button
- `apps/frontend/src/components/assistant/AssistantMessage.tsx` — retry on error
- `packages/ai/src/providers/gemini.provider.ts` — thinkingConfig
- `packages/ai/src/prompts/tars-system.prompt.ts` — anti-reasoning reinforcement
- `packages/ai/src/tars/intent-classifier.ts` — follow-up/confirmation awareness
- `packages/ai/src/tars/tool-schemas.ts` — improved tool descriptions

---

## Verification

1. "log 1 hour study" → TARS proposes → "yes" → TARS executes (multi-turn + intent fix)
2. "hi" → clean response, no thinking dump (thinkingBudget: 0)
3. "can you add a task for tomorrow to study for 1 hour" → plans it → "yes update" → TARS understands confirmation
4. Stop button cancels in-flight request
5. Error → retry button resends previous message
6. Drag window around screen
7. Dark: sci-fi cyan | Light: clean professional
8. Backend logs: `[TARS] chat | intent=log_activity provider=gemini latencyMs=2100`

---

## Decisions

- **20-message history cap** — trimmed server-side, prevents token abuse
- **No persistence** — privacy-first, cleared on refresh/close
- **`thinkingBudget: 0`** — correct API-level suppression for gemma-4
- **Confirmation-aware intent** — "yes" with pending action → re-routes to action intent with tools
- **`maxTokens: 600`** when tools are included (up from 400) — prevents truncated tool call JSON
- **No new dependencies** — drag via pointer events, no react-dnd
- **Streaming chat deferred** — non-streaming works, add later

## Further Considerations

1. **Keyboard shortcut** (Ctrl+T or Cmd+K) to toggle TARS — user mentioned wanting voice/key activation. Quick add in Phase 4.
2. **Streaming responses** — would make TARS feel more responsive especially on slow models. Defer to follow-up work.
