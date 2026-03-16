/**
 * @file services/ai.service.ts
 * @description Thin facade for the AI module. Re-exports parseActivity and types.
 *   Implementation lives in src/ai/ (prompts, providers, utils).
 *
 * @module @polaris/backend/services
 * @relatedFiles
 *   - src/ai/index.ts
 *   - src/controllers/ai.controller.ts
 */

export {
  parseActivity,
  getProvider,
  type AIActivityParse,
  type GoalContext,
} from '../ai/index.js';
