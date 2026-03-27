/**
 * @file ai/breakdown.ts
 * @description Goal decomposition — suggests sub-goals and activities.
 *   Uses OpenAI when available, else returns mock template.
 * @module @polaris/backend/ai
 */

import type { AIGoalBreakdown, AISubGoal, AISuggestedActivity } from '@polaris/shared';
import { buildGoalBreakdownUserPrompt, GOAL_BREAKDOWN_SYSTEM_PROMPT } from './prompts/goal-breakdown.js';

export type { AIGoalBreakdown, AISubGoal, AISuggestedActivity };

export interface GoalInput {
  title:       string;
  description: string | null;
  timeframe:   string;
  targetValue: number | null;
  targetUnit:  string | null;
  targetDate:  string | null;
}

function toNull<T>(v: T | null | undefined): T | null {
  return v === undefined ? null : v;
}

/** Mock response when OpenAI is not configured */
function mockBreakdown(goal: GoalInput): AIGoalBreakdown {
  const subGoals: AISubGoal[] = [
    { title: `Break down: ${goal.title}`, timeframe: 'medium', rationale: 'Create sub-goals manually' },
  ];
  const suggestedActivities: AISuggestedActivity[] = [
    {
      title:        `Work on ${goal.title}`,
      activityType: 'duration',
      value:        30,
      unit:         'min',
      frequency:    'daily',
      rationale:    'Start with small daily sessions',
    },
  ];
  return { subGoals, suggestedActivities, provider: 'mock' };
}

/**
 * Decompose a goal into sub-goals and suggested activities.
 * Uses OpenAI when AI_PROVIDER=openai, else returns mock.
 */
export async function breakdownGoal(input: GoalInput): Promise<AIGoalBreakdown> {
  const goal: Required<Omit<GoalInput, 'description' | 'targetValue' | 'targetUnit' | 'targetDate'>> & {
    description: string | null;
    targetValue: number | null;
    targetUnit: string | null;
    targetDate: string | null;
  } = {
    title:       input.title,
    timeframe:   input.timeframe,
    description: toNull(input.description),
    targetValue: toNull(input.targetValue),
    targetUnit:  toNull(input.targetUnit),
    targetDate:  toNull(input.targetDate),
  };
  const providerName = process.env['AI_PROVIDER'] ?? 'mock';
  const apiKey = process.env['OPENAI_API_KEY'];

  if (providerName !== 'openai' || !apiKey) {
    return mockBreakdown(goal);
  }

  try {
    const userPrompt = buildGoalBreakdownUserPrompt(goal);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       'gpt-4o-mini',
        temperature: 0.3,
        max_tokens:  800,
        messages: [
          { role: 'system', content: GOAL_BREAKDOWN_SYSTEM_PROMPT },
          { role: 'user',   content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    type OpenAIResponse = { choices: Array<{ message: { content: string } }> };
    const json = (await response.json()) as OpenAIResponse;
    const content = json.choices[0]?.message?.content ?? '';

    let parsed: { subGoals?: unknown[]; suggestedActivities?: unknown[] };
    try {
      parsed = JSON.parse(content) as { subGoals?: unknown[]; suggestedActivities?: unknown[] };
    } catch {
      console.warn('[AIService] Goal breakdown malformed JSON, falling back to mock');
      return mockBreakdown(goal);
    }

    const subGoals: AISubGoal[] = (parsed.subGoals ?? []).slice(0, 6).map((s: unknown) => {
      const o = s as Record<string, unknown>;
      const sg: AISubGoal = {
        title: String(o['title'] ?? ''),
      };
      const tf = o['timeframe'];
      if (['long', 'medium', 'short'].includes(String(tf ?? ''))) {
        sg.timeframe = tf as 'long' | 'medium' | 'short';
      }
      if (typeof o['targetDate'] === 'string') sg.targetDate = o['targetDate'] as string;
      if (typeof o['targetValue'] === 'number') sg.targetValue = o['targetValue'] as number;
      if (typeof o['targetUnit'] === 'string') sg.targetUnit = o['targetUnit'] as string;
      if (typeof o['rationale'] === 'string') sg.rationale = o['rationale'] as string;
      return sg;
    });

    const suggestedActivities: AISuggestedActivity[] = (parsed.suggestedActivities ?? []).slice(0, 6).map((a: unknown) => {
      const o = a as Record<string, unknown>;
      const at = o['activityType'];
      const activityType: 'quantity' | 'duration' | 'completion' =
        ['quantity', 'duration', 'completion'].includes(String(at ?? ''))
          ? (at as 'quantity' | 'duration' | 'completion')
          : 'completion';
      const act: AISuggestedActivity = {
        title:        String(o['title'] ?? ''),
        activityType,
      };
      if (typeof o['value'] === 'number') act.value = o['value'] as number;
      if (typeof o['unit'] === 'string') act.unit = o['unit'] as string;
      if (typeof o['frequency'] === 'string') act.frequency = o['frequency'] as string;
      if (typeof o['suggestedDuration'] === 'number') act.suggestedDuration = o['suggestedDuration'] as number;
      if (typeof o['rationale'] === 'string') act.rationale = o['rationale'] as string;
      return act;
    });

    return { subGoals, suggestedActivities, provider: 'openai' };
  } catch (err) {
    console.error('[AIService] Goal breakdown failed, falling back to mock:', err);
    return mockBreakdown(goal);
  }
}
