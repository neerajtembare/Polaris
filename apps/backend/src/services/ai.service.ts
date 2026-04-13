/**
 * @file services/ai.service.ts
 * @description Thin facade — all AI logic lives in @polaris/ai package.
 *   Import from here within the backend; never call @polaris/ai directly
 *   from controllers (keeps the service layer as the single backend AI gateway).
 *
 * @module @polaris/backend/services
 * @relatedFiles
 *   - packages/ai/src/PolarisAI.ts
 *   - src/controllers/ai.controller.ts
 */

export { polarisAI as aiService } from '@polaris/ai';
export type { GoalContext, GoalInput, AIGoalBreakdown, AIWeeklyAnalysis } from '@polaris/ai';
export type { AIActivityParse } from '@polaris/shared';
