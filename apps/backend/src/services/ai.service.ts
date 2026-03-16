/**
 * @file services/ai.service.ts
 * @description Provider-agnostic AI service for activity parsing.
 *   Phase 3 MVP: supports a MockProvider (no API key needed) and an
 *   OpenAI provider (opt-in via AI_PROVIDER=openai + OPENAI_API_KEY env vars).
 *
 *   Architecture principle from 05_ai_strategy.md:
 *   - AI suggests, never saves
 *   - Graceful degradation: falls back to mock if real provider fails
 *   - Provider-agnostic interface so adding Claude / Ollama is one new class
 *
 * @module @polaris/backend/services
 *
 * @relatedFiles
 *   - src/controllers/ai.controller.ts
 *   - Docs/05_ai_strategy.md
 */

import type { ActivityType, AIActivityParse } from '@polaris/shared';

// Re-export so controllers can import from this service without touching shared
export type { AIActivityParse };

// ---------------------------------------------------------------------------
// Service-local types
// ---------------------------------------------------------------------------

/** A single active goal sent as context to the AI */
export interface GoalContext {
  id:          string;
  title:       string;
  targetUnit:  string | null;
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

interface AIProvider {
  readonly name: string;
  parse(rawInput: string, goals: GoalContext[]): Promise<AIActivityParse>;
}

// ---------------------------------------------------------------------------
// MockProvider — keyword-based, deterministic, no API key required
// ---------------------------------------------------------------------------

/**
 * Simulates AI parsing by matching common keywords.
 * Confidence is set to 0.7 for partial matches and 0.9 for strong matches.
 * This is the default provider and always available.
 */
class MockProvider implements AIProvider {
  readonly name = 'mock';

  async parse(rawInput: string, goals: GoalContext[]): Promise<AIActivityParse> {
    const lower = rawInput.toLowerCase();

    // ---- Detect activity type + unit from keywords ----
    type ParsedFields = { activityType: ActivityType; value: number | null; unit: string | null };
    const fields = this.extractFields(lower);

    // ---- Match goal from keywords in the input ----
    const { goalId, goalTitle, confidence } = this.matchGoal(lower, goals, fields.unit);

    // ---- Build a clean title ----
    const title = this.buildTitle(rawInput);

    return {
      title,
      activityType:       fields.activityType,
      value:              fields.value,
      unit:               fields.unit,
      suggestedGoalId:    goalId,
      suggestedGoalTitle: goalTitle,
      confidence,
      provider:           this.name,
    };
  }

