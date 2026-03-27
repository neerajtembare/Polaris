# Project Polaris — AI Strategy & Architecture

## 1. Philosophy

Polaris integrates AI as a **Strategic Coach**, not a system controller.

### Core Rules

| Rule | Description |
|------|-------------|
| AI suggests | AI generates recommendations, never executes automatically |
| User confirms | All AI-generated items require explicit acceptance |
| System decides | Business logic (progress, metrics) is deterministic |
| Graceful degradation | System works fully without AI |

AI must never:
- Automatically mutate database state
- Block core functionality
- Be required for system operation
- Run in background without user trigger (MVP)

**Polaris must remain fully usable without AI.**

---

# 2. AI Use Cases (Priority Order)

| Priority | Use Case | Phase | Description |
|----------|----------|-------|-------------|
| 1 | Activity Parsing | Phase 3 | Parse "I saved ₹500 today" into structured activity |
| 2 | Goal Categorization | Phase 3 | Suggest which goal an activity contributes to |
| 3 | Goal Decomposition | Phase 3 | Break down "Learn Python" into sub-goals/activities |
| 4 | Weekly Analysis | Phase 3 | Generate behavioral insights from activity data |
| 5 | Morning Planning | Phase 4 | Suggest today's activities based on patterns |
| 6 | Pattern Detection | Phase 4 | Detect recurring behaviors, suggest recurrence |
| 7 | Predictive Insights | Phase 5 | Forecast goal completion, identify risk patterns |

---

# 3. AI Invocation Model

AI is invoked via **explicit user actions** only:

```
┌─────────────────────────────────────────────┐
│            User Triggers AI                  │
│  (Button click, right-click menu, etc.)     │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│         Backend AI Endpoint                  │
│  POST /api/ai/parse-activity                │
│  POST /api/ai/breakdown                     │
│  POST /api/ai/analyze-week                  │
│  POST /api/ai/suggest-plan                  │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│           AI Service Layer                   │
│  1. Fetch context from database             │
│  2. Build prompt from template              │
│  3. Call AI adapter                         │
│  4. Validate response schema                │
│  5. Return suggestions (NOT saved)          │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│         Frontend Shows Preview               │
│  User reviews, edits, accepts/rejects       │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│        User Accepts → Save to DB             │
│  Standard CRUD endpoints                    │
└─────────────────────────────────────────────┘
```

**No background AI execution. No auto-popups. No startup-triggered AI calls.**

---

# 4. Provider-Agnostic Architecture

## 4.1 Why Provider-Agnostic?

- **Development flexibility**: Start with cloud APIs (better quality, faster iteration)
- **Production flexibility**: Swap to local models when ready
- **Cost optimization**: Switch providers based on usage
- **Testing**: Mock provider for tests

## 4.2 Provider Interface

```typescript
interface AIProvider {
  readonly name: string;
  readonly supportsStructuredOutput: boolean;
  
  isAvailable(): Promise<boolean>;
  
  complete(options: AICompletionOptions): Promise<AIResponse>;
}

interface AICompletionOptions {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  responseSchema?: JSONSchema;  // For structured output
}

interface AIResponse {
  success: boolean;
  parsed?: object;              // Validated structured response
  raw: string;                  // Raw text response
  metadata: {
    provider: string;
    model: string;
    tokensUsed: number;
    latencyMs: number;
    cached: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
}
```

## 4.3 Supported Providers

| Provider | Type | Best For | JSON Support |
|----------|------|----------|--------------|
| OpenAI | Cloud | Development, high quality | Native |
| Claude | Cloud | Nuanced analysis | Native |
| Ollama | Local | Privacy, offline | Via prompting |
| Mock | Testing | Unit tests | Hardcoded |

## 4.4 Configuration

```typescript
// config/ai.config.ts
export const aiConfig = {
  // Primary provider
  provider: process.env.AI_PROVIDER || 'openai',
  
  // Model per provider
  models: {
    openai: 'gpt-4o-mini',
    claude: 'claude-3-haiku-20240307',
    ollama: 'llama3:8b',
    mock: 'mock'
  },
  
  // Fallback when primary fails
  fallbackProvider: 'mock',
  
  // Timeouts
  timeout: 30000,
  
  // Caching
  cacheEnabled: true,
  cacheTTL: 86400,  // 24 hours
  
  // Retry policy
  retryOnInvalidJson: true,
  maxRetries: 1
};
```

