/**
 * @file tars/action-validator.ts
 * @description Zod validation for LLM tool call output.
 *   LLMs occasionally return tool calls with wrong types or missing required fields.
 *   Every tool call MUST be validated before use — validation failure triggers
 *   a clarification response instead of a retry (LLMs often repeat mistakes).
 * @module @polaris/ai/tars
 *
 * @dependencies
 * - zod
 *
 * @relatedFiles
 * - packages/ai/src/tars/action-types.ts
 * - packages/ai/src/tars/tool-schemas.ts
 */

import { z } from 'zod';
import type { TARSAction } from './action-types.js';

// ---------------------------------------------------------------------------
// Shared field schemas
// ---------------------------------------------------------------------------

const activityTypeSchema = z.enum(['quantity', 'duration', 'completion']);
const timeframeSchema     = z.enum(['long', 'medium', 'short']);

const activityDraftSchema = z.object({
  title:        z.string().min(1).max(500),
  activityType: activityTypeSchema,
  value:        z.number().optional(),
  unit:         z.string().optional(),
  goalId:       z.string().nullable().optional(),
  goalTitle:    z.string().nullable().optional(),
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status:       z.enum(['completed', 'planned']).optional(),
});

const goalDraftSchema = z.object({
  title:        z.string().min(1).max(500),
  timeframe:    timeframeSchema,
  targetValue:  z.number().optional(),
  targetUnit:   z.string().optional(),
  description:  z.string().optional(),
});

// ---------------------------------------------------------------------------
// Per-tool validators
// ---------------------------------------------------------------------------

const logActivityArgsSchema  = activityDraftSchema;
const planActivityArgsSchema = activityDraftSchema;
const createGoalArgsSchema   = goalDraftSchema;

// ---------------------------------------------------------------------------
// Validate a tool call returned by the LLM
// ---------------------------------------------------------------------------

export type ValidateResult =
  | { ok: true;  action: TARSAction }
  | { ok: false; reason: string };

/**
 * Validate raw tool call args from the LLM and wrap as a typed TARSAction.
 * Returns { ok: false, reason } if validation fails — caller should send
 * a clarification message instead of silently erroring.
 */
export function validateToolCall(
  toolName: string,
  rawArgs:  Record<string, unknown>
): ValidateResult {
  switch (toolName) {
    case 'log_activity': {
      const result = logActivityArgsSchema.safeParse(rawArgs);
      if (!result.success) {
        return { ok: false, reason: `log_activity validation failed: ${result.error.message}` };
      }
      return { ok: true, action: { type: 'log_activity', draft: result.data as import('./action-types.js').ActivityDraft } };
    }

    case 'plan_activity': {
      const result = planActivityArgsSchema.safeParse(rawArgs);
      if (!result.success) {
        return { ok: false, reason: `plan_activity validation failed: ${result.error.message}` };
      }
      return { ok: true, action: { type: 'plan_activity', draft: result.data as import('./action-types.js').ActivityDraft } };
    }

    case 'create_goal_draft': {
      const result = createGoalArgsSchema.safeParse(rawArgs);
      if (!result.success) {
        return { ok: false, reason: `create_goal validation failed: ${result.error.message}` };
      }
      return { ok: true, action: { type: 'create_goal', draft: result.data as import('./action-types.js').GoalDraft } };
    }

    default:
      return { ok: false, reason: `Unknown tool: ${toolName}` };
  }
}
