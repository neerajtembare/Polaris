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