  /** Extract numeric value, unit, and activity type from raw text */
  private extractFields(lower: string): { activityType: ActivityType; value: number | null; unit: string | null } {
    // Patterns: "30 pages", "5km", "₹500", "2 hours", "45 minutes", "3 books"
    const patterns: Array<{ regex: RegExp; unit: string; activityType: ActivityType; multiplier?: number }> = [
      { regex: /(\d+(?:\.\d+)?)\s*(?:pages?|pg)/,              unit: 'pages',   activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:books?)/,                  unit: 'books',   activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:chapters?)/,               unit: 'chapters', activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*km/,                          unit: 'km',      activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*miles?/,                      unit: 'miles',   activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:steps?)/,                  unit: 'steps',   activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/,             unit: 'hours',   activityType: 'duration' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:minutes?|mins?)/,          unit: 'min',     activityType: 'duration', multiplier: 1/60 },
      { regex: /[₹$](\d+(?:,\d+)*(?:\.\d+)?)/,                 unit: '₹',       activityType: 'quantity' },
      { regex: /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:rupees?|inr)/,  unit: '₹',       activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:reps?)/,                   unit: 'reps',    activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:sets?)/,                   unit: 'sets',    activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:sessions?)/,               unit: 'sessions', activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:lessons?)/,                unit: 'lessons', activityType: 'quantity' },
    ];

    for (const { regex, unit, activityType, multiplier } of patterns) {
      const m = lower.match(regex);
      if (m) {
        const raw = parseFloat((m[1] as string).replace(/,/g, ''));
        const value = multiplier ? parseFloat((raw * multiplier).toFixed(2)) : raw;
        return { activityType, value, unit };
      }
    }

    // No numeric pattern found — check for completion keywords
    const completionWords = ['meditat', 'yoga', 'did', 'completed', 'finished', 'done', 'journal'];
    if (completionWords.some((w) => lower.includes(w))) {
      return { activityType: 'completion', value: null, unit: null };
    }

    return { activityType: 'quantity', value: null, unit: null };
  }

  /** Try to match a goal based on keywords in the input and unit overlap */
  private matchGoal(
    lower: string,
    goals: GoalContext[],
    detectedUnit: string | null
  ): { goalId: string | null; goalTitle: string | null; confidence: number } {
    if (goals.length === 0) return { goalId: null, goalTitle: null, confidence: 0.6 };

    // Score each goal
    type ScoredGoal = { goal: GoalContext; score: number };
    const scored: ScoredGoal[] = goals.map((goal) => {
      let score = 0;
      const titleWords = goal.title.toLowerCase().split(/\W+/);

      // Unit match — strong signal
      if (detectedUnit && goal.targetUnit) {
        if (goal.targetUnit.toLowerCase() === detectedUnit.toLowerCase()) score += 40;
      }

      // Keyword overlap between rawInput and goal title
      for (const word of titleWords) {
        if (word.length >= 4 && lower.includes(word)) score += 15;
      }

      // Domain keyword matching
      const domainMap: Array<{ keywords: string[]; goalKeywords: string[] }> = [
        { keywords: ['read', 'book', 'page', 'chapter'],           goalKeywords: ['read', 'book'] },
        { keywords: ['run', 'jog', 'walk', 'km', 'mile', 'step'],  goalKeywords: ['run', 'km', 'walk'] },
        { keywords: ['save', 'rupee', '₹', '$', 'money', 'invest'], goalKeywords: ['save', 'money', '₹'] },
        { keywords: ['study', 'python', 'code', 'learn', 'lesson'], goalKeywords: ['study', 'python', 'learn', 'code'] },
        { keywords: ['gym', 'workout', 'train', 'lift', 'exercise'], goalKeywords: ['gym', 'workout', 'fit'] },
      ];
      const goalLower = goal.title.toLowerCase();
      for (const { keywords, goalKeywords } of domainMap) {
        const inputMatch = keywords.some((k) => lower.includes(k));
        const goalMatch  = goalKeywords.some((k) => goalLower.includes(k));
        if (inputMatch && goalMatch) score += 25;
      }

      return { goal, score };
    });

    const best = scored.reduce((a, b) => (a.score > b.score ? a : b));

    if (best.score === 0) return { goalId: null, goalTitle: null, confidence: 0.55 };

    const confidence = best.score >= 40 ? 0.9 : best.score >= 20 ? 0.75 : 0.6;
    return { goalId: best.goal.id, goalTitle: best.goal.title, confidence };
  }

  /** Capitalise and trim the raw input to produce a display title */
  private buildTitle(rawInput: string): string {
    const trimmed = rawInput.trim();
    if (!trimmed) return 'Activity';
    // Capitalise first letter, truncate at 200 chars
    return (trimmed.charAt(0).toUpperCase() + trimmed.slice(1)).slice(0, 200);
  }
}

// ---------------------------------------------------------------------------
// OpenAI provider (opt-in via AI_PROVIDER=openai + OPENAI_API_KEY)
// ---------------------------------------------------------------------------

/**
 * Calls GPT-4o-mini to parse the raw input.
 * Only active when AI_PROVIDER=openai and OPENAI_API_KEY is set.
 * If the API call fails or returns malformed JSON, falls back to MockProvider.
 */
class OpenAIProvider implements AIProvider {
  readonly name = 'openai';

  async parse(rawInput: string, goals: GoalContext[]): Promise<AIActivityParse> {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) throw new Error('OPENAI_API_KEY not set');

