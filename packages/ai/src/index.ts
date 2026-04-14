/**
 * @file index.ts
 * @description Public API surface for @polaris/ai package.
 * @module @polaris/ai
 */

// Main facade — use this in the backend
export { PolarisAI, polarisAI } from './polaris-ai.js';
export type { GoalContext, GoalInput, AIGoalBreakdown, AIWeeklyAnalysis, DailyCoachResponse } from './polaris-ai.js';

// Provider utilities (for config endpoint)
export { getProvider, getMockProvider } from './providers/index.js';

// Individual functions (for direct use without the class)
export { breakdownGoal } from './features/breakdown-goal.js';
export { analyzeWeek } from './features/analyze-week.js';
export { dailyCoach } from './features/daily-coach.js';

// Types
export type { AIProvider, ChatMessage, ChatOptions, ChatResult, ToolSchema, ToolCall } from './types.js';

// TARS — conversational assistant core
export type { TARSAction, ActivityDraft, GoalDraft, ScreenId } from './tars/action-types.js';
export { requiresConfirmation, isImmediateAction } from './tars/action-types.js';
export type { IntentType, ClassifyResult, ClassifyOptions } from './tars/intent-classifier.js';
export { classifyIntent, getToolsForIntent } from './tars/intent-classifier.js';
export type { ValidateResult } from './tars/action-validator.js';
export { validateToolCall } from './tars/action-validator.js';
export { streamBriefing } from './tars/briefing.js';
export { TARS_SYSTEM_PROMPT, buildTarsSystemMessage } from './prompts/tars-system.prompt.js';
export { BRIEFING_SYSTEM_PROMPT, buildBriefingPrompt } from './prompts/briefing.prompt.js';
export {
  LOG_ACTIVITY_TOOL,
  PLAN_ACTIVITY_TOOL,
  CREATE_GOAL_TOOL,
  LOG_ACTIVITY_TOOLS,
  PLAN_ACTIVITY_TOOLS,
  CREATE_GOAL_TOOLS,
  ALL_WRITE_TOOLS,
} from './tars/tool-schemas.js';
