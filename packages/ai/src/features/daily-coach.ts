/**
 * @file daily-coach.ts
 * @description Daily coaching AI function.
 *   Calls the active AI provider with the PolarisContext and parses the response.
 *   Falls back to a motivational quote if the provider fails or returns bad JSON.
 * @module @polaris/ai
 *
 * @dependencies
 * - @polaris/shared (PolarisContext, DailyCoachResponse, CoachSuggestion)
 * - prompts/daily-coach.ts
 * - fallback-quotes.ts
 *
 * @relatedFiles
 * - packages/ai/src/PolarisAI.ts
 * - packages/ai/src/providers/ollama.ts
 * - apps/backend/src/controllers/ai.controller.ts
 */

import type { PolarisContext, DailyCoachResponse, CoachSuggestion } from '@polaris/shared';
import type { AIProvider } from '../types.js';
import { DAILY_COACH_SYSTEM_PROMPT, buildDailyCoachPrompt } from '../prompts/daily-coach.prompt.js';
import { getQuoteForToday } from './fallback-quotes.js';

// ---------------------------------------------------------------------------
// Response shape coming back from the LLM
// ---------------------------------------------------------------------------

interface RawCoachResponse {
  message?:       string;
  streakMessage?: string;
  suggestion?: {
    title?:        string;
    activityType?: string;
    value?:        number;
    unit?:         string;
    goalId?:       string | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function isValidActivityType(t: unknown): t is 'quantity' | 'duration' | 'completion' {
  return t === 'quantity' || t === 'duration' || t === 'completion';
}

function parseSuggestion(raw: RawCoachResponse['suggestion']): CoachSuggestion | null {
  if (!raw) return null;
  if (
    typeof raw.title !== 'string' ||
    !isValidActivityType(raw.activityType) ||
    typeof raw.value !== 'number' ||
    typeof raw.unit !== 'string'
  ) {
    return null;
  }
  return {
    title:        raw.title,
    activityType: raw.activityType,
    value:        raw.value,
    unit:         raw.unit,
    goalId:       typeof raw.goalId === 'string' ? raw.goalId : null,
  };
}

function parseCoachResponse(content: string, ctx: PolarisContext): DailyCoachResponse | null {
  // Strip markdown code fences if model wrapped the JSON
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  let raw: RawCoachResponse;
  try {
    raw = JSON.parse(cleaned) as RawCoachResponse;
  } catch {
    return null;
  }

  if (typeof raw.message !== 'string' || typeof raw.streakMessage !== 'string') {
    return null;
  }

  return {
    message:       raw.message,
    suggestion:    parseSuggestion(raw.suggestion ?? null),
    streakMessage: raw.streakMessage,
    source:        'ai',
  };
}

// ---------------------------------------------------------------------------
// Ollama raw call (provider interface only exposes `parse`; for custom prompts
// we call Ollama directly via its REST API, same as the provider does)
// ---------------------------------------------------------------------------

async function callOllama(systemPrompt: string, userPrompt: string): Promise<string> {
  const ollamaUrl = process.env['OLLAMA_URL'] ?? 'http://localhost:11434';
  const model     = process.env['OLLAMA_MODEL'] ?? 'gemma4:e4b';

  const body = {
    model,
    system: systemPrompt,
    prompt: userPrompt,
    stream: false,
    format: 'json',
    options: { temperature: 0.4, num_predict: 400 },
  };

  const res = await fetch(`${ollamaUrl}/api/generate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);

  const json = (await res.json()) as { response?: string };
  return json.response ?? '';
}

// For OpenAI provider: call chat completions
async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env['OPENAI_API_KEY'] ?? '';
  const model  = process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini';

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt  },
      ],
      max_tokens:  400,
      temperature: 0.4,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? '';
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Generate a daily coaching response.
 * Tries the configured provider first; gracefully falls back to a quote.
 */
export async function dailyCoach(
  ctx:      PolarisContext,
  provider: AIProvider
): Promise<DailyCoachResponse> {
  const userPrompt = buildDailyCoachPrompt(ctx);

  try {
    let rawContent: string;

    if (provider.name === 'ollama') {
      rawContent = await callOllama(DAILY_COACH_SYSTEM_PROMPT, userPrompt);
    } else if (provider.name === 'openai') {
      rawContent = await callOpenAI(DAILY_COACH_SYSTEM_PROMPT, userPrompt);
    } else {
      // Mock provider — return a deterministic fallback
      return buildFallbackResponse(ctx);
    }

    const parsed = parseCoachResponse(rawContent, ctx);
    if (parsed) return parsed;

    console.error('[DailyCoach] Bad JSON from provider — falling back to quote');
  } catch (err) {
    console.error('[DailyCoach] Provider call failed:', err);
  }

  return buildFallbackResponse(ctx);
}

function buildFallbackResponse(ctx: PolarisContext): DailyCoachResponse {
  const quote = getQuoteForToday();
  const streakMsg =
    ctx.currentStreak > 0
      ? `You're on a ${ctx.currentStreak}-day streak — keep it alive today!`
      : 'Every journey starts with a single step. Log something today!';

  // Pick the most-behind goal as a fallback suggestion
  const suggestion: CoachSuggestion | null =
    ctx.activeGoals.length > 0
      ? (() => {
          const goal = [...ctx.activeGoals].sort((a, b) => a.progress - b.progress)[0]!;
          return {
            title:        `Work on: ${goal.title}`,
            activityType: 'completion' as const,
            value:        1,
            unit:         'session',
            goalId:       goal.id,
          };
        })()
      : null;

  return {
    message:       quote,
    suggestion,
    streakMessage: streakMsg,
    source:        'fallback',
  };
}