    const goalsJson = JSON.stringify(
      goals.map((g) => ({ id: g.id, title: g.title, unit: g.targetUnit }))
    );

    const systemPrompt = `You are an activity parser for a goal-tracking app.
Parse the user's input into a structured JSON activity. Be concise and accurate.
Respond ONLY with valid JSON matching the schema — no prose, no markdown fences.`;

    const userPrompt = `Parse: "${rawInput}"

Active goals (id, title, unit):
${goalsJson}

Return JSON:
{
  "title": "clean activity title",
  "activityType": "quantity" | "duration" | "completion",
  "value": number or null,
  "unit": "string or null",
  "suggestedGoalId": "goal id or null",
  "suggestedGoalTitle": "goal title or null",
  "confidence": 0.0-1.0
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       'gpt-4o-mini',
        temperature: 0.2,
        max_tokens:  300,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    type OpenAIResponse = { choices: Array<{ message: { content: string } }> };
    const json = (await response.json()) as OpenAIResponse;
    const content = json.choices[0]?.message?.content ?? '';

    // Parse JSON — guard against truncated/malformed output from OpenAI
    let parsed: Partial<AIActivityParse>;
    try {
      parsed = JSON.parse(content) as Partial<AIActivityParse>;
    } catch {
      console.warn('[AIService] OpenAI returned malformed JSON, falling back to mock');
      return await mock.parse(rawInput, goals);
    }

    // Validate suggestedGoalId against the goals we actually sent — prevents
    // hallucinated IDs from reaching the database via POST /activities
    const knownGoalIds = new Set(goals.map((g) => g.id));
    const rawGoalId = typeof parsed.suggestedGoalId === 'string' ? parsed.suggestedGoalId : null;
    const validatedGoalId = rawGoalId && knownGoalIds.has(rawGoalId) ? rawGoalId : null;
    const validatedGoalTitle = validatedGoalId
      ? (goals.find((g) => g.id === validatedGoalId)?.title ?? null)
      : null;

    return {
      title:              String(parsed.title ?? rawInput).slice(0, 200),
      activityType:       (['quantity', 'duration', 'completion'].includes(parsed.activityType ?? '')
                            ? parsed.activityType
                            : 'quantity') as ActivityType,
      value:              typeof parsed.value === 'number' ? parsed.value : null,
      unit:               typeof parsed.unit === 'string' ? parsed.unit : null,
      suggestedGoalId:    validatedGoalId,
      suggestedGoalTitle: validatedGoalTitle,
      confidence:         typeof parsed.confidence === 'number'
                            ? Math.min(1, Math.max(0, parsed.confidence))
                            : 0.7,
      provider:           this.name,
    };
  }
}

// ---------------------------------------------------------------------------
// Factory — reads AI_PROVIDER env var
// ---------------------------------------------------------------------------

const mock = new MockProvider();

/**
 * Return the active AI provider.
 * Defaults to MockProvider so the feature works with zero configuration.
 * Set AI_PROVIDER=openai and OPENAI_API_KEY to use real AI.
 */
export function getProvider(): AIProvider {
  const providerName = process.env['AI_PROVIDER'] ?? 'mock';
  if (providerName === 'openai') return new OpenAIProvider();
  return mock;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a natural-language activity description into structured fields.
 * Falls back to MockProvider if the configured provider throws.
 *
 * @param rawInput - The user's free-text description (e.g. "ran 5km in the park")
 * @param goals    - Active goals to match against (pass top 10 max)
 * @returns        Structured activity parse result with confidence score
 */
export async function parseActivity(
  rawInput: string,
  goals:    GoalContext[]
): Promise<AIActivityParse> {
  const provider = getProvider();

  try {
    return await provider.parse(rawInput, goals);
  } catch (err) {
    // Graceful degradation: if real provider fails, fall back to mock
    if (provider.name !== 'mock') {
      console.error(`[AIService] ${provider.name} failed, falling back to mock:`, err);
      return await mock.parse(rawInput, goals);
    }
    throw err;
  }
}
