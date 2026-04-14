# Polaris — TARS Agent Architecture
> **Version:** 1.0 | **April 2026**  
> **Scope:** AI Assistant system — agents, tools, context, memory, UI, voice  
> **Prerequisite:** Phase 3 complete, Gemma 4 e4b running, Postgres on Railway

---

## Table of Contents

1. [Vision & Philosophy](#1-vision--philosophy)
2. [Architecture Overview](#2-architecture-overview)
3. [Agent Inventory](#3-agent-inventory)
4. [Tool Definitions](#4-tool-definitions)
5. [Context & Memory Strategy](#5-context--memory-strategy)
6. [File Structure](#6-file-structure)
7. [Backend — New Endpoints](#7-backend--new-endpoints)
8. [Frontend — Component Architecture](#8-frontend--component-architecture)
9. [Voice Strategy (Input + Output)](#9-voice-strategy-input--output)
10. [Three.js Avatar](#10-threejs-avatar)
11. [Build Order](#11-build-order)
12. [Critical Gotchas](#12-critical-gotchas)
13. [Research Spikes Needed](#13-research-spikes-needed)

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
│  Command Dispatcher             │  ← Is this a fixed command?
│  (pattern match, no LLM)        │    play music, stop, navigate
└────────────┬────────────────────┘
             │ No match
             ▼
┌─────────────────────────────────┐
│  Intent Router                  │  ← What kind of request?
│  (lightweight classification)   │    log | goal | query | chat
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Specialist Agent               │  ← Gemma 4 with relevant tools
│  (activity / goal / query)      │    + PolarisContext injected
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Tool Call Handler              │
│  Read ops → execute immediately │
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

This is the right balance. Fast where trust is earned, careful where it matters.

---

## 2. Architecture Overview

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
│  │  - sends messages to backend                        │    │
│  │  - handles tool execution on frontend               │    │
│  │  - manages conversation history (Zustand)           │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────┬────────────────────────────┘
                                  │ HTTP / SSE
┌─────────────────────────────────▼────────────────────────────┐
│  BACKEND                                                      │
│                                                               │
│  POST /api/ai/chat          ← main conversational endpoint   │
│  GET  /api/ai/briefing      ← startup briefing (SSE)         │
│  POST /api/ai/command       ← fixed command fast path        │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │ packages/ai/src/agents/                            │     │
│  │   dispatcher.agent.ts   ← routes to specialist    │     │
│  │   briefing.agent.ts     ← startup briefing        │     │
│  │   activity.agent.ts     ← log/create activities   │     │
│  │   goals.agent.ts        ← goal operations         │     │
│  │   query.agent.ts        ← read/insights           │     │
│  │   command.agent.ts      ← no-LLM fixed commands   │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │ packages/ai/src/context/                           │     │
│  │   buildContext.ts       ← assembles PolarisContext │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  Gemma 4 e4b via Ollama (local)                              │
│  Groq fallback for testing (cloud, fast)                     │
│  Mock for tests                                              │
└──────────────────────────────────────────────────────────────┘
```

### What Runs When

| Event | Trigger | Agent | LLM? |
|-------|---------|-------|------|
| App opens (first daily) | Auto, 1x/day | BriefingAgent | Yes, streamed |
| User types/speaks | Manual | Dispatcher → Specialist | Depends |
| Fixed command detected | Pattern match | CommandAgent | No |
| "log 30 pages" | SmartInputBar | ActivityAgent | Maybe (NLP first) |
| "create goal" | User intent | GoalsAgent | Yes |
| "how am I doing?" | User intent | QueryAgent | Yes |
| Activity confirmed | User taps Accept | Standard CRUD endpoint | No |

---

## 3. Agent Inventory

### 3.1 CommandAgent — Zero LLM, Pattern Matching Only

Handles all fixed, unambiguous commands. No Gemma call. Response time: <50ms.

**Input:** raw text string  
**Output:** `CommandResult { action: string, params: object, executed: boolean }`

**Command registry (examples — expand as needed):**

```typescript
const COMMANDS = [
  // Audio
  { patterns: ['play music', 'play lofi', 'play something', 'start music'],
    action: 'audio.play', params: { streamId: 'lofi' } },
  { patterns: ['stop music', 'pause', 'mute', 'quiet'],
    action: 'audio.stop', params: {} },
  { patterns: ['next track', 'change music', 'different music'],
    action: 'audio.next', params: {} },
  { patterns: ['play rain', 'rain sounds'],
    action: 'audio.play', params: { streamId: 'rain' } },
  { patterns: ['play focus', 'focus music', 'ambient'],
    action: 'audio.play', params: { streamId: 'ambient' } },

  // Navigation
  { patterns: ['go to goals', 'show goals', 'open goals'],
    action: 'navigate', params: { screen: 'Goals' } },
  { patterns: ['go home', 'home', 'dashboard', 'hub'],
    action: 'navigate', params: { screen: 'Hub' } },
  { patterns: ['insights', 'analytics', 'stats'],
    action: 'navigate', params: { screen: 'Insights' } },
  { patterns: ['focus mode', 'start focus', 'pomodoro'],
    action: 'navigate', params: { screen: 'Focus' } },
  { patterns: ['history', 'past activities'],
    action: 'navigate', params: { screen: 'History' } },

  // Session
  { patterns: ['start timer', 'start session', 'begin focus'],
    action: 'focus.start', params: {} },
  { patterns: ['stop timer', 'end session', 'done focusing'],
    action: 'focus.stop', params: {} },
]
```

**Matching logic:** normalize input (lowercase, strip punctuation), check if any pattern is a substring or close fuzzy match. If match confidence > 0.8, execute. Otherwise pass to Intent Router.

This is intentionally dumb and fast. No ML, just string matching.

---

### 3.2 BriefingAgent — Startup Coach

Runs once per day on first app load. Streams a personalized morning briefing.

**Trigger:** App loads + `polaris:briefing-dismissed:YYYY-MM-DD` not set  
**Input:** Full PolarisContext (assembled from DB)  
**Output:** SSE stream of briefing text  
**LLM:** Yes, Gemma 4 — streamed response

**System Prompt:**
```
You are TARS, a productivity assistant in the Polaris app. 
You are terse, precise, data-driven. You never use filler words. 
Dark humor is acceptable. You know the user's goals and habits.
Your briefings are 3-5 sentences max. Never longer.
Format: plain text, no markdown, no bullet points.
Always end with one specific actionable suggestion.
```

**User Prompt (template):**
```
Time: {{timeOfDay}} ({{dayOfWeek}})
Streak: {{streak}} days (longest: {{longestStreak}})
Today: {{completedToday}}/{{plannedToday}} activities done
Goals: {{goalsSummary}}
This week: {{weekSummary}}

Write a personalized morning briefing.
```

**Output example:**
> "7-day streak. Don't break it today. Reading goal is 68% complete — 
> you're 3 sessions behind pace for the month. 2 activities planned. 
> Suggest: 30 minutes of reading before dinner."

---

### 3.3 ActivityAgent — Log & Create Activities

Handles all activity logging from conversational input. Falls back to existing NLP parser first.

**Trigger:** Intent Router detects `log_activity` or `create_activity`  
**Input:** User message + PolarisContext (active goals for matching)  
**Output:** `ActivityDraft` struct  
**LLM:** Only if NLP confidence < 0.85

**Tools available to this agent:**
- `log_activity` — creates a completed activity
- `plan_activity` — creates a planned activity for today/future
- `get_goals` — fetch active goals for the dropdown

**Human-in-loop:** Always shows `ToolConfirmCard` before saving. User can edit title, value, unit, goal before accepting.

**Key behavior:** If user says "log 30 pages of Atomic Habits", NLP parser gets this with high confidence. Gemma is not called. Fast path. If user says "I was studying for like 2 hours kinda", NLP confidence is low → Gemma call with full context.

---

### 3.4 GoalsAgent — Goal Operations

Handles creating goals, showing goals, breaking down goals.

**Trigger:** Intent Router detects `create_goal`, `show_goals`, `goal_breakdown`  
**Input:** User message + PolarisContext  
**Output:** `GoalDraft` or `GoalList` or `GoalBreakdown`  
**LLM:** Yes for create/breakdown. No for show (direct DB query)

**Tools available:**
- `create_goal_draft` — returns a draft for confirmation
- `list_goals` — read-only, returns current goals
- `breakdown_goal` — uses existing breakdown endpoint

**Human-in-loop:** Goal creation always shows confirm card. Read operations display inline in conversation thread.

---

### 3.5 QueryAgent — Read-Only Insights

Handles any question about user data. Never writes to DB.

**Trigger:** Intent Router detects `query`  
**Input:** User message + PolarisContext  
**Output:** Natural language response (text only, no tool calls)  
**LLM:** Yes, but with read-only context only

**What it handles:**
- "How am I doing this week?"
- "What's my longest streak?"
- "Which goal am I most behind on?"
- "What did I do yesterday?"
- "How many pages have I read this month?"

**No tools** — QueryAgent just gets a rich PolarisContext and generates a natural language answer. It cannot mutate anything. If Gemma is offline, falls back to template-based answers from the context data directly.

---

### 3.6 DispatcherAgent — Intent Router

The brain that routes input to the right specialist. This is a lightweight call, not a heavy analysis.

**Input:** User message  
**Output:** `{ intent: IntentType, confidence: number, passToAgent: AgentName }`

**Intent types:**
```typescript
type IntentType = 
  | 'command'        // → CommandAgent (pattern match first, no LLM)
  | 'log_activity'   // → ActivityAgent
  | 'create_goal'    // → GoalsAgent  
  | 'show_goals'     // → GoalsAgent (read)
  | 'query'          // → QueryAgent
  | 'chat'           // → QueryAgent with conversational mode
  | 'unknown'        // → QueryAgent with "I didn't understand" fallback
```

**Implementation:** This can be done with a small classification prompt to Gemma, OR (better for speed) with a keyword-based heuristic first:

```typescript
function classifyIntent(input: string): IntentType {
  const lower = input.toLowerCase()
  
  // Check fixed commands first (fastest)
  if (CommandAgent.matches(lower)) return 'command'
  
  // Keyword heuristics (no LLM needed for most cases)
  if (/\b(log|did|completed|finished|read|ran|studied|spent|saved|did)\b/.test(lower))
    return 'log_activity'
  if (/\b(create goal|new goal|add goal|set goal|want to)\b/.test(lower))
    return 'create_goal'
  if (/\b(show|list|see|view|my goals|all goals)\b/.test(lower))
    return 'show_goals'
  if (/\b(how|what|when|why|which|stats|streak|progress|behind|ahead)\b/.test(lower))
    return 'query'
  
  // Fallback: one quick LLM classification call
  return classifyWithLLM(input)
}
```

This means for 80% of inputs, there's no Gemma call at all for routing. Only ambiguous inputs hit the LLM classifier.

---

## 4. Tool Definitions

These are the Gemma 4 function-calling tool schemas. Keep to 6 max per agent call.

### Activity Tools

```typescript
const activityTools = [
  {
    name: "log_activity",
    description: "Log a completed activity. Use when user says they did something.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short activity title" },
        activityType: { type: "string", enum: ["quantity", "duration", "completion"] },
        value: { type: "number", description: "Numeric value if applicable" },
        unit: { type: "string", description: "Unit: pages, km, hours, minutes, ₹, etc" },
        goalId: { type: "string", description: "ID of related goal, or null" },
        date: { type: "string", description: "ISO date, default today" }
      },
      required: ["title", "activityType"]
    }
  },
  {
    name: "plan_activity",
    description: "Add a planned activity for today or future date.",
    parameters: {
      // same as log_activity but status will be 'planned'
    }
  },
  {
    name: "get_active_goals",
    description: "Fetch the list of active goals with IDs for goal matching.",
    parameters: { type: "object", properties: {} }
  }
]
```

### Goal Tools

```typescript
const goalTools = [
  {
    name: "create_goal_draft",
    description: "Draft a new goal for user confirmation. Never saves automatically.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        timeframe: { type: "string", enum: ["long", "medium", "short"] },
        targetValue: { type: "number" },
        targetUnit: { type: "string" },
        description: { type: "string" }
      },
      required: ["title", "timeframe"]
    }
  },
  {
    name: "list_goals",
    description: "Return the user's active goals.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["active", "all", "completed"] }
      }
    }
  }
]
```

### Query Tools — None Needed

QueryAgent gets a rich context and responds in natural language. No tool calls needed. The PolarisContext IS the tool output.

---

## 5. Context & Memory Strategy

### Phase 1 — Single-Shot Context (Build This Now)

Every AI call gets a fresh `PolarisContext` assembled from DB. No session memory. This covers 90% of use cases.

```typescript
interface PolarisContext {
  // Who they are (behaviorally)
  currentStreak: number
  longestStreak: number
  totalActivitiesAllTime: number
  
  // What they care about
  activeGoals: Array<{
    id: string
    title: string
    timeframe: string
    progressPercent: number
    targetValue?: number
    targetUnit?: string
    lastActivityDaysAgo: number  // for dormancy
  }>
  
  // What's happening today
  todayPlanned: Array<{ title: string, goalTitle?: string }>
  todayCompleted: Array<{ title: string, value?: number, unit?: string }>
  todaySkipped: Array<{ title: string }>
  
  // Recent history
  last7DaysSummary: Array<{
    date: string
    activitiesCompleted: number
    goalsWorkedOn: string[]
  }>
  
  // Meta
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  dayOfWeek: string
  currentDate: string
}
```

**Critical:** Cap this. Max 10 goals, max 7 days history, summarized not raw. A 90-day user with 20 goals will generate a context that blows Gemma's working memory if you're not careful.

**Assembly location:** `packages/ai/src/context/buildContext.ts`  
**Called by:** Every agent that needs it. Assembled once per request in the controller, passed down.

---

### Phase 2 — Session Memory (Add After Phase 1 Works)

Conversation history stored in **Zustand** (frontend) for the current session. When user sends a message, the last N turns are included in the API call.

```typescript
interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  toolCall?: { name: string, params: object, result: string }
}

// Zustand store
interface AssistantStore {
  turns: ConversationTurn[]
  addTurn: (turn: ConversationTurn) => void
  clearHistory: () => void  // on panel close
  sessionActive: boolean
}
```

Send last 6 turns with each request (3 back-and-forth exchanges). Beyond that, context gets stale and confusing.

**Backend payload:**
```typescript
// POST /api/ai/chat
{
  message: string,
  history: ConversationTurn[],  // last 6 turns
  context: PolarisContext        // fresh each time
}
```

---

### Phase 3 — Persistent Memory (Future, After Testing)

A `AssistantMemory` table in Postgres. Stores structured "facts" extracted from conversations.

```sql
AssistantMemory {
  id          UUID
  userId      String?
  memoryType  String   -- 'preference' | 'pattern' | 'fact'
  key         String   -- 'preferred_study_time'
  value       String   -- 'evenings after 8pm'
  source      String   -- conversation snippet that created this
  confidence  Float
  createdAt   DateTime
  updatedAt   DateTime
}
```

This is how ChatGPT's memory works under the hood — not RAG over embeddings (overkill for structured personal data), but structured fact extraction. After each conversation, a lightweight prompt asks: "Did the user reveal any preference, habit, or fact about themselves? If yes, extract it as JSON."

**On RAG specifically:** You don't need vector RAG here. Your data is already structured in Postgres. The right query + join beats semantic search for "show my goals" or "what did I do last week". RAG would only make sense if you had unstructured notes or journal entries. If you add a freeform notes field later, that's when pgvector becomes interesting.

---

### Groq for Testing

Add `GroqProvider` to the provider list. Groq's free tier runs `llama-3.3-70b` at ~300 tokens/second — this is perfect for testing if your prompts work properly before running locally on Gemma.

```typescript
// .env
AI_PROVIDER=groq
GROQ_API_KEY=your_key  # free at console.groq.com
GROQ_MODEL=llama-3.3-70b-versatile
```

The existing provider interface makes this a 50-line addition. When Groq works well → port the prompts back to Gemma. This saves hours of debugging slow local inference.

---

## 6. File Structure

### New Files in `packages/ai/`

```
packages/ai/src/
├── agents/
│   ├── dispatcher.agent.ts      # Intent routing + heuristic classification
│   ├── command.agent.ts         # Pattern-match only, zero LLM
│   ├── briefing.agent.ts        # Daily startup briefing
│   ├── activity.agent.ts        # Log/plan activities
│   ├── goals.agent.ts           # Goal CRUD operations
│   └── query.agent.ts           # Read-only data queries
│
├── tools/
│   ├── activity.tools.ts        # Tool schemas for activity operations
│   ├── goal.tools.ts            # Tool schemas for goal operations
│   ├── registry.ts              # Central tool schema registry
│   └── executor.ts              # Routes tool calls to actual API operations
│
├── context/
│   ├── buildContext.ts          # Assemble PolarisContext from DB
│   └── context.types.ts        # PolarisContext interface + sub-types
│
├── memory/
│   ├── session.memory.ts        # In-session conversation history helpers
│   └── persistent.memory.ts    # DB-backed memory (Phase 3, stub for now)
│
├── prompts/
│   ├── briefing.prompt.ts       # Startup briefing system + user templates
│   ├── activity.prompt.ts       # Activity parsing with context
│   ├── goals.prompt.ts          # Goal creation / decomposition
│   ├── query.prompt.ts          # Data query natural language response
│   ├── classify.prompt.ts       # Intent classification (fallback only)
│   └── shared.system.prompt.ts  # TARS persona system prompt (shared base)
│
├── utils/
│   ├── commandMatcher.ts        # Fixed command pattern matching + fuzzy
│   ├── toolRouter.ts            # Map Gemma tool_call output → handler fn
│   ├── contextCapper.ts         # Enforce size limits on PolarisContext
│   ├── streamParser.ts          # Parse SSE from Ollama/Groq
│   └── responseValidator.ts    # Zod validation for all structured outputs
│
├── providers/
│   ├── ollama.provider.ts       # Gemma 4 local (existing, upgrade)
│   ├── groq.provider.ts         # NEW — for fast testing
│   ├── openai.provider.ts       # Existing
│   └── mock.provider.ts         # Existing
│
└── types/
    ├── agent.types.ts            # AgentRequest, AgentResponse, IntentType
    ├── tool.types.ts             # ToolCall, ToolResult, ToolSchema
    └── conversation.types.ts    # ConversationTurn, Message, SessionState
```

### New Files in `apps/backend/`

```
apps/backend/src/
├── routes/
│   └── ai.ts                    # Add: POST /chat, GET /briefing, POST /command
│
├── controllers/
│   └── ai.controller.ts         # Add: chatHandler, briefingHandler, commandHandler
│
└── services/
    └── ai.service.ts            # Add: chat(), getBriefing(), executeCommand()
                                 # (thin facades into packages/ai agents)
```

### New Files in `apps/frontend/`

```
apps/frontend/src/
├── components/
│   └── assistant/
│       ├── AssistantPanel.tsx        # Main sliding panel (right drawer)
│       ├── AssistantAvatar.tsx       # Three.js TARS entity (corner orb)
│       ├── ConversationThread.tsx    # Scrollable message history
│       ├── AssistantMessage.tsx      # Single message + typewriter animation
│       ├── UserMessage.tsx           # User bubble (simpler)
│       ├── AssistantInput.tsx        # Text input + mic button at bottom
│       ├── ToolConfirmCard.tsx       # "TARS wants to log: X — Accept / Edit / Dismiss"
│       ├── StartupBriefing.tsx       # Boot sequence overlay (1x/day)
│       └── QuickActionChips.tsx      # Suggested follow-up actions
│
├── hooks/
│   ├── useAssistant.ts              # Main hook — send, receive, history
│   ├── useAssistantActions.ts       # Frontend action executor (navigate, audio, etc)
│   ├── useStartupBriefing.ts        # Daily briefing logic + SSE consumption
│   └── useCommandMatcher.ts         # Frontend-side command detection (optional)
│
└── stores/
    └── assistant.store.ts           # Conversation history, panel state, TARS state
```

---

## 7. Backend — New Endpoints

### POST /api/ai/chat

The main conversational endpoint.

```typescript
// Request
{
  message: string,
  history?: ConversationTurn[],   // last 6 turns, optional
  // context assembled server-side from DB — do NOT send from frontend
}

// Response (non-streaming)
{
  success: true,
  data: {
    response: string,              // TARS's text response
    toolCall?: {                   // If agent wants to take an action
      id: string,
      tool: string,                // "log_activity" | "create_goal_draft" | etc
      params: object,              // Proposed parameters
      requiresConfirmation: boolean
    },
    intent: IntentType,
    agentUsed: string,
    latencyMs: number
  }
}
```

**Important:** Context is assembled server-side. Never trust the frontend to send context — it could be stale or manipulated. The backend fetches fresh PolarisContext from DB on every `/chat` call.

---

### GET /api/ai/briefing (SSE)

Startup briefing stream. Same pattern as existing `/api/ai/analyze-week/stream`.

```typescript
// Query params: none (context assembled server-side)
// Response: SSE stream
// event: data
// data: { chunk: string }  ← text chunks, typewriter on frontend
// event: done
// data: { quickActions: string[] }  ← suggested follow-up chips
```

Only fires if called. Frontend decides when (first open of the day). Rate limit: 1 call per day per session (enforced via `polaris:briefing-dismissed:YYYY-MM-DD`).

---

### POST /api/ai/command

Fast path for confirmed fixed commands. Skips LLM entirely.

```typescript
// Request
{ input: string }

// Response
{
  success: true,
  data: {
    matched: boolean,
    action: string,    // "audio.play" | "navigate" | etc
    params: object,
    executed: boolean  // always false — frontend executes
  }
}
```

Frontend executes the action based on `action` + `params`. Backend just does the pattern matching (or this can be fully client-side — the command registry is just a JSON file).

**Alternative:** Make CommandAgent fully client-side. It's just pattern matching — no reason to hit the backend for "play music". The command registry lives in `commandMatcher.ts` on the frontend. When a command matches, frontend executes directly, no API call. Only unmatched inputs go to `/api/ai/chat`. This is faster and simpler.

---

## 8. Frontend — Component Architecture

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

### AssistantAvatar (Three.js)

A floating entity positioned fixed in bottom-right corner (or wherever user prefers).

**Dark mode TARS:** A monolith-inspired rectangular black slab, 40x60px, subtle rotation, glows white on edges when active. Click to open panel. Pulsing glow when briefing is available.

**Light mode:** A softer circular orb, subtle gradient, professional.

**States:**
- **Idle:** Slow breathing pulse (scale 1.0 → 1.05 → 1.0)
- **Listening:** Faster pulse, color shifts to active accent
- **Processing:** Rotation + shimmer effect
- **Speaking:** Waveform-like deformation on the surface
- **Has briefing:** Notification dot, different idle color

```typescript
// Three.js implementation sketch
// Use @react-three/fiber canvas positioned absolutely
// The "monolith" is a BoxGeometry(1, 1.5, 0.2)
// Material: MeshStandardMaterial with emissive glow
// useFrame hook drives the animation state machine
// State managed via Zustand assistant.store.ts
```

**Research spike needed:** Three.js canvas positioned as a floating UI element inside a React app has known z-index and event bubbling quirks. Test this separately before integrating.

---

### StartupBriefing

A fullscreen overlay that plays once on first daily open. Lasts ~3 seconds, then transitions to Hub.

```
[Dark background, constellation]

  P O L A R I S          ← types in letter by letter
  ──────────────
  Initializing...        ← 0.5s pause
  Loading your context   ← 0.8s
  Analyzing patterns     ← 1.0s  (fake, for feel)
  Ready.                 ← 1.2s

  [TARS panel slides in from right with briefing text]
```

The fake "loading steps" are pure CSS animation. Real data loads in parallel. The briefing SSE starts fetching immediately on app load — by the time the animation finishes, the response is usually already streaming.

---

### ToolConfirmCard

Shows inside the conversation thread when TARS wants to mutate data.

```typescript
interface ToolConfirmCardProps {
  toolName: string                // "log_activity"
  params: object                  // Proposed values
  onAccept: (editedParams: object) => void
  onDismiss: () => void
  autoAcceptMs?: number           // If set, auto-accepts after N ms (with countdown)
}
```

For high-confidence activity logs: `autoAcceptMs={5000}` with a visible countdown ring. User can tap Edit or tap anywhere to cancel auto-accept. For goal creation, no auto-accept.

---

## 9. Voice Strategy (Input + Output)

### Input — Whisper (Already Works)

Existing `VoiceButton` + `useVoiceRecorder` + Whisper service. Keep as-is. Wire the transcript into `AssistantInput` so pressing the mic in the panel uses the same pipeline.

One change needed: the existing voice pipeline goes `audio → Whisper → parse_activity`. The new pipeline goes `audio → Whisper → AssistantDispatcher`. The AssistantInput mic should send to the dispatcher, not directly to the activity parser.

### Output — Speech Synthesis (POC)

For now: Web Speech API. Free, instant, no server. Robotic but functional.

```typescript
// hooks/useVoiceOutput.ts
export function useVoiceOutput() {
  const speak = (text: string) => {
    if (!window.speechSynthesis) return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.1    // slightly faster = less robotic
    utterance.pitch = 0.9   // slightly lower = more authoritative
    
    // Try to use a better voice if available
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v => 
      v.name.includes('Google') || v.name.includes('Microsoft')
    )
    if (preferred) utterance.voice = preferred
    
    window.speechSynthesis.speak(utterance)
  }
  
  const stop = () => window.speechSynthesis.cancel()
  
  return { speak, stop }
}
```

**When to speak:** Only the startup briefing (most impactful moment) and short confirmations like "Logged. 30 pages added to Reading." Long query responses stay text-only. Nobody wants their productivity tool reading them a paragraph.

**Future upgrade path:**
- ElevenLabs free tier: 10k chars/month, great quality, add when POC is stable
- Kokoro local TTS: Python sidecar (same pattern as Whisper), fully free, ~4GB model

---

## 10. Three.js Avatar

### Design Intent

Dark mode: **TARS-inspired monolith** — rectangular slab, matte black, edge-lit, minimal. Sits in bottom-right corner. Click to open/close the assistant panel.

Light mode: **Soft orb** — translucent white sphere with inner glow, professional.

### Implementation Approach

```typescript
// components/assistant/AssistantAvatar.tsx
// Small Canvas (80x80px) positioned fixed bottom-right
// Contains a single Three.js scene

import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { useAssistantStore } from '@/stores/assistant.store'

function TARSMonolith() {
  const meshRef = useRef()
  const { tarsState } = useAssistantStore()  // idle | listening | processing | speaking
  
  useFrame((state) => {
    // Idle: subtle breathing
    if (tarsState === 'idle') {
      meshRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.02
    }
    // Listening: faster pulse
    if (tarsState === 'listening') {
      meshRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.05
      // Shift emissive color
    }
    // Processing: rotate
    if (tarsState === 'processing') {
      meshRef.current.rotation.y += 0.02
    }
  })
  
  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[0.6, 1.2, 0.15]} />
      <meshStandardMaterial 
        color="#0a0a0a"
        emissive="#00d4aa"
        emissiveIntensity={tarsState === 'idle' ? 0.1 : 0.5}
        roughness={0.2}
        metalness={0.8}
      />
    </mesh>
  )
}

export function AssistantAvatar() {
  const { togglePanel } = useAssistantStore()
  
  return (
    <div 
      className="fixed bottom-6 right-6 w-12 h-20 cursor-pointer z-50"
      onClick={togglePanel}
    >
      <Canvas>
        <ambientLight intensity={0.2} />
        <pointLight position={[2, 2, 2]} intensity={1} color="#00d4aa" />
        <TARSMonolith />
      </Canvas>
    </div>
  )
}
```

### Known Three.js + React Issues to Watch

- Canvas inside a fixed div can have pointer-events issues. Set `style={{ pointerEvents: 'none' }}` on the Canvas, handle clicks on the wrapping div.
- `useFrame` runs on every render — guard with `if (!meshRef.current) return`
- The Canvas creates a WebGL context. Too many canvases on one page = context limit hit. You already have 3D backgrounds. Consider whether TARS should share a canvas or have its own. Own canvas is simpler to manage.
- On mobile, the fixed-position canvas may interact weirdly with scroll. Test on physical device.

---

## 11. Build Order

Do these in order. Each step is independently testable.

### Sprint 1 — TARS Backend Core (1-2 days, Dev A)

1. Add `PolarisContext` types to `@polaris/shared`
2. Build `buildContext.ts` in `packages/ai/src/context/`
3. Add `GroqProvider` to packages/ai/src/providers/
4. Build `BriefingAgent` (uses existing streaming infrastructure)
5. Add `/api/ai/briefing` SSE endpoint
6. Test with Groq first (fast feedback), then Gemma

**Done when:** `curl /api/ai/briefing` streams a personalized briefing with your actual streak and goals.

---

### Sprint 2 — TARS UI Foundation (1-2 days, Dev B)

1. Build `assistant.store.ts` (Zustand — panel state, conversation history, TARS state)
2. Build `AssistantPanel.tsx` shell (no AI yet, just the panel with fake messages)
3. Build `AssistantMessage.tsx` with typewriter animation
4. Build `AssistantInput.tsx` (text input + mic button)
5. Build `StartupBriefing.tsx` animation sequence
6. Wire `useStartupBriefing` to the `/api/ai/briefing` SSE
7. Wire panel open/close to a keyboard shortcut (`Cmd+/` or `Cmd+Space`)

**Done when:** App loads, briefing animation plays, text streams in from the real API.

---

### Sprint 3 — Command Agent + Basic Chat (2-3 days)

1. Build `commandMatcher.ts` on frontend (pure client-side, no API)
2. Wire `AssistantInput` → CommandMatcher → immediate action execution
3. Build `DispatcherAgent` (heuristic routing + Gemma fallback)
4. Build `/api/ai/chat` endpoint
5. Build `QueryAgent` (read-only, natural language answers)
6. Wire full chat flow: input → dispatch → query → response in panel

**Done when:** "How am I doing this week?" returns a natural language answer from your real data.

---

### Sprint 4 — Activity + Goal Agents (2-3 days)

1. Build `activity.tools.ts` and `goal.tools.ts` schemas
2. Build `ActivityAgent` with Gemma function calling
3. Build `ToolConfirmCard.tsx`
4. Wire confirm card to actual activity creation endpoint
5. Build `GoalsAgent` (same pattern)
6. Test full flow: "log 30 pages" → confirm card → accept → saved

**Done when:** End-to-end — voice or text → TARS logs an activity with your confirmation.

---

### Sprint 5 — TARS Avatar + Polish (2-3 days, Dev B)

1. Research spike: Three.js canvas as fixed floating element — test in isolation
2. Build `AssistantAvatar.tsx` with idle/listening/processing states
3. Wire avatar state to assistant.store.ts TARS state
4. Add `useVoiceOutput` hook (speechSynthesis)
5. Wire voice output to startup briefing and confirmations
6. Polish: transition animations, quick-action chips, mobile layout

**Done when:** TARS monolith sits in corner, pulses when active, full conversation works with voice.

---

### Sprint 6 — Session Memory (Add After Sprint 5 is stable)

1. Add conversation history to Zustand store (already designed above)
2. Include last 6 turns in `/api/ai/chat` payload
3. Test multi-turn: "what goals do I have?" → "tell me more about the reading one"
4. Tune context window — watch for Gemma getting confused with long histories

---

## 12. Critical Gotchas

### Agent Architecture

**⚠️ Context size must be capped.** An uncapped PolarisContext for a power user (20 goals, 500 activities) will overflow Gemma's 128K context window in practice because the model also needs space for the conversation, tools, and response. Hard cap: 10 goals, 7 days of history, each activity summary 1 line max.

**⚠️ Tool call validation is mandatory.** Gemma will occasionally return a tool call with wrong param types or missing required fields. Every tool call result must be run through Zod validation before being used. If validation fails → ask Gemma to retry once → if still fails → fall back to asking the user for clarification.

**⚠️ The dispatcher heuristic will misclassify edge cases.** "I want to read more this month" looks like `log_activity` but is actually `create_goal`. Test a diverse set of inputs. When the heuristic is unsure, default to `query` (safest — read-only) rather than `log_activity` (could create unwanted data).

**⚠️ Don't auto-execute writes, ever.** The temptation will be to add `autoAcceptMs` to more and more tool calls as it "works most of the time." Resist this. The cost of a wrongly auto-logged activity is low, but the trust erosion from TARS logging the wrong thing without asking is permanent. Keep auto-accept only for activities the NLP parser is >90% confident about.

### Frontend

**⚠️ The typewriter animation + SSE streaming is tricky to get right.** SSE sends chunks, but chunks don't align with words. You'll get partial words mid-chunk. Buffer chunks, split by spaces, animate word-by-word. Test with both fast (Groq) and slow (local Gemma) inference.

**⚠️ speechSynthesis queues.** If the user interrupts TARS mid-sentence and says something new, `speechSynthesis.cancel()` must be called before the new response starts speaking, or you'll get overlapping audio.

**⚠️ The assistant panel must not block the main UI.** It should be a drawer that pushes content, or an overlay with a clear close mechanism. Users will open it by accident. Make closing it one tap/click, always.

**⚠️ Mobile keyboard + fixed panel = chaos.** When the soft keyboard opens in the AssistantInput on mobile, it pushes the layout. The panel must use `position: fixed` with `env(safe-area-inset-bottom)` padding to handle this. Test on actual iOS and Android.

### AI

**⚠️ Gemma 4 function calling is new — test it independently first.** Before wiring it into the full stack, write a standalone test: send a single tool-calling request to Gemma and verify the output format. Don't assume it works until you've seen it output a valid `tool_call` object. Use Groq + llama3.3-70b first to verify the prompt is right, then port to Gemma.

**⚠️ The briefing runs on app load — it must not block the UI.** The SSE stream fires and forgets. If the briefing takes 15 seconds (slow Gemma), the app is already usable. The panel just shows a typing indicator until the stream arrives. Never `await` the briefing in the app initialization path.

**⚠️ Session history makes the context window grow.** After 10 turns, you're sending 10 turn history + PolarisContext + tool schemas + the new message. This adds up fast. Implement a sliding window: keep only last 6 turns. When the window is full, summarize the older turns into a single "earlier in this conversation" message.

---

## 13. Research Spikes Needed

Before Sprint 5, one dev should do these as isolated experiments (not in the main codebase):

### Spike 1 — Three.js Floating Canvas
**Question:** Can a Three.js Canvas render inside a `position: fixed` div without z-index/event issues?  
**Test:** Create a minimal React app with a Three.js canvas in a fixed div, verify clicks work, verify it doesn't break page scrolling, verify it works on mobile.  
**Time:** 2-3 hours

### Spike 2 — Gemma 4 Function Calling
**Question:** Does Gemma 4 e4b via Ollama reliably output tool_call JSON for the 6 tools defined?  
**Test:** Write a standalone script that calls Ollama with the tool schemas and 10 test inputs. Measure how often the output parses correctly.  
**Time:** 2-3 hours

### Spike 3 — Groq Provider Integration
**Question:** Does the existing provider interface work with Groq's API (OpenAI-compatible)?  
**Test:** Add GroqProvider as a thin wrapper around the OpenAI provider with a different base URL. Test with the briefing prompt.  
**Time:** 1-2 hours (Groq is OpenAI-compatible so this should be trivial)

### Spike 4 — SSE + Typewriter UX
**Question:** Does the streaming text feel good? Does it handle slow chunks gracefully?  
**Test:** Use the existing `/api/ai/analyze-week/stream` endpoint (already built) and build the typewriter component. Tune chunk buffering until it feels natural.  
**Time:** 2-3 hours

---

## Summary — What You're Building

In plain English: TARS is a floating Three.js monolith in the corner of your Polaris app. Click it (or press `Cmd+/`) and a panel slides in. TARS greets you in the morning with a personalized briefing that streams in with a typewriter effect. You can type or speak to it. It understands natural language commands, logs your activities (with your confirmation), creates goals, answers questions about your data, plays music, and navigates the app. It runs on Gemma 4 locally, degrades gracefully to a template-based response if Ollama is offline, and never touches your database without asking first.

The whole thing is built in 6 sprints, starting from a stable Phase 3 foundation, with the frontend avatar as the last piece (not the first).

---

*This document should be added to the Polaris Docs/ folder and updated as decisions are made during implementation.*
