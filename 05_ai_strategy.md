# Project Polaris — AI Strategy & LLM Architecture

## 1. Philosophy

Polaris integrates AI as a Strategic Assistant, not as a system controller.

Core rule:
AI suggests. The system decides. The user confirms.

AI must never:
- Automatically mutate database state
- Block core functionality
- Be required for system operation

Polaris must remain fully usable without AI.

---

# 2. AI Scope (MVP)

AI functionality is limited to explicit user-triggered actions:

1. Goal Breakdown
2. Weekly Analysis
3. Daily Analysis
4. Revision Suggestions (on demand)

No background AI execution.
No automatic popups.
No startup-triggered AI calls.

---

# 3. AI Invocation Model

AI is invoked via dedicated endpoints:

- POST /api/ai/breakdown
- POST /api/ai/analyze
- POST /api/ai/revision

Each request must:

1. Fetch deterministic data from database.
2. Summarize context.
3. Attach prompt template.
4. Call LLM adapter.
5. Validate output.
6. Return structured result.
7. Persist insight if applicable.

---

# 4. LLM Adapter Architecture

The AI adapter is isolated from business logic.

Responsibilities:

- Connect to Ollama
- Load prompt template
- Inject context
- Send request
- Enforce JSON output
- Validate schema
- Retry once if invalid
- Return:
  {
    parsed_data,
    raw_response,
    metadata
  }

The adapter does NOT:
- Write to database
- Trigger state changes
- Modify tasks or goals

---

# 5. Prompt Management System

All prompts are centrally defined in:

prompt.registry

Each prompt includes:

- prompt_id
- version
- description
- expected JSON schema
- token limit
- temperature

Prompt versioning ensures:

- Reproducibility
- A/B testing
- Regression debugging
- Model comparison

---

# 6. Structured Output Enforcement

All AI responses must follow strict JSON schema.

Example types:

Goal Breakdown Output:
{
  sub_goals: [
    { title, timeframe, metric, target }
  ],
  suggested_tasks: [
    { title, frequency, duration }
  ]
}

Weekly Analysis Output:
{
  summary: string,
  productivity_score: number,
  strengths: string[],
  weaknesses: string[],
  recommendations: string[]
}

If JSON parsing fails:

1. Retry once with correction instruction.
2. If still invalid:
   - Return controlled error.
   - Log failure.
   - Do not crash system.

---

# 7. AI Output Persistence

AI responses are stored in insights table with:

- prompt_id
- version
- model_name
- raw_prompt
- raw_response
- parsed_summary
- metrics
- confidence_score
- timestamp

No AI output is discarded.

This enables:

- Longitudinal behavioral dataset
- Prompt refinement
- Model comparison
- Personal analytics archive

---

# 8. Context Window Strategy

AI must never receive entire raw database.

Instead:

For Weekly Analysis:
- Tasks completed (last 7 days)
- Tasks skipped
- Total durations
- Streak data
- Category distribution

For Goal Breakdown:
- Goal title
- Description
- Target date
- Current progress
- Parent context

Older data must be summarized before sending.

---

# 9. Caching Strategy

To reduce repeated LLM cost:

Cache key:
hash(prompt + structured context)

Cache duration:
Default 24 hours

If identical request made:
Return cached structured result.

Cache stored locally.

---

# 10. Failure Handling

If Ollama is not running:

Backend returns:
{
  status: "brain_offline"
}

Frontend displays:
"AI unavailable. Manual mode active."

If AI returns invalid JSON:

- Retry once
- Log event
- Return:
  { status: "ai_parse_error" }

System must not crash under any AI failure.

---

# 11. Deterministic vs AI Responsibilities

Deterministic (Backend Logic):

- Goal progress rollups
- Streak calculations
- Date validation
- Task scheduling
- Data compaction
- Log management

AI Responsibilities:

- Suggest decomposition
- Generate insights
- Suggest improvements
- Pattern interpretation

Separation is strict.

---

# 12. Performance Constraints

AI calls must:

- Be asynchronous
- Not block event loop
- Return timeout error if exceeding threshold
- Show loading state in UI

Acceptable response time:
5–20 seconds (local LLM dependent)

---

# 13. Evaluation & Quality Control

AI output quality measured by:

- Schema validation success rate
- User acceptance rate of suggestions
- Stability across prompt versions
- Reduction in malformed outputs
- Insight usefulness over time

Future possibility:
Store user feedback on AI suggestions.

---

# 14. Multi-Model Support (Future)

AI adapter must be abstracted to support:

- Llama 8B
- Larger local models
- Optional cloud models

Model configuration stored in config file.

---

# 15. AI Evolution Roadmap

Phase 1:
Manual-trigger AI only.

Phase 2:
Optional "Suggest analysis" banner (not popup).

Phase 3:
Scheduled weekly analysis (opt-in).

Phase 4:
Predictive behavioral scoring.

All upgrades must maintain deterministic core integrity.

---

# 16. Core Principle

Polaris is not AI-driven.
Polaris is data-driven with AI-assisted interpretation.

The database is the source of truth.
AI is an interpretation layer.
