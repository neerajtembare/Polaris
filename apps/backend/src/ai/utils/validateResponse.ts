/**
 * @file ai/utils/validateResponse.ts
 * @description JSON parse and validation for AI responses.
 *   Guards against malformed/truncated output from LLMs.
 * @module @polaris/backend/ai
 */

import type { AIActivityParse } from '@polaris/shared';
import type { ActivityType } from '@polaris/shared';
import type { GoalContext } from '../types.js';

/**
 * Parse raw JSON string and validate/sanitize into AIActivityParse.
 * Returns null if parse fails.
 */
export function parseAndValidateActivityResponse(
  content: string,
  goals: GoalContext[],
  rawInput: string
): AIActivityParse | null {
  let parsed: Partial<AIActivityParse>;
  try {
    parsed = JSON.parse(content) as Partial<AIActivityParse>;
  } catch {
    return null;
  }

  const knownGoalIds = new Set(goals.map((g) => g.id));
  const rawGoalId = typeof parsed.suggestedGoalId === 'string' ? parsed.suggestedGoalId : null;
  const validatedGoalId = rawGoalId && knownGoalIds.has(rawGoalId) ? rawGoalId : null;
  const validatedGoalTitle = validatedGoalId
    ? (goals.find((g) => g.id === validatedGoalId)?.title ?? null)
    : null;

  const validActivityType = (t: unknown): t is ActivityType =>
    ['quantity', 'duration', 'completion'].includes(String(t ?? ''));

  return {
    title:              String(parsed.title ?? rawInput).slice(0, 200) || 'Activity',
    activityType:       validActivityType(parsed.activityType) ? parsed.activityType : 'quantity',
    value:              typeof parsed.value === 'number' ? parsed.value : null,
    unit:               typeof parsed.unit === 'string' ? parsed.unit : null,
    suggestedGoalId:    validatedGoalId,
    suggestedGoalTitle: validatedGoalTitle,
    confidence:         typeof parsed.confidence === 'number'
                         ? Math.min(1, Math.max(0, parsed.confidence))
                         : 0.7,
    provider:           'openai', // Caller will override if needed
  };
}
