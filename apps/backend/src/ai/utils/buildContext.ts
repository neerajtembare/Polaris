/**
 * @file ai/utils/buildContext.ts
 * @description Context-building helpers for AI prompts.
 *   Truncation, formatting, and context limits.
 * @module @polaris/backend/ai
 */

import type { GoalContext } from '../types.js';

/** Max goals to send as context (keeps prompt size bounded) */
export const MAX_GOALS_CONTEXT = 10;

/**
 * Truncate goals array to max context size.
 */
export function truncateGoals(goals: GoalContext[], max = MAX_GOALS_CONTEXT): GoalContext[] {
  return goals.slice(0, max);
}
