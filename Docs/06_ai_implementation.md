# Polaris — AI Implementation Reference

This document maps the AI strategy ([05_ai_strategy.md](./05_ai_strategy.md)) to the actual codebase. Use it when working on AI features.

---

## 1. Providers (Current State)

| Provider | When Active | Implementation |
|----------|-------------|----------------|
| **MockProvider** | Default (no env vars) | `apps/backend/src/ai/providers/mock.ts` — keyword-based, in-process. No network, no API keys. |
| **OpenAIProvider** | `AI_PROVIDER=openai` + `OPENAI_API_KEY` | `apps/backend/src/ai/providers/openai.ts` — calls `https://api.openai.com/v1/chat/completions` (gpt-4o-mini). Falls back to MockProvider on failure. |
| **OllamaProvider** | Not implemented | Listed as future in 05_ai_strategy.md for privacy/offline use. |

---

## 2. AI Module Structure

```
apps/backend/src/ai/
├── index.ts              # parseActivity, re-exports
├── breakdown.ts          # Goal decomposition (breakdownGoal)
├── analyze-week.ts       # Weekly analysis (analyzeWeek)
├── prompts/
│   ├── activity-parse.ts
│   ├── goal-breakdown.ts
│   └── weekly-analysis.ts
├── providers/
│   ├── mock.ts
│   └── openai.ts
├── utils/
│   ├── buildContext.ts
│   └── validateResponse.ts
└── types.ts
```

The thin facade `apps/backend/src/services/ai.service.ts` re-exports from `ai/` for backward compatibility.

---

## 3. AI Endpoints

| Endpoint | Handler | Purpose |
|----------|---------|---------|
| `POST /api/ai/parse-activity` | `parseActivityHandler` | Parse raw text into structured activity fields |
| `POST /api/ai/breakdown` | `breakdownHandler` | Decompose a goal into sub-goals and suggested activities |
| `POST /api/ai/analyze-week` | `analyzeWeekHandler` | Generate behavioral insights from past week's metrics |

All endpoints are read-only (suggestions only — never mutate DB).

---

## 4. Shared Types

`packages/shared/src/types/ai.ts`:

- `AIActivityParse` — parse-activity result
- `AISubGoal`, `AISuggestedActivity`, `AIGoalBreakdown` — goal breakdown
- `AIWeeklyAnalysis` — weekly analysis (summary, insights, suggestions)

---

## 5. Frontend Integration

| Component | AI Feature |
|-----------|------------|
| `LogActivityForm` | "Parse with AI" → `AiSuggestionPanel` |
| `AiSuggestionPanel` | Shows provider badge (Mock/OpenAI), confidence, Apply/Dismiss |
| `GoalDetail` | "AI Breakdown" button → modal with sub-goals and suggested activities |
| `Dashboard` | "Analyze Week" button → modal with summary, insights, suggestions |

---

## 6. Adding a New AI Feature

1. Add shared type in `packages/shared/src/types/ai.ts`
2. Create prompt template in `apps/backend/src/ai/prompts/`
3. Implement logic in `apps/backend/src/ai/` (mock + OpenAI)
4. Add handler in `ai.controller.ts` and route in `routes/ai.ts`
5. Add UI trigger and modal/panel in the relevant page
