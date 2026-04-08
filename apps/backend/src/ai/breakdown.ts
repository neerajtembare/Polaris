/**
 * @file ai/breakdown.ts
 * @description Goal decomposition — suggests sub-goals and activities.
 *   Routes through the configured AI provider (openai or ollama).
 *   Falls back to a mock template when no provider is configured.
 * @module @polaris/backend/ai
 */

import type { AIGoalBreakdown, AISubGoal, AISuggestedActivity } from '@polaris/shared';
import { buildGoalBreakdownUserPrompt, GOAL_BREAKDOWN_SYSTEM_PROMPT } from './prompts/goal-breakdown.js';
import { callProviderText } from './utils/callProviderText.js';

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

/** Mock response when no provider is configured */
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
 * Uses the configured AI_PROVIDER (openai or ollama), falls back to mock.
 */
export async function breakdownGoal(input: GoalInput): Promise<AIGoalBreakdown> {
  const goal = {
    title:       input.title,
    timeframe:   input.timeframe,
    description: toNull(input.description),
    targetValue: toNull(input.targetValue),
    targetUnit:  toNull(input.targetUnit),
    targetDate:  toNull(input.targetDate),
  };

  const userPrompt = buildGoalBreakdownUserPrompt(goal);

  const result = await callProviderText({
    systemPrompt: GOAL_BREAKDOWN_SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 900,
    temperature: 0.3,
    logPrefix: 'Breakdown',
  });

  if (!result) return mockBreakdown(goal);

  let parsed: { subGoals?: unknown[]; suggestedActivities?: unknown[] };
  try {
    parsed = JSON.parse(result) as { subGoals?: unknown[]; suggestedActivities?: unknown[] };
  } catch {
    console.error('[Breakdown] ✗ JSON parse failed — falling back to mock');
    return mockBreakdown(goal);
  }

  const subGoals: AISubGoal[] = (parsed.subGoals ?? []).slice(0, 6).map((s: unknown) => {
    const o = s as Record<string, unknown>;
    const sg: AISubGoal = { title: String(o['title'] ?? '') };
    const tf = o['timeframe'];
    if (['long', 'medium', 'short'].includes(String(tf ?? ''))) sg.timeframe = tf as 'long' | 'medium' | 'short';
    if (typeof o['targetDate'] === 'string' && o['targetDate'] !== 'null') sg.targetDate = o['targetDate'] as string;
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
    const act: AISuggestedActivity = { title: String(o['title'] ?? ''), activityType };
    if (typeof o['value'] === 'number') act.value = o['value'] as number;
    if (typeof o['unit'] === 'string') act.unit = o['unit'] as string;
    if (typeof o['frequency'] === 'string') act.frequency = o['frequency'] as string;
    if (typeof o['suggestedDuration'] === 'number') act.suggestedDuration = o['suggestedDuration'] as number;
    if (typeof o['rationale'] === 'string') act.rationale = o['rationale'] as string;
    return act;
  });

  const provider = process.env['AI_PROVIDER'] ?? 'mock';
  return { subGoals, suggestedActivities, provider };
}


