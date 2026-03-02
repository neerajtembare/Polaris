/**
 * @file controllers/activity.controller.ts
 * @description HTTP handlers for the Activities API.
 *   Each handler validates input, calls the service, and returns a
 *   standardised `{ success, data }` envelope. No Prisma access here.
 * @module @polaris/backend/controllers
 *
 * @dependencies
 * - fastify (types only)
 * - services/activity.service
 * - lib/errors
 *
 * @relatedFiles
 * - src/routes/activities.ts
 * - src/services/activity.service.ts
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import * as ActivityService from '../services/activity.service.js';
import { AppError } from '../lib/errors.js';

// ---------------------------------------------------------------------------
// Query / param shapes
// ---------------------------------------------------------------------------

interface ActivityParams {
  id: string;
}

interface ListActivitiesQuery {
  date?: string;
  start_date?: string;
  end_date?: string;
  goal_id?: string;
  status?: string;
  activity_type?: string;
  limit?: number;
  offset?: number;
}

/** Raw request body shape (snake_case per API contract) */
interface CreateActivityBody {
  title: string;
  activity_type: string;
  activity_date: string;
  value?: number;
  unit?: string;
  goal_id?: string;
  category?: string;
  status?: string;
  notes?: string;
  raw_input?: string;
}

interface UpdateActivityBody {
  title?: string;
  activity_type?: string;
  value?: number | null;
  unit?: string | null;
  goal_id?: string | null;
  activity_date?: string;
  category?: string;
  status?: string;
  notes?: string | null;
  completed_at?: string | null;
}

// ---------------------------------------------------------------------------
// Error formatter (mirrors goal.controller — keep consistent)
// ---------------------------------------------------------------------------

function handleError(err: unknown, reply: FastifyReply) {
  if (err instanceof AppError) {
    return reply.status(err.statusCode).send({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
  }
  console.error('[ActivityController] Unexpected error:', err);
  return reply.status(500).send({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/**
 * GET /api/activities
 * List activities with optional date range / goal / status filters.
 */
export async function getActivities(
  request: FastifyRequest<{ Querystring: ListActivitiesQuery }>,
  reply: FastifyReply
) {
  try {
    const { date, start_date, end_date, goal_id, status, activity_type, limit, offset } =
      request.query;

    const result = await ActivityService.listActivities({
      ...(date !== undefined && { date }),
      ...(start_date !== undefined && { startDate: start_date }),
      ...(end_date !== undefined && { endDate: end_date }),
      ...(goal_id !== undefined && { goalId: goal_id }),
      ...(status !== undefined && { status }),
      ...(activity_type !== undefined && { activityType: activity_type }),
      ...(limit !== undefined && { limit }),
      ...(offset !== undefined && { offset }),
    });

    return reply.send({ success: true, ...result });
  } catch (err) {
    return handleError(err, reply);
  }
}

/**
 * GET /api/activities/today
 * Returns today's activities grouped by status.
 * NOTE: this route must be registered BEFORE /:id so Fastify matches it first.
 */
export async function getTodayActivities(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await ActivityService.getTodayActivities();
    return reply.send({ success: true, data });
  } catch (err) {
    return handleError(err, reply);
  }
}

/**
 * GET /api/activities/:id
 * Fetch a single activity by ID.
 */
export async function getActivity(
  request: FastifyRequest<{ Params: ActivityParams }>,
  reply: FastifyReply
) {
  try {
    const activity = await ActivityService.getActivityById(request.params.id);
    return reply.send({ success: true, data: activity });
  } catch (err) {
    return handleError(err, reply);
  }
}

/**
 * POST /api/activities
 * Log a new activity. Maps snake_case body → camelCase service input.
 */
export async function createActivity(
  request: FastifyRequest<{ Body: CreateActivityBody }>,
  reply: FastifyReply
) {
  try {
    const b = request.body;
    const activity = await ActivityService.createActivity({
      title: b.title,
      activityType: b.activity_type as 'quantity' | 'duration' | 'completion',
      activityDate: b.activity_date,
      ...(b.value !== undefined && { value: b.value }),
      ...(b.unit !== undefined && { unit: b.unit }),
      ...(b.goal_id !== undefined && { goalId: b.goal_id }),
      ...(b.category !== undefined && { category: b.category as 'growth' | 'maintenance' }),
      ...(b.status !== undefined && { status: b.status as 'planned' | 'completed' | 'skipped' }),
      ...(b.notes !== undefined && { notes: b.notes }),
      ...(b.raw_input !== undefined && { rawInput: b.raw_input }),
    });
    return reply.status(201).send({ success: true, data: activity });
  } catch (err) {
    return handleError(err, reply);
  }
}

/**
 * PATCH /api/activities/:id
 * Update an activity. Maps snake_case body → camelCase service input.
 */
export async function updateActivity(
  request: FastifyRequest<{ Params: ActivityParams; Body: UpdateActivityBody }>,
  reply: FastifyReply
) {
  try {
    const b = request.body;
    const activity = await ActivityService.updateActivity(request.params.id, {
      ...(b.title !== undefined && { title: b.title }),
      ...(b.activity_type !== undefined && { activityType: b.activity_type as 'quantity' | 'duration' | 'completion' }),
      ...(b.value !== undefined && { value: b.value }),
      ...(b.unit !== undefined && { unit: b.unit }),
      ...(b.goal_id !== undefined && { goalId: b.goal_id }),
      ...(b.activity_date !== undefined && { activityDate: b.activity_date }),
      ...(b.category !== undefined && { category: b.category as 'growth' | 'maintenance' }),
      ...(b.status !== undefined && { status: b.status as 'planned' | 'completed' | 'skipped' }),
      ...(b.notes !== undefined && { notes: b.notes }),
      ...(b.completed_at !== undefined && { completedAt: b.completed_at }),
    });
    return reply.send({ success: true, data: activity });
  } catch (err) {
    return handleError(err, reply);
  }
}

/**
 * DELETE /api/activities/:id
 * Soft-delete an activity.
 */
export async function deleteActivity(
  request: FastifyRequest<{ Params: ActivityParams }>,
  reply: FastifyReply
) {
  try {
    const result = await ActivityService.deleteActivity(request.params.id);
    return reply.send({ success: true, data: result });
  } catch (err) {
    return handleError(err, reply);
  }
}
