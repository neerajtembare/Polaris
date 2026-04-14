/**
 * @file ai/prompts/index.ts
 * @description Barrel export for prompts.
 * @module @polaris/backend/ai
 */

export {
  ACTIVITY_PARSE_SYSTEM_PROMPT,
  buildActivityParseUserPrompt,
} from './activity-parse.prompt.js';
export {
  GOAL_BREAKDOWN_SYSTEM_PROMPT,
  buildGoalBreakdownUserPrompt,
} from './goal-breakdown.prompt.js';
export {
  WEEKLY_ANALYSIS_SYSTEM_PROMPT,
  buildWeeklyAnalysisUserPrompt,
} from './weekly-analysis.prompt.js';
export {
  DAILY_COACH_SYSTEM_PROMPT,
  buildDailyCoachPrompt,
} from './daily-coach.prompt.js';
