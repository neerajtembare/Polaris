# Polaris — TARS Agent Architecture
> **Version:** 2.0 | **April 14, 2026**  
> **Scope:** AI Assistant system — providers, actions, context, UI, voice  
> **Status:** Foundation restructure complete. Sprint 0 next.

---

## Table of Contents

1. [Vision & Philosophy](#1-vision--philosophy)
2. [Architecture Overview](#2-architecture-overview)
3. [Provider Architecture (Multi-LLM)](#3-provider-architecture-multi-llm)
4. [Action Registry Pattern](#4-action-registry-pattern)
5. [Intent Routing & Dispatch](#5-intent-routing--dispatch)
6. [Context & Memory Strategy](#6-context--memory-strategy)
7. [File Structure](#7-file-structure)
8. [Backend — Endpoints](#8-backend--endpoints)
9. [Frontend — Component Architecture](#9-frontend--component-architecture)
10. [Voice Strategy](#10-voice-strategy)
11. [Three.js Avatar](#11-threejs-avatar)
12. [Build Order (Revised)](#12-build-order-revised)
13. [Critical Gotchas](#13-critical-gotchas)
14. [Architecture Decisions Log](#14-architecture-decisions-log)

---

## 1. Vision & Philosophy

### What TARS Is

TARS is a **conversational productivity assistant** embedded in Polaris. It is:

- A **floating UI entity** (Three.js) that lives in the corner, always accessible
- A **voice-activated or text-activated** assistant
- A **context-aware briefer** that greets you on startup
- A **command executor** for fast, unambiguous actions
- A **conversational partner** for planning, querying, and analysis
- A **human-in-the-loop confirmer** for all data writes

TARS is NOT:
- An autonomous agent that acts without you knowing
- A replacement for the manual UI (the app must still work without TARS)
- A general-purpose chatbot (it knows only your Polaris data)

### The Interaction Model

```
User speaks/types
       │
       ▼
┌─────────────────────────────────┐
│  Command Matcher (client-side)  │  ← Is this a fixed command?
│  (pattern match, no LLM)        │    play music, stop, navigate
└────────────┬────────────────────┘
             │ No match
             ▼
┌─────────────────────────────────┐
│  POST /api/ai/chat              │
│  Backend receives raw message   │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Intent Router (heuristic-first)│  ← Keyword match 80% of cases
│  Falls back to LLM classify     │    log | goal | query | chat
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  LLM Call (with tools)          │  ← Gemini / Ollama / Groq
│  + PolarisContext injected      │    Function calling for writes
│  + TARS persona system prompt   │    Text response for reads
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Action Executor                │
│  Tool call → TARSAction type    │
│  Read ops → respond immediately │
│  Write ops → confirm card first │
└────────────┬────────────────────┘
             │
             ▼
     Result back to TARS UI
     (text + typewriter effect)
```

### The Confirmation Rule (Non-Negotiable)

| Action Type | Behavior |
|-------------|----------|
| Read (show goals, get streak, metrics) | Execute immediately, display result |
| Navigation (go to Goals screen) | Execute immediately |
| Audio (play/stop/change stream) | Execute immediately |
| Write — high confidence (log 30 pages of X) | Show confirmation card with 5s auto-accept + undo |
| Write — ambiguous (log something) | Show confirmation card, user must tap Accept |
| Delete anything | Always confirm, no auto-accept |
| Create goal | Always confirm, user can edit before saving |

---

## 2. Architecture Overview

### v1.0 → v2.0 Changes

The original doc proposed 6 specialized "Agent" classes (CommandAgent, BriefingAgent,
ActivityAgent, GoalsAgent, QueryAgent, DispatcherAgent). After codebase analysis,
this was simplified:

| v1.0 | v2.0 | Reason |
|------|------|--------|
| 6 Agent classes | 3 functions + 1 LLM call | Agents were just prompt templates with `if/else` routing. Classes added indirection without value. |
| `AIProvider` with only `parse()` | `AIProvider` with `chat()` + `chatStream()` + `parse()` | TARS needs conversational + streaming + function-calling. One interface, all providers implement it. |
| `callProviderText()` as 2nd LLM path | Eliminated — all calls route through provider | Two code paths = two places to add Gemini, two places to fix bugs. |
| Groq as testing provider | **Gemini as primary cloud** (Groq as future option) | Gemini API key already works. Function calling, streaming, multi-turn all verified. |
| Streaming hardcoded in controller (Ollama-only) | Streaming abstracted in provider interface | Each provider implements `chatStream()` → returns `AsyncIterable<string>` |
| Agent "tools" = Gemma function calling | **Action Registry** = typed union `TARSAction` | TARS understands input → maps to typed action → calls existing API hooks. No new CRUD layer. |

### System Diagram

```
┌──────────────────────────────────────────────────────────────┐
│  FRONTEND                                                     │
│                                                               │
│  ┌──────────────┐    ┌─────────────────────────────────┐    │
│  │ TARSAvatar   │    │ AssistantPanel                  │    │
│  │ (Three.js)   │◄──►│  ConversationThread             │    │
│  │ corner orb   │    │  AssistantInput (text+voice)    │    │
│  └──────────────┘    │  ToolConfirmCard                │    │
│                      └──────────────┬──────────────────┘    │
│                                     │                        │
│  ┌──────────────────────────────────▼──────────────────┐    │
│  │ useAssistant hook                                    │    │
│  │  - command matcher (client-side, no API call)       │    │
│  │  - sends non-command messages to backend            │    │
│  │  - handles TARSAction execution on frontend         │    │
│  │  - manages conversation history (Zustand)           │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────┬────────────────────────────┘
                                  │ HTTP / SSE
┌─────────────────────────────────▼────────────────────────────┐
│  BACKEND                                                      │
│                                                               │
│  POST /api/ai/chat          ← main conversational endpoint   │
│  GET  /api/ai/briefing      ← startup briefing (SSE)         │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Flow: chat request                                  │     │
│  │  1. Assemble PolarisContext from DB                │     │
│  │  2. classifyIntent() — heuristic first, LLM fallback│     │
│  │  3. Build system prompt (TARS persona + context)   │     │
│  │  4. provider.chat() with tool schemas if write intent│     │
│  │  5. If tool_call → wrap as TARSAction → return     │     │
│  │  6. If text → return response string               │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Provider Layer (packages/ai/src/providers/)         │     │
│  │  gemini.provider.ts  ← PRIMARY (cloud, fast)       │     │
│  │  ollama.provider.ts  ← LOCAL (Gemma 4 e4b)         │     │
│  │  openai.provider.ts  ← EXISTING (GPT-4o-mini)      │     │
│  │  mock.provider.ts    ← TESTING                      │     │
│  │  (groq.provider.ts)  ← FUTURE                      │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

### What Runs When

| Event | Trigger | Path | LLM? |
|-------|---------|------|------|
| App opens (first daily) | Auto, 1x/day | GET /briefing → provider.chatStream() | Yes, streamed |
| Fixed command detected | Pattern match on client | CommandMatcher → action executor | No |
| "log 30 pages" (high confidence) | SmartInputBar NLP | Existing parse endpoint → ActivityAgent | Maybe |
| "log 30 pages" (via TARS) | Chat panel | POST /chat → provider.chat() with tools  | Yes |
| "how am I doing?" | Chat panel | POST /chat → provider.chat() (no tools) | Yes |
| Activity confirmed | User taps Accept | Existing POST /activities endpoint | No |

---

## 3. Provider Architecture (Multi-LLM)

### The Problem with v1.0

The existing `AIProvider` interface has only one method:

```typescript
interface AIProvider {
  readonly name: string;
  parse(rawInput: string, goals: GoalContext[]): Promise<AIActivityParse>;
}
```

This is too narrow. TARS needs:
- **Chat** — multi-turn conversation with system prompt + tool schemas
- **Streaming** — SSE for briefings and long responses
- **Function calling** — LLM returns structured tool calls, not just text

Additionally, `callProviderText()` in `utils/` is a second, independent LLM calling
path that duplicates provider selection logic. Every new provider must be added in
two places. This gets eliminated.

### Expanded AIProvider Interface

```typescript
/** Message in a conversation */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Tool/function schema for LLM function calling */
interface ToolSchema {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** Structured tool call returned by the LLM */
interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

/** Result of a chat() call */
interface ChatResult {
  text: string | null;
  toolCall: ToolCall | null;
  provider: string;
  latencyMs: number;
}

/** All AI providers implement this */
interface AIProvider {
  readonly name: string;

  /** Existing — parse a natural-language activity description */
  parse(rawInput: string, goals: GoalContext[]): Promise<AIActivityParse>;

  /** Chat — send messages, optionally with tool schemas, get response */
  chat(
    messages: ChatMessage[],
    options?: { tools?: ToolSchema[]; temperature?: number; maxTokens?: number }
  ): Promise<ChatResult>;

  /** Stream — same as chat() but yields text chunks for typewriter effect */
  chatStream(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number }
  ): AsyncIterable<string>;
}
```

### Provider Inventory

| Provider | Status | Use Case | Speed | Limits (free tier) |
|----------|--------|----------|-------|--------------------|
| **Gemini** (`gemini.provider.ts`) | **BUILD NOW** | Primary cloud provider. Function calling + streaming verified. | ~1-3s | See model ladder below |
| **Ollama** (`ollama.provider.ts`) | **UPGRADE** | Local inference with Gemma 4 e4b. Add `chat()` + `chatStream()`. | 72-278s | Unlimited (local) |
| **OpenAI** (`openai.provider.ts`) | **UPGRADE** | Existing. Add `chat()` + `chatStream()`. | ~2-5s | Paid |
| **Mock** (`mock.provider.ts`) | **UPGRADE** | Unit tests. Return canned responses. | instant | N/A |
| **Groq** (`groq.provider.ts`) | **FUTURE** | Free tier, llama-3.3-70b. OpenAI-compatible API. | ~0.5-1s | TBD |

### Ollama Latency Reality Check (from ai-logs)

Measured latency from actual Polaris usage (April 2026, Gemma 4 e4b local):

| Operation | Range | Notes |
|-----------|-------|-------|
| parse-activity | 125–278s | Successful calls |
| AnalyzeWeek | 72–192s | Successful calls |
| Timeouts | 300s (×5) | TCP-level timeout, fetch failed |

**Verdict:** Ollama is unusable for TARS chat. A 2-5 minute wait per response
kills any conversational flow. Ollama stays as an offline fallback (batch
operations like weekly analysis where latency is tolerable), but Gemini is
the primary provider for all interactive/chat features.

### Gemini Model Ladder (Free Tier Rate Limits)

| Model | RPM | RPD | TPM | Function Calling | Use For |
|-------|-----|-----|-----|-----------------|----------|
| `gemma-4-26b-a4b-it` | 15 | **1,500** | Unlimited | ✅ Verified | **Default — daily dev** |
| `gemini-3.1-flash-lite-preview` | 15 | **500** | 250K | ✅ Expected | High-volume when stable |
| `gemini-2.5-flash` | 5 | **20** | 250K | ✅ Verified | Quality testing only |
| `gemini-3-flash-preview` | 5 | **20** | 250K | ✅ Verified | Quality testing only |
| `gemini-2.5-pro` | 0 | **0** | 0 | N/A | Not available free tier |

**Default model: `gemma-4-26b-a4b-it`** — 1,500 RPD is enough for full
development sessions. Same Gemma 4 architecture as local Ollama but cloud-hosted
and fast (~2-5s). Swap to `gemini-2.5-flash` via env var when you need
higher-quality reasoning (but watch the 20 RPD limit).

### Gemini Provider — Implementation Details

**Verified capabilities (April 14, 2026):**
- ✅ Basic generation (`generateContent`)
- ✅ Function calling (`tools[].functionDeclarations` → returns `functionCall` object)
- ✅ SSE streaming (`streamGenerateContent?alt=sse`)
- ✅ Multi-turn chat (`contents[]` with `role: user/model`)
- ✅ System instructions (`systemInstruction.parts[].text`)
- ✅ Available models: `gemini-2.5-flash` (fast), `gemini-2.5-pro` (powerful), `gemini-3-flash-preview`

**Recommended models (see Model Ladder below for rate limits):**
- **Default (dev):** `gemma-4-26b-a4b-it` — 1,500 RPD, function calling verified
- **Quality testing:** `gemini-2.5-flash` — best reasoning, but only 20 RPD
- **High volume (when stable):** `gemini-3.1-flash-lite-preview` — 500 RPD

**API shape:**
```typescript
// Non-streaming
POST /v1beta/models/{model}:generateContent?key={key}
{
  contents: [{ role: 'user', parts: [{ text: '...' }] }],
  systemInstruction: { parts: [{ text: '...' }] },
  tools: [{ functionDeclarations: [...] }]  // optional
}

// Streaming (SSE)
POST /v1beta/models/{model}:streamGenerateContent?alt=sse&key={key}
// Same body, returns `data: {...}\n\n` frames
```

**Key mapping:**
```
OpenAI/Ollama         Gemini
─────────────         ──────
messages[]            contents[]
role: 'assistant'     role: 'model'
system message        systemInstruction (separate field)
functions/tools       tools[].functionDeclarations
tool_calls            candidates[].content.parts[].functionCall
```

**Environment variables:**
```bash
AI_PROVIDER=gemini                # activate Gemini provider
GEMINI_API_KEY=AIzaSy...          # API key (required)
GEMINI_MODEL=gemma-4-26b-a4b-it  # model (default — 1,500 RPD)
```

**Just-works setup:** Set `AI_PROVIDER=gemini` and `GEMINI_API_KEY=<key>` in
your `.env`. That's it. The default model (`gemma-4-26b-a4b-it`) has 1,500 RPD
and function calling — no other configuration needed.

### Provider Factory Update

```typescript
// packages/ai/src/providers/index.ts
export function getProvider(): AIProvider {
  const name = process.env['AI_PROVIDER'] ?? 'mock';
  switch (name) {
    case 'gemini':  return new GeminiProvider();
    case 'ollama':  return new OllamaProvider();
    case 'openai':  return new OpenAIProvider();
    default:        return new MockProvider();
  }
}
```

### callProviderText Elimination Plan

`callProviderText()` currently has its own provider routing (`if openai... if ollama...`).
After the interface upgrade:

```typescript
// BEFORE (two LLM paths)
const text = await callProviderText({ systemPrompt, userPrompt, ... });

// AFTER (one path through provider)
const result = await provider.chat([
  { role: 'system', content: systemPrompt },
  { role: 'user', content: userPrompt },
], { temperature, maxTokens });
const text = result.text;
```

Files that use `callProviderText()`:
- `features/breakdown-goal.ts` → use `provider.chat()`
- `features/analyze-week.ts` → use `provider.chat()`
- `features/daily-coach.ts` → use `provider.chat()`

This refactor happens in Sprint 0 alongside the Gemini provider build.

---

## 4. Action Registry Pattern

### Why Not "Agent Tools"

The v1.0 doc defined 6 Gemma function-calling tools (log_activity, plan_activity,
create_goal_draft, etc.) that would create NEW CRUD operations. This is wrong.
The app already has working API endpoints for all of these. TARS should not
build a parallel data access layer.

Instead: **TARS understands input → maps to a typed `TARSAction` → the frontend
executes the action using existing hooks/API calls.**

### The TARSAction Union Type

This is the bridge between "LLM understood what you want" and "the app does it."

```typescript
/** All possible actions TARS can trigger */
type TARSAction =
  // Navigation
  | { type: 'navigate'; screen: ScreenId }

  // Audio
  | { type: 'audio.play'; streamId?: string }
  | { type: 'audio.stop' }
  | { type: 'audio.next' }

  // Focus session
  | { type: 'focus.start'; goalId?: string }
  | { type: 'focus.stop' }

  // Activity (requires confirmation)
  | { type: 'log_activity'; draft: ActivityDraft }
  | { type: 'plan_activity'; draft: ActivityDraft }

  // Goal (always requires confirmation)
  | { type: 'create_goal'; draft: GoalDraft }

  // Pure display (no mutation)
  | { type: 'show_goals' }
  | { type: 'show_streak' }

interface ActivityDraft {
  title: string;
  activityType: 'quantity' | 'duration' | 'completion';
  value?: number;
  unit?: string;
  goalId?: string;
  goalTitle?: string;
  date?: string;
}

interface GoalDraft {
  title: string;
  timeframe: 'long' | 'medium' | 'short';
  targetValue?: number;
  targetUnit?: string;
  description?: string;
}
```

### How Actions Flow

```
LLM returns functionCall     →  Backend validates with Zod
                              →  Backend wraps as TARSAction
                              →  Frontend receives action in chat response
                              →  Frontend action executor runs it:

action.type === 'navigate'       → call setScreen(action.screen)
action.type === 'audio.play'     → call audioStore.play(action.streamId)
action.type === 'log_activity'   → show ToolConfirmCard → on accept, call useCreateActivity()
action.type === 'create_goal'    → show ToolConfirmCard → on accept, call useCreateGoal()
```

### LLM Tool Schemas (for function calling)

When the intent is a write operation, the LLM gets these tool schemas so it can
return structured `functionCall` output:

```typescript
const TARS_TOOLS: ToolSchema[] = [
  {
    name: 'log_activity',
    description: 'Log a completed activity. Use when user says they did something.',
    parameters: {
      type: 'object',
      properties: {
        title:        { type: 'string', description: 'Short activity title' },
        activityType: { type: 'string', enum: ['quantity', 'duration', 'completion'] },
        value:        { type: 'number', description: 'Numeric value if applicable' },
        unit:         { type: 'string', description: 'Unit: pages, km, hours, minutes, etc' },
        goalId:       { type: 'string', description: 'ID of related goal, or null' },
        date:         { type: 'string', description: 'ISO date, default today' },
      },
      required: ['title', 'activityType'],
    },
  },
  {
    name: 'create_goal_draft',
    description: 'Draft a new goal for user confirmation. Never saves automatically.',
    parameters: {
      type: 'object',
      properties: {
        title:       { type: 'string' },
        timeframe:   { type: 'string', enum: ['long', 'medium', 'short'] },
        targetValue: { type: 'number' },
        targetUnit:  { type: 'string' },
        description: { type: 'string' },
      },
      required: ['title', 'timeframe'],
    },
  },
];
```

**Key rule:** Tool schemas are only included when the intent classifier says the
user wants to write something. For queries ("how am I doing?"), no tools are
sent — the LLM just gets context and responds in natural language.

### Command Matcher (Client-Side, Zero LLM)

Fixed commands are matched on the frontend before any API call. This is just
pattern matching — no ML, no network.

```typescript
const COMMANDS = [
  // Audio
  { patterns: ['play music', 'play lofi', 'play something', 'start music'],
    action: { type: 'audio.play', streamId: 'lofi' } as TARSAction },
  { patterns: ['stop music', 'pause', 'mute', 'quiet'],
    action: { type: 'audio.stop' } as TARSAction },
  { patterns: ['next track', 'change music', 'different music'],
    action: { type: 'audio.next' } as TARSAction },

  // Navigation
  { patterns: ['go to goals', 'show goals', 'open goals'],
    action: { type: 'navigate', screen: 'Goals' } as TARSAction },
  { patterns: ['go home', 'home', 'dashboard', 'hub'],
    action: { type: 'navigate', screen: 'Hub' } as TARSAction },
  { patterns: ['insights', 'analytics', 'stats'],
    action: { type: 'navigate', screen: 'Insights' } as TARSAction },
  { patterns: ['focus mode', 'start focus', 'pomodoro'],
    action: { type: 'navigate', screen: 'Focus' } as TARSAction },

  // Session
  { patterns: ['start timer', 'start session', 'begin focus'],
    action: { type: 'focus.start' } as TARSAction },
  { patterns: ['stop timer', 'end session', 'done focusing'],
    action: { type: 'focus.stop' } as TARSAction },
];
```

Matching: normalize input (lowercase, strip punctuation), check substring.
If no match → send to `/api/ai/chat`.

---

## 5. Intent Routing & Dispatch

### Why Not a Dispatcher "Agent"

The v1.0 doc proposed a DispatcherAgent class. In reality, intent classification
is a single function — not a class with state. It runs a heuristic check first
(no LLM needed for 80% of inputs), and only falls back to a lightweight LLM
classification call for ambiguous inputs.

### Intent Types

```typescript
type IntentType =
  | 'log_activity'   // "I read 30 pages", "ran 5km today"
  | 'create_goal'    // "I want to read more", "new goal: run 100km"
  | 'query'          // "how am I doing?", "what's my streak?"
  | 'chat'           // General conversation, unclear intent
  | 'unknown'        // Truly ambiguous — ask for clarification
```

Fixed commands (`play music`, `go to goals`) are handled client-side by the
Command Matcher before the message ever hits the backend.

### Heuristic-First Classification

```typescript
function classifyIntent(input: string): IntentType {
  const lower = input.toLowerCase();

  // Activity logging keywords
  if (/\b(log(ged)?|did|completed|finished|read|ran|studied|spent|wrote|exercised|walked)\b/.test(lower))
    return 'log_activity';

  // Goal creation keywords
  if (/\b(create goal|new goal|add goal|set goal|i want to|my goal is)\b/.test(lower))
    return 'create_goal';

  // Query keywords
  if (/\b(how|what|when|why|which|stats|streak|progress|behind|ahead|show me|tell me)\b/.test(lower))
    return 'query';

  // Fallback: one lightweight LLM classification call
  return 'chat';  // or call classifyWithLLM(input) for better accuracy
}
```

### When to Include Tool Schemas

| Intent | Tools sent to LLM? | Rationale |
|--------|-------------------|-----------|
| `log_activity` | Yes: `log_activity` | LLM extracts structured activity data |
| `create_goal` | Yes: `create_goal_draft` | LLM extracts goal structure |
| `query` | No | LLM just gets PolarisContext + responds in text |
| `chat` | No | Conversational — no mutations |
| `unknown` | No | Ask for clarification |

### Clarification for Ambiguous Input

If confidence < 0.5 (or the heuristic returns `unknown`), TARS asks:

> "I'm not sure what you mean. Did you want to:
> - Log an activity you did
> - Create a new goal
> - Ask about your progress"

This is a canned response — no LLM call needed.

---

## 6. Context & Memory Strategy

### PolarisContext — Current State

Already defined in `@polaris/shared` (`types/ai.ts`):

```typescript
interface PolarisContext {
  activeGoals: Array<{
    id: string;
    title: string;
    progress: number;       // 0–100
    timeframe: string;
  }>;
  recentActivities: Array<{
    title: string;
    date: string;
    type: string;
  }>;
  currentStreak: number;
  longestStreak: number;
  timeOfDay: TimeOfDay;
  dayOfWeek: string;
  currentDate: string;      // ← added in foundation cleanup
}
```

### PolarisContext — Fields Needed for TARS

The current context is sufficient for daily coaching but too thin for TARS.
Enrich incrementally:

```typescript
// Phase 1 additions (Sprint 1)
interface PolarisContext {
  // ... existing fields ...

  // What's happening today (needed for briefing)
  todayPlanned: Array<{ title: string; goalTitle?: string }>;
  todayCompleted: Array<{ title: string; value?: number; unit?: string }>;

  // Richer goal data (needed for goal-matching in activities)
  activeGoals: Array<{
    id: string;
    title: string;
    progress: number;
    timeframe: string;
    targetValue?: number;     // ← new
    targetUnit?: string;      // ← new
    lastActivityDaysAgo: number;  // ← new (dormancy detection)
  }>;
}

// Phase 2 additions (Sprint 3+)
interface PolarisContext {
  // ... Phase 1 fields ...

  totalActivitiesAllTime: number;
  last7DaysSummary: Array<{
    date: string;
    activitiesCompleted: number;
    goalsWorkedOn: string[];
  }>;
}
```

**Critical:** Cap everything. Max 10 goals, max 20 activities, max 7 days of
history. A power user's uncapped context will overflow the LLM's useful working
window even if it fits technically.

### Context Assembly

Currently: `assemblePolarisContext()` in `polaris-context.service.ts` (backend).
This stays. New fields get added to the same function, one at a time.

### Session Memory (Phase 2 — After Chat Works)

Conversation history stored in Zustand (frontend). Last 6 turns sent with
each `/api/ai/chat` request.

```typescript
interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  action?: TARSAction;  // if TARS proposed an action
}

// POST /api/ai/chat payload
{
  message: string,
  history: ConversationTurn[],  // last 6 turns
  // context assembled server-side — never from frontend
}
```

### Persistent Memory (Future — Not Now)

A `tars_memory` table storing extracted preferences/patterns. Only build this
after chat works reliably for 2+ weeks. Don't over-engineer early.

### TARS Persona System Prompt

Shared across all LLM calls:

```
You are TARS, a productivity assistant in the Polaris app.
You are terse, precise, data-driven. You never use filler words.
Dark humor is acceptable. You know the user's goals and habits.
Keep responses under 4 sentences unless asked for detail.
Format: plain text, no markdown, no bullet points.
Never fabricate data — only reference what's in the context provided.
```

---

## 7. File Structure

### Current packages/ai/ (after foundation restructure)

```
packages/ai/src/
├── polaris-ai.ts              ← Main facade (upgrade: add chat/stream methods)
├── index.ts                   ← Public exports
├── types.ts                   ← AIProvider interface (upgrade: chat + chatStream)
│
├── features/
│   ├── analyze-week.ts        ← Existing (refactor: use provider.chat)
│   ├── breakdown-goal.ts      ← Existing (refactor: use provider.chat)
│   ├── daily-coach.ts         ← Existing (refactor: use provider.chat)
│   └── fallback-quotes.ts     ← Existing
│
├── prompts/
│   ├── activity-parse.prompt.ts   ← Existing
│   ├── daily-coach.prompt.ts      ← Existing
│   ├── goal-breakdown.prompt.ts   ← Existing
│   ├── weekly-analysis.prompt.ts  ← Existing
│   ├── tars-system.prompt.ts      ← NEW: TARS persona base prompt
│   ├── briefing.prompt.ts         ← NEW: startup briefing template
│   ├── classify.prompt.ts         ← NEW: intent classification (LLM fallback)
│   └── index.ts
│
├── providers/
│   ├── gemini.provider.ts     ← NEW: Primary cloud provider
│   ├── ollama.provider.ts     ← Existing (upgrade: add chat + chatStream)
│   ├── openai.provider.ts     ← Existing (upgrade: add chat + chatStream)
│   ├── mock.provider.ts       ← Existing (upgrade: add chat + chatStream)
│   └── index.ts               ← Factory (add gemini case)
│
├── tars/
│   ├── intent-classifier.ts   ← NEW: Heuristic + LLM fallback routing
│   ├── action-types.ts        ← NEW: TARSAction union type + drafts
│   ├── tool-schemas.ts        ← NEW: Function calling tool definitions
│   ├── action-validator.ts    ← NEW: Zod validation for tool call output
│   └── briefing.ts            ← NEW: Assemble briefing prompt + stream
│
└── utils/
    ├── ai-logger.ts           ← Existing
    ├── call-provider-text.ts  ← DEPRECATED (remove after provider refactor)
    ├── context-capper.ts      ← Existing
    └── validate-response.ts   ← Existing
```

### New files in apps/backend/

```
apps/backend/src/
├── routes/
│   └── ai.routes.ts           ← ADD: POST /chat, GET /briefing handlers
│
├── controllers/
│   └── ai.controller.ts       ← ADD: chatHandler, briefingHandler
│
└── services/
    ├── ai.service.ts           ← ADD: chat(), getBriefing() thin facades
    └── polaris-context.service.ts  ← UPGRADE: add todayPlanned, todayCompleted
```

### New files in apps/frontend/

```
apps/frontend/src/
├── components/
│   └── assistant/
│       ├── AssistantPanel.tsx        ← Main sliding panel (right drawer)
│       ├── AssistantAvatar.tsx       ← Three.js TARS entity (corner orb)
│       ├── ConversationThread.tsx    ← Scrollable message history
│       ├── AssistantMessage.tsx      ← Single message + typewriter animation
│       ├── UserMessage.tsx           ← User bubble
│       ├── AssistantInput.tsx        ← Text input + mic button
│       ├── ToolConfirmCard.tsx       ← "Log 30 pages? Accept / Edit / Dismiss"
│       ├── StartupBriefing.tsx       ← Boot sequence overlay (1x/day)
│       └── QuickActionChips.tsx      ← Suggested follow-up actions
│
├── hooks/
│   ├── useAssistant.ts              ← Main hook — send, receive, history
│   ├── useAssistantActions.ts       ← TARSAction executor (navigate, audio, etc)
│   ├── useStartupBriefing.ts        ← Daily briefing SSE consumer
│   └── useCommandMatcher.ts         ← Client-side command pattern matching
│
└── stores/
    └── assistant.store.ts           ← Conversation history, panel state, TARS state
```

---

## 8. Backend — Endpoints

### POST /api/ai/chat

Main conversational endpoint. Handles all non-command interactions.

```typescript
// Request
{
  message: string;
  history?: ConversationTurn[];   // last 6 turns, optional
  // context assembled server-side from DB — do NOT send from frontend
}

// Response
{
  success: true,
  data: {
    response: string;              // TARS's text response
    action?: TARSAction;           // If TARS wants to do something
    requiresConfirmation: boolean; // true for writes
    intent: IntentType;
    provider: string;
    latencyMs: number;
  }
}
```

**Flow inside the handler:**
1. Assemble `PolarisContext` from DB (fresh every request)
2. `classifyIntent(message)` — heuristic first
3. Build messages array: `[system prompt + context, ...history, user message]`
4. If write intent → include tool schemas in `provider.chat()` call
5. If LLM returns `functionCall` → validate with Zod → wrap as `TARSAction`
6. If LLM returns text → return as `response`

**Security:** Context is assembled server-side. Never trust the frontend to
send context — it could be stale or manipulated.

### GET /api/ai/briefing (SSE)

Startup briefing stream. Same SSE pattern as existing `/api/ai/analyze-week/stream`.

```typescript
// Response: SSE stream
// data: {"type":"token","token":"..."}     ← text chunks
// data: {"type":"done","quickActions":[]}  ← suggested follow-ups
// data: [DONE]
```

**Trigger:** Frontend calls on first daily open.  
**Rate limit:** Client-side via `localStorage` key `polaris:briefing:YYYY-MM-DD`.  
**Provider:** Uses `provider.chatStream()` with briefing prompt template.

### Removed: POST /api/ai/command

The v1.0 doc had a `/command` endpoint for pattern-matched commands (play music,
navigate, etc.). This is unnecessary — command matching runs entirely client-side.
No API call needed to match "play music" to `{ type: 'audio.play' }`.

### Upgraded: GET /api/ai/config

The current config endpoint only knows about Ollama. Upgrade to be provider-agnostic:

```typescript
// Current (broken for Gemini)
{ provider: 'ollama', ollamaModel: 'gemma4:e4b', ollamaUrl: '...' }

// Upgraded (works for any provider)
{
  success: true,
  data: {
    provider: string;       // 'gemini' | 'ollama' | 'openai' | 'mock'
    model: string;          // 'gemma-4-26b-a4b-it' | 'gemma4:e4b' | 'gpt-4o-mini'
    status: 'connected' | 'error' | 'unknown';
    statusMessage?: string; // 'Gemini API responding' or 'Ollama unreachable'
    latencyMs?: number;     // Ping response time
    availableModels?: string[];  // For Ollama: installed models. For Gemini: hardcoded list.
  }
}
```

**Health check logic** (runs on GET /config, cached 30s):
- `gemini`: `POST generateContent` with "ping" → check 200 response
- `ollama`: `GET /api/tags` with 5s timeout → check response
- `openai`: just return `'unknown'` (don't waste API credits on pings)
- `mock`: always `'connected'`

### Upgraded: POST /api/ai/config

Generalize from Ollama-only to any-provider model switching:

```typescript
// Request
{ model: string }  // e.g. 'gemma-4-26b-a4b-it' or 'gemma4:e4b'

// Sets the appropriate env var based on current provider:
// gemini → GEMINI_MODEL
// ollama → OLLAMA_MODEL
// openai → (no-op, model is hardcoded)
```

### Provider Status in Settings UI

The Settings screen currently shows provider cards with no live status. Add:

```
┌─────────────────────────────────────────────┐
│  AI Provider: Gemini      ● Connected (2s)  │  ← green dot = healthy
│  Model: gemma-4-26b-a4b-it                  │
│  Rate: 1,500 RPD · 15 RPM                   │
│                                              │
│  [gemma-4-26b]  [gemini-2.5-flash]  [gemini-3-flash]  │  ← model chips
│                                              │
│  [Test AI ✓]  "30 pages → Atomic Habits"     │
└─────────────────────────────────────────────┘
```

**Status indicators:**
- 🟢 `Connected (Xms)` — provider responded to health check
- 🔴 `Error: <message>` — provider unreachable or key invalid
- ⚪ `Unknown` — no health check available (OpenAI)
- 🟡 `Slow (Xs)` — connected but latency > 10s (Ollama)

---

## 9. Frontend — Component Architecture

### AssistantPanel

Right-side drawer, ~400px wide on desktop, full-screen on mobile.

```
┌──────────────────────────────┐
│  ● TARS                  ✕  │  ← header, close button
├──────────────────────────────┤
│                              │
│  [TARS message bubble]       │
│  "7-day streak. Don't        │  ← AssistantMessage with typewriter
│  break it today..."          │
│                              │
│  [ToolConfirmCard]           │
│  ┌──────────────────────┐   │
│  │ Log: 30 pages         │   │  ← shows before saving
│  │ Atomic Habits         │   │
│  │ Goal: Reading 2026    │   │
│  │ [Accept] [Edit] [✕]   │   │
│  └──────────────────────┘   │
│                              │
│  [Quick action chips]        │
│  [Start focus] [View goals]  │
│                              │
│  [User message bubble]       │
│  "log 30 pages of atomic.."  │
│                              │
├──────────────────────────────┤
│ 🎤  Type or speak to TARS   │  ← AssistantInput
└──────────────────────────────┘
```

### Zustand Store

```typescript
interface AssistantStore {
  // Panel state
  panelOpen: boolean;
  togglePanel: () => void;

  // TARS visual state (drives avatar animation)
  tarsState: 'idle' | 'listening' | 'processing' | 'speaking';
  setTarsState: (state: TarsState) => void;

  // Conversation
  turns: ConversationTurn[];
  addTurn: (turn: ConversationTurn) => void;
  clearHistory: () => void;

  // Pending action (from tool call)
  pendingAction: TARSAction | null;
  setPendingAction: (action: TARSAction | null) => void;
}
```

### ToolConfirmCard

Shows inside the conversation thread when TARS wants to mutate data.

```typescript
interface ToolConfirmCardProps {
  action: TARSAction;               // The proposed action
  onAccept: (editedAction: TARSAction) => void;
  onDismiss: () => void;
  autoAcceptMs?: number;             // If set, auto-accepts with countdown
}
```

For high-confidence activity logs: `autoAcceptMs={5000}` with a visible
countdown ring. For goal creation: no auto-accept.

### StartupBriefing

A fullscreen overlay on first daily open:

```
[Dark background, constellation]

  P O L A R I S          ← types in letter by letter
  ──────────────
  Initializing...        ← 0.5s pause
  Loading your context   ← 0.8s
  Analyzing patterns     ← 1.0s (cosmetic)
  Ready.                 ← 1.2s

  [TARS panel slides in with briefing text streaming]
```

The fake loading steps are CSS animation. The real briefing SSE starts fetching
on app load — by the time the animation finishes, text is already streaming.
Never `await` the briefing in the app initialization path.

---

## 10. Voice Strategy

### Input — Whisper (Already Works)

Existing `VoiceButton` + `useVoiceRecorder` + Whisper service. Wire the
transcript into `AssistantInput` so the mic in the panel uses the same pipeline.

**Key change:** The existing voice pipeline goes `audio → Whisper → parse_activity`.
The new pipeline goes `audio → Whisper → AssistantDispatcher (command match first,
then /api/ai/chat)`.

### Output — Speech Synthesis (Minimal)

Web Speech API for now. Free, instant, no server.

```typescript
function speak(text: string) {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.1;
  utterance.pitch = 0.9;
  window.speechSynthesis.speak(utterance);
}
```

**When to speak:** Only startup briefing and short confirmations ("Logged. 30
pages added to Reading."). Long responses stay text-only.

**Future:** Gemini 2.5 Flash/Pro TTS models are available in the API (verified
in model list). Could replace Web Speech API for higher quality.

**Note:** `speechSynthesis.cancel()` must be called before any new speech starts,
to prevent overlapping audio when user interrupts TARS.

---

## 11. Three.js Avatar

### Design

**Dark mode** — TARS-inspired monolith: rectangular slab, matte black, edge-lit.
Fixed position bottom-right corner. Click to open/close panel.

**Light mode** — Soft translucent orb with inner glow.

### States (driven by `assistant.store.ts`)

| State | Animation |
|-------|-----------|
| Idle | Slow breathing pulse (scale 1.0 → 1.05 → 1.0) |
| Listening | Faster pulse, accent color shift |
| Processing | Rotation + shimmer |
| Speaking | Surface waveform deformation |
| Has briefing | Notification dot, different idle color |

### Implementation Notes

- Small Canvas (80x80px) positioned `fixed` bottom-right
- `@react-three/fiber` canvas with single mesh
- BoxGeometry for monolith, MeshStandardMaterial with emissive glow
- `useFrame` drives animation state machine
- Handle clicks on the wrapping `<div>`, not the Canvas (pointer-events issues)
- Separate Canvas from the 3D backgrounds already in the app (own WebGL context)

### Known Risks

- Three.js canvas in `position: fixed` has z-index / event bubbling quirks
- Mobile: fixed-position canvas may interact with scroll
- WebGL context limit: app already has 3D backgrounds — test on low-end devices
- **Recommendation:** Do a 2-hour isolated spike before integrating into the app

---

## 12. Build Order (Revised)

Each sprint is independently testable. Order matters — later sprints depend on earlier ones.

### Sprint 0 — Provider Foundation (DO FIRST)

Fix the plumbing before building features. This is the prerequisite for everything.

**Tasks:**
1. Expand `AIProvider` interface: add `chat()` + `chatStream()` to `types.ts`
2. Build `gemini.provider.ts` — implements all 3 methods (`parse`, `chat`, `chatStream`)
3. Upgrade `mock.provider.ts` — add `chat()` + `chatStream()` (canned responses)
4. Upgrade `ollama.provider.ts` — add `chat()` + `chatStream()`
5. Upgrade `openai.provider.ts` — add `chat()` + `chatStream()`
6. Update provider factory in `providers/index.ts` — add `gemini` case
7. Refactor `callProviderText()` callers → use `provider.chat()` directly
8. Delete `call-provider-text.ts` (eliminate duplicate LLM path)
9. Create `.env.example` for backend with all AI env vars documented
10. Upgrade `GET /api/ai/config` — return provider-agnostic status + health check
11. Upgrade `POST /api/ai/config` — support model switching for any provider
12. Upgrade Settings UI — show provider status indicator (connected/error/latency)
13. Upgrade Settings UI — show model chips for Gemini (not just Ollama)
14. Add Gemini model list endpoint or hardcoded model options for Settings UI

**Environment setup (just-works):**
```bash
# apps/backend/.env
AI_PROVIDER=gemini
GEMINI_API_KEY=<your-key>
# That's it. Default model is gemma-4-26b-a4b-it (1,500 RPD).
# Optional: GEMINI_MODEL=gemini-2.5-flash  (for quality testing, 20 RPD)
```

**Done when:**
- `AI_PROVIDER=gemini npm run typecheck` passes
- `provider.chat([{ role: 'user', content: 'hello' }])` returns a response
- Settings page shows "Gemini · Connected (2s) · gemma-4-26b-a4b-it"
- Model chips let you switch between Gemma 4 and Gemini 2.5 Flash
- Test AI button works with Gemini provider

---

### Sprint 1 — TARS Backend Core

Build the chat and briefing endpoints using the new provider interface.

**Tasks:**
1. Create `tars/action-types.ts` — TARSAction union type, ActivityDraft, GoalDraft
2. Create `tars/tool-schemas.ts` — function calling schemas for log_activity, create_goal_draft
3. Create `tars/action-validator.ts` — Zod schemas to validate LLM tool call output
4. Create `tars/intent-classifier.ts` — heuristic-first + LLM fallback
5. Create `prompts/tars-system.prompt.ts` — TARS persona prompt
6. Create `prompts/briefing.prompt.ts` — briefing template with context injection
7. Create `tars/briefing.ts` — assemble briefing prompt + call provider.chatStream()
8. Enrich `PolarisContext` — add `todayPlanned`, `todayCompleted` fields
9. Add `POST /api/ai/chat` handler (route + controller + service)
10. Add `GET /api/ai/briefing` SSE handler (reuse existing SSE pattern)

**Done when:** `curl -X POST /api/ai/chat -d '{"message":"how am I doing?"}'`
returns a natural language response with your real data. And
`curl /api/ai/briefing` streams a personalized briefing.

---

### Sprint 2 — TARS UI Foundation

Build the frontend shell. No AI wiring yet — just the panel with fake messages
to get the layout right.

**Tasks:**
1. Create `assistant.store.ts` (Zustand — panel state, conversation history, tarsState)
2. Create `AssistantPanel.tsx` (right drawer shell)
3. Create `ConversationThread.tsx` + `AssistantMessage.tsx` + `UserMessage.tsx`
4. Create `AssistantInput.tsx` (text input + mic button)
5. Create `useCommandMatcher.ts` (client-side command pattern matching)
6. Create `useAssistant.ts` — main hook (send message → get response)
7. Wire `useAssistant` to `POST /api/ai/chat`
8. Wire keyboard shortcut (`Cmd+/` or `Cmd+Space`) to toggle panel

**Done when:** Panel opens, user types a message, response comes back from
the real API and displays with typewriter animation.

---

### Sprint 3 — Tool Calls + Confirmation Flow

Wire up write operations with the confirm card.

**Tasks:**
1. Create `ToolConfirmCard.tsx` with accept/edit/dismiss
2. Create `useAssistantActions.ts` — executes TARSAction using existing hooks
3. Wire "log 30 pages" flow: chat → tool call → confirm card → useCreateActivity()
4. Wire "create goal" flow: chat → tool call → confirm card → useCreateGoal()
5. Add auto-accept countdown for high-confidence activity logs
6. Add `QuickActionChips.tsx` for suggested follow-ups

**Done when:** End-to-end — type "log 30 pages of Atomic Habits" → confirm
card shows → tap Accept → activity saved via existing API.

---

### Sprint 4 — Startup Briefing UI

Wire the briefing overlay and SSE consumer.

**Tasks:**
1. Create `StartupBriefing.tsx` — boot sequence animation
2. Create `useStartupBriefing.ts` — SSE consumer + localStorage date check
3. Wire briefing text stream into AssistantPanel
4. Add quick-action chips after briefing finishes

**Done when:** App loads → boot animation plays → TARS briefing streams in
with real data → tapping a chip navigates or opens a relevant screen.

---

### Sprint 5 — TARS Avatar + Voice + Polish

The visual and audio experience layer. Last because everything else must work first.

**Tasks:**
1. Spike: Three.js canvas as fixed floating element (2-hour isolated test)
2. Build `AssistantAvatar.tsx` with idle/listening/processing states
3. Wire avatar state to `assistant.store.ts` tarsState
4. Wire Whisper mic in AssistantInput → command matcher → /api/ai/chat
5. Add Web Speech API output for briefing + short confirmations
6. Polish: panel transitions, mobile layout, scroll behavior

**Done when:** TARS monolith in corner, clickable, voice input produces
responses, briefing speaks aloud.

---

### Sprint 6 — Session Memory + Multi-Turn

Add conversation continuity after single-turn chat is stable.

**Tasks:**
1. Include last 6 turns from Zustand store in `/api/ai/chat` payload
2. Backend includes history in the messages array sent to the LLM
3. Test: "what goals do I have?" → "tell me more about the reading one"
4. Add sliding window: when > 6 turns, drop oldest
5. Tune context window — watch for LLM confusion with long histories

**Done when:** Multi-turn conversation works naturally without the LLM
"forgetting" what was just discussed.

---

### Future Sprints (Not Now)

| Sprint | Feature | Prerequisite |
|--------|---------|-------------|
| 7 | Groq provider | Sprint 0 interface done |
| 8 | Persistent memory (DB-backed facts) | Sprint 6 stable for 2+ weeks |
| 9 | Gemini TTS (replace Web Speech API) | Sprint 5 |
| 10 | Pattern detection ("you always skip Fridays") | Sprint 8 |

---

## 13. Critical Gotchas

### Provider Architecture

**Context size must be capped.** An uncapped PolarisContext for a power user
(20 goals, 500 activities) will overwhelm the LLM's useful working window.
Hard cap: 10 goals, 7 days of history, each activity summary 1 line max.

**Tool call validation is mandatory.** LLMs occasionally return tool calls
with wrong param types or missing required fields. Every tool call must be
Zod-validated before use. Validation fails → ask user for clarification
(don't retry the LLM — it'll often make the same mistake).

**The heuristic classifier will misclassify edge cases.** "I want to read
more this month" looks like `log_activity` but is actually `create_goal`.
When unsure, default to `query` (safest — read-only) not `log_activity`
(could create unwanted data).

**Don't auto-execute writes, ever.** Keep auto-accept only for activities
the NLP parser is >90% confident about. Trust erosion from wrong auto-logs
is permanent.

### Frontend

**SSE streaming + typewriter is tricky.** SSE chunks don't align with word
boundaries. Buffer chunks, split by spaces, animate word-by-word. Test with
both fast (Gemini ~1s) and slow (local Gemma ~100s) inference.

**speechSynthesis queues.** Call `cancel()` before new speech starts to
prevent overlapping audio.

**Panel must not block main UI.** Right drawer that pushes content, or
overlay with clear close. Users will open it by accident — closing must
be one tap/click.

**Mobile keyboard + fixed panel = chaos.** Use `position: fixed` with
`env(safe-area-inset-bottom)` padding. Test on actual iOS/Android.

### AI Providers

**Gemini function calling response format differs from OpenAI/Ollama.**
Gemini returns `functionCall: { name, args }` inside `content.parts[]`.
OpenAI returns `tool_calls[]` on the message object. Each provider's
`chat()` method must normalize this to the common `ChatResult` interface.

**Gemini streaming uses `alt=sse` query param.** Ollama uses NDJSON.
OpenAI uses `stream: true` in the body. Each provider's `chatStream()`
handles its own format and yields plain text chunks.

**The briefing runs on app load — it must not block the UI.** The SSE
stream fires and forgets. If inference takes 15 seconds, the app is
already usable. Never `await` the briefing in app initialization.

**Session history grows the context window.** After 10 turns, you're
sending 10 turn history + PolarisContext + tool schemas + new message.
Hard limit: 6 turns. When full, drop oldest pair.

---

## 14. Architecture Decisions Log

Decisions made during the review process (April 2026):

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | 3 functions instead of 6 Agent classes | Agents were just prompt + if/else. Classes add indirection without value. |
| 2 | Gemini as primary cloud provider (not Groq) | API key available and verified. Function calling, streaming, multi-turn all tested. |
| 3 | `gemma-4-26b-a4b-it` as default Gemini model | 1,500 RPD vs 20 RPD for gemini-2.5-flash. Same Gemma 4 arch as local Ollama. |
| 4 | `AIProvider` gets `chat()` + `chatStream()` | One interface, all providers. Eliminates `callProviderText()` duplication. |
| 5 | Action Registry (`TARSAction` union) instead of agent tools | TARS maps NLP → typed action → existing frontend hooks. No new CRUD layer. |
| 6 | Command matching is client-side only | No API call for "play music". Pattern matching is just string ops. |
| 7 | Remove `POST /api/ai/command` endpoint | Redundant — command matching is client-side now. |
| 8 | Sprint 0 before any TARS features | Provider interface must be right before building on top of it. |
| 9 | `PolarisContext` enriched incrementally | Don't add all fields at once. Phase 1: todayPlanned/Completed. Phase 2: last7Days. |
| 10 | No persistent memory until Sprint 8+ | Over-engineering risk. Single-shot context covers 90% of use cases. |
| 11 | No `agents/` directory | Functions in `tars/` directory instead. Simpler. |
| 12 | Ollama is offline fallback only, not primary | 72–278s latency is unusable for chat. Keep for batch ops (weekly analysis). |
| 13 | Provider status indicator in Settings | User has no way to know if LLM is connected. Health check + status badge fixes this. |
| 14 | Config endpoint generalized for all providers | Was Ollama-only. Now returns provider/model/status for Gemini, Ollama, OpenAI, Mock. |
| 15 | `.env.example` for backend | No env documentation existed. Just set `AI_PROVIDER=gemini` + `GEMINI_API_KEY`. |

---

*Last updated: April 14, 2026 (v2.1 — added model ladder, provider status, Ollama latency data)*