---

# 5. Prompt Management System

## 5.1 Prompt Registry

All prompts centrally defined with versioning:

```typescript
// ai/prompt.registry.ts
export const promptRegistry = {
  'activity-parse': {
    id: 'activity-parse',
    version: '1.0.0',
    description: 'Parse natural language into structured activity',
    systemPrompt: `You are an activity parser for a goal tracking app.
Parse the user's input into a structured activity.
Always respond with valid JSON matching the schema.`,
    
    userPromptTemplate: `
Parse this activity: "{{input}}"

Available goals:
{{#each goals}}
- {{this.id}}: {{this.title}} ({{this.target_unit}})
{{/each}}

Return JSON:
{
  "title": "parsed title",
  "activity_type": "quantity|duration|completion",
  "value": number or null,
  "unit": "string or null",
  "suggested_goal_id": "goal id or null",
  "confidence": 0.0-1.0
}`,
    
    responseSchema: activityParseSchema,
    maxTokens: 300,
    temperature: 0.2
  },
  
  'goal-breakdown': { ... },
  'weekly-analysis': { ... },
  'morning-plan': { ... },
  'pattern-detect': { ... }
};
```

## 5.2 Prompt Versioning Benefits

- **Reproducibility**: Same prompt version → same behavior
- **A/B testing**: Compare versions
- **Regression debugging**: Identify when prompts degraded
- **Model comparison**: Test same prompt across providers

---

# 6. Use Case Details

## 6.1 Activity Parsing (Phase 3)

**Trigger:** User types natural language in activity input field

**Input:**
```json
{
  "raw_input": "I saved ₹500 by skipping lunch",
  "goals": [
    { "id": "g1", "title": "Save ₹1L this year", "target_unit": "₹" },
    { "id": "g2", "title": "Get fit", "target_unit": null }
  ]
}
```

**AI Output:**
```json
{
  "title": "Saved ₹500 by skipping lunch",
  "activity_type": "quantity",
  "value": 500,
  "unit": "₹",
  "suggested_goal_id": "g1",
  "confidence": 0.95
}
```

**UX Flow:**
1. User types in input field
2. On blur/submit, AI parses (async)
3. Form auto-fills with suggestions
4. User reviews/edits
5. User confirms → activity saved

---

## 6.2 Goal Decomposition (Phase 3)

**Trigger:** User clicks "AI Breakdown" on a goal

**Input:**
```json
{
  "goal": {
    "title": "Learn Python",
    "description": "Become proficient in Python for data analysis",
    "timeframe": "long-term",
    "target_date": "2026-12-31"
  }
}
```

**AI Output:**
```json
{
  "sub_goals": [
    {
      "title": "Complete Python fundamentals course",
      "timeframe": "medium-term",
      "target_date": "2026-04-30",
      "rationale": "Foundation before advanced topics"
    },
    {
      "title": "Build 3 data analysis projects",
      "timeframe": "medium-term", 
      "target_value": 3,
      "target_unit": "projects"
    }
  ],
  "suggested_activities": [
    {
      "title": "Study Python basics",
      "activity_type": "duration",
      "frequency": "daily",
      "suggested_duration": 60
    }
  ]
}
```

**UX Flow:**
1. User triggers breakdown
2. Loading indicator shown
3. Preview modal displays suggestions
4. User can accept/edit/reject each item
5. Accepted items saved via standard API

---

## 6.3 Weekly Analysis (Phase 3)

**Trigger:** User clicks "Analyze Week" on dashboard

**Context sent to AI:**
```json
{
  "period": { "start": "2026-02-03", "end": "2026-02-09" },
  "activities_completed": 24,
  "activities_skipped": 4,
  "goals_summary": [
    { "title": "Save ₹1L", "progress": 15, "activities": 8 },
    { "title": "Learn Python", "hours": 6, "activities": 5 }
  ],
  "growth_vs_maintenance": { "growth": 18, "maintenance": 6 },
  "streak": 5,
  "comparison": { "last_week_activities": 20 }
}
```

**AI Output:**
```json
{
  "summary": "Strong week with 24 completed activities, up 20% from last week. Python study consistent at 6 hours. Savings on track.",
  "consistency_score": 82,
  "strengths": [
    "Consistent Python study (5 days)",
    "Maintained 5-day growth streak",
    "Savings activities well-distributed"
  ],
  "weaknesses": [
    "4 skipped activities, mostly on Wednesday",
    "No workout activities logged"
  ],
  "recommendations": [
    "Consider lighter Wednesday schedule",
    "Add fitness goal if relevant"
  ],
  "patterns_detected": [
    "Most productive on Tuesday (6 activities)",
    "Savings tend to happen on weekdays"
  ]
}
```

**Persistence:**
- Full insight saved to `insights` table
- Includes raw prompt + response for debugging
- Never deleted (longitudinal data)

---

## 6.4 Morning Planning (Phase 4)

**Trigger:** User clicks "Plan My Day"

**Context sent to AI:**
```json
{
  "date": "2026-02-12",
  "day_of_week": "Thursday",
  "active_goals": [...],
  "recent_activities": [...],        // Last 14 days
  "recurrence_rules": [...],         // Active recurrences
  "patterns": {
    "typical_thursday": ["Python study", "Walk"],
    "recent_focus": "savings"
  }
}
```

**AI Output:**
```json
{
  "suggested_activities": [
    {
      "title": "Study Python (Chapter 5)",
      "activity_type": "duration",
      "value": 60,
      "unit": "minutes",
      "goal_id": "g2",
      "rationale": "You've studied Python 4 of last 5 Thursdays",
      "confidence": 0.85
    },
    {
      "title": "Review savings for this week",
      "activity_type": "completion",
      "goal_id": "g1",
      "rationale": "Weekly savings check pattern detected",
      "confidence": 0.7
    }
  ],
  "notes": "Light day suggested - you had high activity yesterday"
}
```

**UX Flow:**
1. User triggers morning planning
2. AI generates suggestions
3. Modal shows each suggestion with rationale
4. User accepts/rejects each
5. Accepted items added as "planned" for today

---

## 6.5 Pattern Detection (Phase 4)

**Background context building (not real-time AI):**

Service analyzes events table to detect:
- Activities that repeat on same day/time
- Consistent weekly patterns
- Goal-activity correlations

**AI involvement:**
- Periodically (weekly) AI reviews patterns
- Suggests: "You do yoga every Sunday. Make it recurring?"
- User accepts → creates `recurrence_rule`

---

# 7. Schema Enforcement

## 7.1 Response Validation

Every AI response validated against predefined JSON schema:

```typescript
// ai/schemas/activity-parse.schema.ts
export const activityParseSchema = z.object({
  title: z.string().min(1).max(200),
  activity_type: z.enum(['quantity', 'duration', 'completion']),
  value: z.number().nullable(),
  unit: z.string().nullable(),
  suggested_goal_id: z.string().nullable(),
  confidence: z.number().min(0).max(1)
});
```

## 7.2 Validation Flow

```typescript
async function callAIWithValidation(promptId: string, context: object) {
  const prompt = buildPrompt(promptId, context);
  const response = await aiAdapter.complete(prompt);
  
  // First validation attempt
  const schema = getSchema(promptId);
  const parsed = tryParse(response.raw, schema);
  
  if (parsed.success) {
    return { ...response, parsed: parsed.data };
  }
  
  // Retry with correction prompt
  if (config.retryOnInvalidJson) {
    const correctionPrompt = buildCorrectionPrompt(response.raw, schema);
    const retryResponse = await aiAdapter.complete(correctionPrompt);
    const retryParsed = tryParse(retryResponse.raw, schema);
    
    if (retryParsed.success) {
      return { ...retryResponse, parsed: retryParsed.data };
    }
  }
  
  // Log and fail gracefully
  logAIFailure(promptId, response);
  return { 
    success: false, 
    error: { code: 'AI_PARSE_ERROR', message: 'Invalid response format' }
  };
}
```

---

# 8. Caching Strategy

## 8.1 Cache Key Generation

```typescript
function generateCacheKey(promptId: string, context: object): string {
  const normalized = JSON.stringify(context, Object.keys(context).sort());
  return crypto.createHash('sha256')
    .update(`${promptId}:${normalized}`)
    .digest('hex');
}
```

## 8.2 Cache Behavior

| Scenario | Caching |
|----------|---------|
| Same activity input | Return cached parse |
| Same goal breakdown request | Return cached (24h) |
| Weekly analysis | Cache per week period |
| Morning planning | No cache (context changes daily) |

## 8.3 Cache Storage

MVP: In-memory + SQLite table for persistence
Future: Redis for multi-instance

---

# 9. Context Window Strategy

**Rule:** Never send entire database to AI

## 9.1 Context Limits

| Use Case | Max Context |
|----------|-------------|
| Activity Parsing | 10 most recent goals |
| Goal Breakdown | Goal + parent + siblings |
| Weekly Analysis | Summarized week data only |
| Morning Planning | 14-day activity summary |

## 9.2 Context Summarization

```typescript
function buildWeeklyContext(startDate: Date, endDate: Date) {
  // Don't send raw activities - send summaries
  return {
    period: { start: formatDate(startDate), end: formatDate(endDate) },
    activities_completed: countCompleted(startDate, endDate),
    activities_skipped: countSkipped(startDate, endDate),
    goals_summary: summarizeGoals(startDate, endDate),
    growth_vs_maintenance: countByCategory(startDate, endDate),
    streak: calculateStreak(),
    comparison: {
      last_week_activities: countCompleted(subWeek(startDate), subWeek(endDate))
    }
  };
}
```

---

# 10. Failure Handling

## 10.1 AI Unavailable

```typescript
if (!await aiAdapter.isAvailable()) {
  return {
    success: false,
    error: {
      code: 'AI_UNAVAILABLE',
      message: 'AI assistant is offline. Please try again later.',
      fallback: 'manual_entry'
    }
  };
}
```

**UI Response:** Show "Brain Offline" indicator, enable manual mode

## 10.2 Invalid Response

- Retry once with correction prompt
- If still invalid: log, return error, allow manual entry
- Never crash the app

## 10.3 Timeout

- 30 second timeout per request
- On timeout: return error, suggest retry
- Don't block UI

---

# 11. Deterministic vs AI Responsibilities

| Deterministic (Backend Logic) | AI Responsibilities |
|-------------------------------|---------------------|
| Progress calculation | Suggest goal decomposition |
| Streak counting | Parse natural language input |
| Consistency metrics | Generate behavioral insights |
| Activity → goal linking | Suggest activity categorization |
| Data validation | Pattern interpretation |
| Event logging | Morning planning suggestions |

**The database is the source of truth. AI is an interpretation layer.**

---

# 12. AI Readiness Checklist (Phase 1-2)

Build these NOW to enable AI LATER:

- [x] Event logging with timestamps and context
- [x] Raw input storage on activities
- [x] Goals with clear targets and units
- [x] Activity types (quantity, duration, completion)
- [x] Service layer abstraction (AI calls same services)
- [x] API structure that accepts suggestions and confirms
- [x] Provider-agnostic adapter interface defined
- [x] Structured form inputs that capture all needed fields
- [x] Notes/context field for additional information

---

# 13. Progressive Input Strategy (Form → NLP)

## 13.1 Philosophy: Form-First, NLP-Assists

| Phase | Input Method | AI Role |
|-------|-------------|---------|
| **MVP (Phase 1-2)** | Structured form only | None - deterministic |
| **Phase 3** | Form + optional NLP shortcut | Parse NLP → auto-fill form |
| **Phase 4+** | NLP-first (form as fallback) | Primary parser |

**Key Principle:** The form is always the final step. NLP is a convenience layer that fills the form.

## 13.2 Why Form-First for MVP

| Benefit | Explanation |
|---------|-------------|
| Zero AI dependency | Works offline, no API costs, no failures |
| Perfect data quality | Forced structure = clean database from day 1 |
| Faster to build | Form validation is straightforward |
| Better UX baseline | Users always know what to enter |
| Easier AI training | Clean form data = good training examples for later |
| Graceful upgrade | NLP becomes a shortcut, not a requirement |

## 13.3 MVP Activity Form

```
┌─────────────────────────────────────────────────────────────┐
│  Log Activity                                               │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What did you do? *                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Read                                              ▼  │   │
│  └─────────────────────────────────────────────────────┘   │
│  Common: Read | Exercised | Saved | Studied | Worked |     │
│          Practiced | Completed | Other                     │
│                                                             │
│  Describe it: *                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Atomic Habits - Chapter 3                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │ Amount: *       │  │ Unit:                        ▼  │  │
│  │ 30              │  │ pages                           │  │
│  └─────────────────┘  └─────────────────────────────────┘  │
│  (Leave blank for completion-only activities)              │
│                                                             │
│  Related Goal: (optional)                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Read 12 books this year                           ▼  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │ Date:           │  │ Status:                         │  │
│  │ Today        ▼  │  │ ○ Planned  ● Completed         │  │
│  └─────────────────┘  └─────────────────────────────────┘  │
│                                                             │
│  Notes: (optional)                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Great chapter about habit stacking. Want to try     │   │
│  │ linking my coffee routine to reading.               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                              [Cancel]  [Save Activity]      │
└─────────────────────────────────────────────────────────────┘
```

## 13.4 Form Field Mapping

| Form Field | Database Field | AI Extraction (Phase 3) |
|------------|----------------|-------------------------|
| What did you do? | → activity verb | Extract action verb |
| Describe it | → title | Extract object/subject |
| Amount | → value | Extract numeric value |
| Unit | → unit | Extract unit (pages, mins, ₹) |
| Related Goal | → goal_id | Suggest matching goal |
| Date | → activity_date | Extract date if mentioned |
| Status | → status | Infer from tense |
| Notes | → notes | Pass through |
| Full input | → raw_input | Store original text |

## 13.5 Phase 3: NLP Layer on Top of Form

```
┌─────────────────────────────────────────────────────────────┐
│  Log Activity                                               │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ⚡ Quick Entry: (AI-assisted)                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Read 30 pages of Atomic Habits                   🔮  │   │
│  └─────────────────────────────────────────────────────┘   │
│  Type naturally, AI will fill the form below ↓             │
│                                                             │
│  ─────────────── OR enter directly ───────────────         │
│                                                             │
│  What did you do? *                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Read                                   [auto-filled] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Describe it: *                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Atomic Habits                          [auto-filled] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Amount: [30]  Unit: [pages]              [auto-filled]     │
│                                                             │
│  Related Goal: [Read 12 books ▼]          [AI suggested]    │
│                                                             │
│  [User reviews, edits if needed, then saves]               │
│                                                             │
│                              [Cancel]  [Save Activity]      │
└─────────────────────────────────────────────────────────────┘
```

## 13.6 AI Parse Response Schema

```typescript
// When AI parses quick entry text
interface AIActivityParse {
  // Direct form field mappings
  action: string;           // → "What did you do?"
  subject: string;          // → "Describe it"
  
  // Structured extraction
  activity_type: 'quantity' | 'duration' | 'completion';
  value: number | null;     // → Amount
  unit: string | null;      // → Unit
  
  // AI suggestions (user confirms)
  suggested_goal_id: string | null;
  suggested_goal_title: string | null;
  
  // Metadata
  confidence: number;       // 0.0 - 1.0
  parsed_date: string | null;  // If date mentioned in input
  
  // For display
  display_title: string;    // Formatted title for activity
}
```

## 13.7 Example Parse Flow

**User types:** `"Saved ₹500 by skipping lunch today"`

**AI returns:**
```json
{
  "action": "Saved",
  "subject": "by skipping lunch",
  "activity_type": "quantity",
  "value": 500,
  "unit": "₹",
  "suggested_goal_id": "uuid-savings-goal",
  "suggested_goal_title": "Save ₹1,00,000 this year",
  "confidence": 0.93,
  "parsed_date": "2026-02-12",
  "display_title": "Saved ₹500 by skipping lunch"
}
```

**Form auto-fills:**
- What: Saved
- Describe: by skipping lunch  
- Amount: 500
- Unit: ₹
- Goal: Save ₹1,00,000 this year ✨ (AI suggested)
- Date: Today

**User reviews → confirms → saves**

---

# 14. Storage vs Display Separation

## 14.1 Principle

**Store atomic data. Generate display text.**

The database stores structured, queryable fields. Display text is generated from those fields when rendering UI.

## 14.2 Activity Storage

```typescript
// What gets stored in database
interface StoredActivity {
  id: string;
  title: string;              // "Atomic Habits - Chapter 3"
  activity_type: 'quantity' | 'duration' | 'completion';
  value: number | null;       // 30
  unit: string | null;        // "pages"
  goal_id: string | null;
  activity_date: Date;
  status: 'planned' | 'completed' | 'skipped';
  notes: string | null;
  raw_input: string | null;   // Original NLP text (Phase 3+)
  created_at: Date;
  updated_at: Date;
}
```

## 14.3 Display Generation

```typescript
// Generate display from stored data
function renderActivityDisplay(activity: StoredActivity): ActivityDisplay {
  // Build title from structured data
  let displayTitle = activity.title;
  if (activity.value && activity.unit) {
    displayTitle = `${activity.title} (${activity.value} ${activity.unit})`;
  }
  
  // Build subtitle
  let subtitle = '';
  if (activity.goal) {
    subtitle = `📎 ${activity.goal.title}`;
    if (activity.value && activity.goal.target_value) {
      subtitle += ` • +${activity.value} ${activity.unit}`;
    }
  }
  
  return {
    title: displayTitle,
    subtitle,
    status_icon: STATUS_ICONS[activity.status],
    date_display: formatRelativeDate(activity.activity_date)
  };
}
```

## 14.4 Analysis Storage

For AI-generated insights, same principle applies:

**Store structured findings:**
```json
{
  "insight_type": "weekly_summary",
  "period": { "start": "2026-02-03", "end": "2026-02-09" },
  
  "metrics": {
    "activities_completed": 24,
    "activities_skipped": 4,
    "consistency_score": 82,
    "streak_days": 5
  },
  
  "findings": [
    {
      "type": "strength",
      "category": "consistency", 
      "subject": "Python study",
      "metric": "5 of 7 days",
      "impact": "positive"
    },
    {
      "type": "weakness",
      "category": "pattern",
      "subject": "Wednesday activities",
      "metric": "4 skipped",
      "impact": "negative"
    }
  ],
  
  "recommendations": [
    {
      "action": "reduce",
      "target": "Wednesday schedule",
      "reason": "High skip rate detected"
    }
  ]
}
```

**Generate prose on display:**
```typescript
function renderWeeklyInsight(insight: StoredInsight): string {
  const { metrics, findings, recommendations } = insight;
  
  // Can be template-based (fast, no AI)
  const strengths = findings
    .filter(f => f.type === 'strength')
    .map(f => `${f.subject} (${f.metric})`)
    .join(', ');
  
  const weaknesses = findings
    .filter(f => f.type === 'weakness')
    .map(f => f.subject)
    .join(', ');
  
  return `
    **Week Summary**
    
    You completed ${metrics.activities_completed} activities with a 
    ${metrics.consistency_score}% consistency score.
    
    **Strengths:** ${strengths}
    
    **Watch out:** ${weaknesses}
    
    **Suggestion:** ${recommendations[0]?.reason || 'Keep it up!'}
  `;
}

// OR use AI to generate prose from structured data (richer output)
async function generateInsightProse(insight: StoredInsight): Promise<string> {
  return await aiService.complete({
    promptId: 'insight-to-prose',
    context: insight
  });
}
```

## 14.5 Benefits of Separation

| Benefit | Explanation |
|---------|-------------|
| **Queryable data** | Can filter/sort by any field |
| **Consistent storage** | Same structure regardless of input method |
| **Flexible display** | Different views from same data |
| **Cacheable** | Store once, render many times |
| **AI cost savings** | Don't re-parse to re-display |
| **Debuggable** | Structured data easy to validate |
| **Future-proof** | Improve display without re-processing |

---

# 15. AI Evolution Roadmap

| Phase | AI Capability | Prerequisites |
|-------|---------------|---------------|
| Phase 1-2 | None | Build solid manual system |
| Phase 3 | Parsing, breakdown, analysis | Stable data model, event logs |
| Phase 4 | Morning planning, pattern detection | 30+ days of activity data |
| Phase 5 | Predictive insights, learned assistant | 90+ days of data, pattern library |

---

# 16. Testing Strategy

## 16.1 Mock Provider

```typescript
class MockAIProvider implements AIProvider {
  name = 'mock';
  supportsStructuredOutput = true;
  
  async isAvailable() { return true; }
  
  async complete(options) {
    // Return predefined responses based on prompt ID
    return mockResponses[extractPromptId(options.prompt)];
  }
}
```

## 16.2 Integration Tests

- Test all AI endpoints with mock provider
- Test schema validation with malformed responses
- Test retry logic
- Test timeout handling
- Test fallback behavior

---

# 17. Performance Targets

| Metric | Target |
|--------|--------|
| Activity parsing latency | < 2 seconds |
| Goal breakdown latency | < 5 seconds |
| Weekly analysis latency | < 10 seconds |
| Cache hit ratio | > 70% for parsing |
| Schema validation success | > 95% |

---

# 18. Core Principle

**Polaris is not AI-driven. Polaris is data-driven with AI-assisted interpretation.**

The database is the source of truth.
AI helps you understand and act on your data.
AI never acts without your explicit confirmation.
