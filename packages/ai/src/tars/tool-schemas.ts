/**
 * @file tars/tool-schemas.ts
 * @description LLM function-calling tool schemas for TARS write operations.
 *   These are sent to the LLM when the intent is classified as a write action.
 *   The LLM returns a structured functionCall; the backend validates with Zod
 *   (see action-validator.ts) and wraps it as a TARSAction.
 *
 *   Read/query intents never include tool schemas — the LLM just returns text.
 *
 * @module @polaris/ai/tars
 *
 * @relatedFiles
 * - packages/ai/src/types.ts          (ToolSchema interface)
 * - packages/ai/src/tars/action-types.ts
 * - packages/ai/src/tars/action-validator.ts
 */

import type { ToolSchema } from '../types.js';

/**
 * Tool: log_activity
 * Used when the user says they completed something.
 * Examples: "read 30 pages", "ran 5km today", "meditated for 20 minutes"
 */
export const LOG_ACTIVITY_TOOL: ToolSchema = {
  name: 'log_activity',
  description:
    'Log a completed activity. Use when the user describes something they ALREADY DID. ' +
    'When the user confirms a previously proposed log (e.g. says "yes", "go ahead", "do it"), ' +
    'call this tool using the details from your previous proposal in the conversation. ' +
    'Do NOT use for activities they plan to do — use plan_activity instead.',

  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Short descriptive title for the activity (e.g. "Read Atomic Habits", "Morning run")',
      },
      activityType: {
        type: 'string',
        enum: ['quantity', 'duration', 'completion'],
        description: 'quantity = measurable count (pages, km, reps); duration = time-based (hours, minutes); completion = done or not done',
      },
      value: {
        type: 'number',
        description: 'Numeric value. Required for quantity/duration. Omit for completion.',
      },
      unit: {
        type: 'string',
        description: 'Unit of the value. E.g. pages, km, hours, minutes, reps. Omit for completion.',
      },
      goalId: {
        type: 'string',
        description: 'ID of the related goal (from context). Pass null if no matching goal.',
      },
      goalTitle: {
        type: 'string',
        description: 'Title of the related goal (from context). Pass null if no matching goal.',
      },
      date: {
        type: 'string',
        description: 'ISO date string (YYYY-MM-DD). Defaults to today if omitted.',
      },
    },
    required: ['title', 'activityType'],
  },
};

/**
 * Tool: plan_activity
 * Used when the user says they WILL do something or wants to schedule it.
 * Examples: "I'm going to run 5km tomorrow", "plan to read tonight"
 */
export const PLAN_ACTIVITY_TOOL: ToolSchema = {
  name: 'plan_activity',
  description:
    'Plan a future activity the user intends to do. Use when user says they WILL do something. ' +
    'When the user confirms a previously proposed plan (e.g. says "yes", "go ahead"), ' +
    'call this tool using the details from your previous proposal in the conversation. ' +
    'Creates a planned (not completed) activity entry.',

  parameters: {
    ...LOG_ACTIVITY_TOOL.parameters,
  },
};

/**
 * Tool: create_goal_draft
 * Used when the user wants to create a new goal.
 * Always requires user confirmation — never auto-saves.
 * Examples: "I want to read 24 books this year", "new goal: run 500km by December"
 */
export const CREATE_GOAL_TOOL: ToolSchema = {
  name: 'create_goal_draft',
  description:
    'Create a draft goal for the user to review and confirm. Never saves automatically. ' +
    'Use when user says they want to track a long-term objective.',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Clear, specific goal title (e.g. "Read 24 books in 2026")',
      },
      timeframe: {
        type: 'string',
        enum: ['long', 'medium', 'short'],
        description: 'long = annual/multi-year; medium = monthly/quarterly; short = weekly/daily',
      },
      targetValue: {
        type: 'number',
        description: 'Numeric target if measurable. E.g. 24 for "24 books", 500 for "500km".',
      },
      targetUnit: {
        type: 'string',
        description: 'Unit for the target. E.g. books, km, pages, hours.',
      },
      description: {
        type: 'string',
        description: 'Optional short description or motivation for this goal.',
      },
    },
    required: ['title', 'timeframe'],
  },
};

// ---------------------------------------------------------------------------
// Grouped by intent — import these in the chat handler
// ---------------------------------------------------------------------------

/** Tools to include when intent is log_activity */
export const LOG_ACTIVITY_TOOLS: ToolSchema[] = [LOG_ACTIVITY_TOOL];

/** Tools to include when intent is plan_activity */
export const PLAN_ACTIVITY_TOOLS: ToolSchema[] = [PLAN_ACTIVITY_TOOL];

/** Tools to include when intent is create_goal */
export const CREATE_GOAL_TOOLS: ToolSchema[] = [CREATE_GOAL_TOOL];

/** All write tools — use only if intent routing is unclear */
export const ALL_WRITE_TOOLS: ToolSchema[] = [LOG_ACTIVITY_TOOL, PLAN_ACTIVITY_TOOL, CREATE_GOAL_TOOL];
