/**
 * @file controllers/goal.controller.ts
 * @description HTTP handlers for the Goals API.
 *   Each handler validates input, calls the service, and returns a
 *   standardised `{ success, data }` envelope. No Prisma access here.
 * @module @polaris/backend/controllers
 *
 * @dependencies
 * - fastify (types only)
 * - services/goal.service
 * - lib/errors
 *
 * @relatedFiles
 * - src/routes/goals.ts
 * - src/services/goal.service.ts
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import * as GoalService from '../services/goal.service.js';
import { AppError } from '../lib/errors.js';

// ---------------------------------------------------------------------------
// Query / param shapes  (kept here, near the handlers that use them)
// ---------------------------------------------------------------------------

interface GoalParams {
  id: string;
}

interface ListGoalsQuery {
  status?: string;
  timeframe?: string;
  parent_id?: string;
  include_progress?: boolean;
}

interface GetGoalQuery {
  include_progress?: boolean;
  include_children?: boolean;
}

interface DeleteGoalQuery {
  cascade?: boolean;
}

// ---------------------------------------------------------------------------
// Error formatter — converts AppError → standard error envelope
// ---------------------------------------------------------------------------

function handleError(err: unknown, reply: FastifyReply) {
  if (err instanceof AppError) {
    return reply.status(err.statusCode).send({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
  }
  console.error('[GoalController] Unexpected error:', err);
  return reply.status(500).send({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/**
 * GET /api/goals
 * List all goals with optional status / timeframe / parent filters.
 */
export async function getGoals(
  request: FastifyRequest<{ Querystring: ListGoalsQuery }>,
  reply: FastifyReply
) {
  try {
    const { status, timeframe, parent_id, include_progress } = request.query;
    const goals = await GoalService.listGoals({
      ...(status !== undefined && { status }),
      ...(timeframe !== undefined && { timeframe }),
      ...(parent_id !== undefined && { parentId: parent_id }),
      includeProgress: include_progress === true,
    });
    return reply.send({ success: true, data: goals });
  } catch (err) {
    return handleError(err, reply);
  }
}

/**
 * GET /api/goals/:id
 * Fetch a single goal by ID.
 */
export async function getGoal(
  request: FastifyRequest<{ Params: GoalParams; Querystring: GetGoalQuery }>,
  reply: FastifyReply
) {
  try {
    const goal = await GoalService.getGoalById(request.params.id, {
      includeProgress: request.query.include_progress === true,
      includeChildren: request.query.include_children === true,
    });
    return reply.send({ success: true, data: goal });
  } catch (err) {
    return handleError(err, reply);
  }
}

/**
 * POST /api/goals
 * Create a new goal.
 */
export async function createGoal(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const goal = await GoalService.createGoal(request.body as Parameters<typeof GoalService.createGoal>[0]);
    return reply.status(201).send({ success: true, data: goal });
  } catch (err) {
    return handleError(err, reply);
  }
}

/**
 * PATCH /api/goals/:id
 * Update a goal's properties.
 */
export async function updateGoal(
  request: FastifyRequest<{ Params: GoalParams }>,
  reply: FastifyReply
) {
  try {
    const goal = await GoalService.updateGoal(
      request.params.id,
      request.body as Parameters<typeof GoalService.updateGoal>[1]
    );
    return reply.send({ success: true, data: goal });
  } catch (err) {
    return handleError(err, reply);
  }
}

/**
 * DELETE /api/goals/:id
 * Soft-delete a goal (and optionally its children).
 */
export async function deleteGoal(
  request: FastifyRequest<{ Params: GoalParams; Querystring: DeleteGoalQuery }>,
  reply: FastifyReply
) {
  try {
    const result = await GoalService.deleteGoal(
      request.params.id,
      request.query.cascade === true
    );
    return reply.send({ success: true, data: result });
  } catch (err) {
    return handleError(err, reply);
  }
}

/**
 * GET /api/goals/:id/progress
 * Returns computed progress metrics for a goal.
 */
export async function getGoalProgress(
  request: FastifyRequest<{ Params: GoalParams }>,
  reply: FastifyReply
) {
  try {
    const progress = await GoalService.getGoalProgress(request.params.id);
    return reply.send({ success: true, data: progress });
  } catch (err) {
    return handleError(err, reply);
  }
}
