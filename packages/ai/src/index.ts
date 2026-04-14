/**
 * @file index.ts
 * @description Public API surface for @polaris/ai package.
 * @module @polaris/ai
 */

// Main facade — use this in the backend
export { PolarisAI, polarisAI } from './PolarisAI.js';
export type { GoalContext, GoalInput, AIGoalBreakdown, AIWeeklyAnalysis, DailyCoachResponse } from './PolarisAI.js';

// Provider utilities (for config endpoint)
export { getProvider, getMockProvider } from './providers/index.js';

// Individual functions (for direct use without the class)
export { breakdownGoal } from './breakdown.js';
export { analyzeWeek } from './analyze-week.js';
export { dailyCoach } from './daily-coach.js';

// Types
export type { AIProvider } from './types.js';
