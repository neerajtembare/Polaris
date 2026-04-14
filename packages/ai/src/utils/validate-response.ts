/**
 * @file ai/utils/validateResponse.ts
 * @description JSON parse and validation for AI responses.
 *   Guards against malformed/truncated output from LLMs.
 *   Logs warnings for every coercion so silent failures are visible.
 * @module @polaris/backend/ai
 */

import type { AIActivityParse, UserIntent } from '@polaris/shared';
import type { ActivityType } from '@polaris/shared';
import type { GoalContext } from '../types.js';

const VALID_TYPES = new Set<ActivityType>(['quantity', 'duration', 'completion']);
const VALID_INTENTS = new Set<UserIntent>(['log_activity', 'create_goal', 'query']);

/**
 * Parse raw JSON string and validate/sanitize into AIActivityParse.
 * Returns null if JSON is unparseable. Logs every coercion to stderr.
 */
export function parseAndValidateActivityResponse(
  content: string,
  goals: GoalContext[],
  rawInput: string
): AIActivityParse | null {
  // Strip markdown fences if the model wrapped anyway
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  let parsed: Partial<AIActivityParse>;
  try {
    parsed = JSON.parse(cleaned) as Partial<AIActivityParse>;
  } catch (e) {
    console.error(`[validateResponse] ✗ JSON.parse failed | error="${(e as Error).message}" | raw="${content.slice(0, 300)}"`);
    return null;
  }

  const knownGoalIds = new Set(goals.map((g) => g.id));
  const rawGoalId = typeof parsed.suggestedGoalId === 'string' ? parsed.suggestedGoalId : null;
  const validatedGoalId = rawGoalId && knownGoalIds.has(rawGoalId) ? rawGoalId : null;

  if (rawGoalId && !validatedGoalId) {
    console.error(`[validateResponse] ⚠ Goal ID "${rawGoalId}" not in known goals — stripped`);
  }

  const validatedGoalTitle = validatedGoalId
    ? (goals.find((g) => g.id === validatedGoalId)?.title ?? null)
    : null;

  // Intent: default to log_activity if model doesn't provide it
  const rawIntent = parsed.intent as string | undefined;
  const intent: UserIntent = VALID_INTENTS.has(rawIntent as UserIntent)
    ? (rawIntent as UserIntent)
    : 'log_activity';

  // Activity type: log a warning if the model returned something unexpected
  let activityType: ActivityType;
  if (VALID_TYPES.has(parsed.activityType as ActivityType)) {
    activityType = parsed.activityType as ActivityType;
  } else {
    // Attempt to infer from value + unit rather than blindly defaulting to 'quantity'
    const rawType = String(parsed.activityType ?? '');
    const hasTime = ['hours', 'hour', 'min', 'minutes', 'hrs'].includes(
      (typeof parsed.unit === 'string' ? parsed.unit : '').toLowerCase()
    );
    activityType = hasTime ? 'duration' : 'quantity';
    console.error(`[validateResponse] ⚠ activityType "${rawType}" invalid — inferred "${activityType}" from unit="${parsed.unit ?? ''}"`);
  }

  return {
    intent,
    title:              String(parsed.title ?? rawInput).slice(0, 200) || 'Activity',
    activityType,
    value:              typeof parsed.value === 'number' ? parsed.value : null,
    unit:               typeof parsed.unit === 'string' && parsed.unit ? parsed.unit : null,
    suggestedGoalId:    validatedGoalId,
    suggestedGoalTitle: validatedGoalTitle,
    confidence:         typeof parsed.confidence === 'number'
                          ? Math.min(1, Math.max(0, parsed.confidence))
                          : 0.7,
    provider:           'unknown', // Caller always overrides: { ...result, provider: this.name }
  };
}

