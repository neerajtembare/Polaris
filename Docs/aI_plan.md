AI Architecture, Folder Structure, and Phase 3 Expansion



1. How Does AI Work Without Ollama?

Ollama is not implemented. The current AI service has two providers:







Provider



When Active



How It Works





MockProvider



Default (no env vars)



Keyword-based, in-process. Uses regex patterns ("30 pages", "5km", "2 hours") and domain keyword matching to suggest goal, unit, and type. No network, no API keys, no background process.





OpenAIProvider



AI_PROVIDER=openai + OPENAI_API_KEY



Calls https://api.openai.com/v1/chat/completions (gpt-4o-mini). Falls back to MockProvider on failure.

When you said "AI works fine" you were almost certainly using MockProvider — it runs entirely in the Node.js process. No Ollama, no external services. The 05_ai_strategy.md doc lists Ollama as a future provider for privacy/offline use, but it is not built yet.



2. Proposed AI Folder Structure

Extract AI logic from the monolithic apps/backend/src/services/ai.service.ts into a dedicated ai/ module. Align with the prompt registry concept in Docs/05_ai_strategy.md.

apps/backend/src/ai/
├── index.ts              # Re-exports parseActivity, getProvider
├── prompts/
│   ├── index.ts          # Barrel export
│   ├── activity-parse.ts # System + user prompt templates for OpenAI
│   └── (future) goal-breakdown.ts, weekly-analysis.ts
├── providers/
│   ├── index.ts          # getProvider(), AIProvider interface
│   ├── mock.ts           # MockProvider (extracted from ai.service)
│   └── openai.ts         # OpenAIProvider (uses prompts from prompts/)
└── utils/
    ├── buildContext.ts   # GoalContext formatting, truncation
    └── validateResponse.ts # JSON parse + schema validation (optional Zod)

Key changes:





Move inline prompts from OpenAIProvider into prompts/activity-parse.ts as template functions (e.g. buildActivityParsePrompt(rawInput, goals)).



MockProvider keyword patterns could stay in mock.ts or move to prompts/mock-patterns.ts if you want them versioned.



ai.service.ts becomes a thin facade that imports from ai/ and re-exports for backward compatibility.



3. UI Improvements (Brainstorm)







Area



Current State



Improvement





AI visibility



"Parse with AI" button only when rawInput has text



Add a subtle "Try: read 30 pages" placeholder in rawInput; small "Powered by Mock/OpenAI" badge in suggestion panel





Provider indicator



No indication of Mock vs OpenAI



Show provider badge (e.g. "Mock" / "OpenAI") in AiSuggestionPanel so users know what's running





Low-confidence UX



Warning when confidence < 60%



Add "Edit before applying" hint; dim Apply button until user reviews





Empty states



Generic empty lists



Contextual empty states: "No goals yet — create one to link activities" on Today; "Log your first activity" with quick-start tips





Dashboard period



Week/month/year toggle



Add a "Last 7 days" vs "This week" clarification if needed; consider a small "vs last period" delta





Activity cards



Basic status + actions



Optional: show goal badge, unit/value summary on hover or in compact view





Mobile



Responsive sidebar



Ensure LogActivityForm and AiSuggestionPanel are touch-friendly; consider bottom sheet on mobile





Loading



Spinner on AI parse



Skeleton or inline "Parsing…" with estimated time hint for OpenAI



4. Additional AI Features (Phase 3 / 4)

From Docs/05_ai_strategy.md, the next use cases in priority order:







Priority



Feature



Trigger



Effort



Notes





1



Goal Decomposition



"AI Breakdown" on goal detail



Medium



New endpoint POST /api/ai/breakdown; new prompt; modal to review sub-goals/activities





2



Weekly Analysis



"Analyze Week" on dashboard



Medium



New endpoint POST /api/ai/analyze-week; uses getDashboardMetrics-style context; stores insight





3



Morning Planning



"Plan My Day" on Today



High



Needs 14-day activity patterns; new endpoint; Phase 4 per doc





4



Ollama Provider



Opt-in via AI_PROVIDER=ollama



Low–Medium



Add OllamaProvider class; call local http://localhost:11434/api/chat; same prompt interface

Recommended order: (1) AI folder refactor + prompt extraction, (2) Goal Decomposition, (3) Weekly Analysis. Morning Planning and Ollama can follow once you have more activity data and local-model needs.



5. Docs Review and Assessment







Doc



Purpose



Status





Docs/05_ai_strategy.md



AI philosophy, use cases, provider design, prompt registry



Strong reference; implementation lags (no prompt registry, no Ollama)





Docs/PROMPTS.md



Cursor/session prompts for development



Not app AI prompts; consider renaming to CURSOR_SESSION_PROMPTS.md to avoid confusion





Docs/AI_DEV_GUIDE.md



How to work with AI assistants when coding



Good protocol; some refs (e.g. 12_implementation_checklist.md) may be stale





Docs/ARCHITECTURE_ACTION_PLAN.md



Sprint tracking



Sprints 2, 4, 5 done per changelog; progress table may show old [ ] — minor sync issue

Recommendations:





Rename PROMPTS.md to CURSOR_SESSION_PROMPTS.md (or similar) so it's clear these are dev prompts, not app prompts.



Add a short "AI Architecture" section to README or a Docs/06_ai_implementation.md that maps 05_ai_strategy.md to the actual code (Mock vs OpenAI, no Ollama yet).



Update the action plan progress table so Sprints 2, 4, 5 show [x] if they're complete.



6. Implementation Order

flowchart TD
    subgraph Phase1 [Phase 1: AI Folder Refactor]
        A1[Create apps/backend/src/ai/ folder]
        A2[Extract prompts to prompts/activity-parse.ts]
        A3[Extract MockProvider to providers/mock.ts]
        A4[Extract OpenAIProvider to providers/openai.ts]
        A5[Thin ai.service.ts facade]
    end

    subgraph Phase2 [Phase 2: UI Polish]
        B1[Provider badge in AiSuggestionPanel]
        B2[rawInput placeholder hint]
        B3[Empty state improvements]
    end

    subgraph Phase3 [Phase 3: New AI Features]
        C1[Goal Decomposition endpoint + prompt]
        C2[Weekly Analysis endpoint + prompt]
    end

    Phase1 --> Phase2
    Phase2 --> Phase3

Suggested next steps:





Create the ai/ folder and extract prompts + providers (no behavior change).



Add provider badge and placeholder to LogActivityForm/AiSuggestionPanel.



Implement Goal Decomposition (new prompt, endpoint, UI button on GoalDetail).



Implement Weekly Analysis (new prompt, endpoint, UI button on Dashboard).



7. Summary





AI without Ollama: You're using MockProvider (keyword-based, in-process). No external services. OpenAI is opt-in via env vars.



AI folder: Centralize prompts and providers under apps/backend/src/ai/ with prompts/, providers/, and utils/ subfolders.



UI: Provider badge, rawInput hints, empty states, and touch-friendly modals are low-effort wins.



Next phases: Goal Decomposition and Weekly Analysis are the next logical AI features; Ollama can be added as a third provider when you want local/offline support.

