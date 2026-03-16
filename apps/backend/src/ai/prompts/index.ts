/**
 * @file ai/prompts/index.ts
 * @description Barrel export for prompts.
 * @module @polaris/backend/ai
 */

export {
  ACTIVITY_PARSE_SYSTEM_PROMPT,
  buildActivityParseUserPrompt,
} from './activity-parse.js';
export {
  GOAL_BREAKDOWN_SYSTEM_PROMPT,
  buildGoalBreakdownUserPrompt,
} from './goal-breakdown.js';
export {
  WEEKLY_ANALYSIS_SYSTEM_PROMPT,
  buildWeeklyAnalysisUserPrompt,
} from './weekly-analysis.js';
