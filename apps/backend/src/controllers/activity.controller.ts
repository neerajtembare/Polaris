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
import { handleError } from '../lib/handleError.js';

// ---------------------------------------------------------------------------
// Query / param shapes
// ---------------------------------------------------------------------------

interface ActivityParams {
  id: string;
}

interface ListActivitiesQuery {
  date?: string;
  startDate?: string;
  endDate?: string;
  goalId?: string;
  status?: string;
  activityType?: string;
  limit?: number;
  offset?: number;
}

/** Request body for POST /activities (camelCase — matches shared CreateActivityInput) */
interface CreateActivityBody {
  title: string;
  activityType: string;
  activityDate: string;
  value?: number;
  unit?: string;
  goalId?: string;
  category?: string;
  status?: string;
  notes?: string;
  rawInput?: string;
}

/** Request body for PATCH /activities/:id (camelCase — matches shared UpdateActivityInput) */
interface UpdateActivityBody {
  title?: string;
  activityType?: string;
  value?: number | null;
  unit?: string | null;
  goalId?: string | null;
  activityDate?: string;
  category?: string;
  status?: string;
  notes?: string | null;
  completedAt?: string | null;
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
    const { date, startDate, endDate, goalId, status, activityType, limit, offset } =
      request.query;

    const result = await ActivityService.listActivities({
      ...(date         !== undefined && { date }),
      ...(startDate    !== undefined && { startDate }),
      ...(endDate      !== undefined && { endDate }),
      ...(goalId       !== undefined && { goalId }),
      ...(status       !== undefined && { status }),
      ...(activityType !== undefined && { activityType }),
      ...(limit        !== undefined && { limit }),
      ...(offset       !== undefined && { offset }),
    });

    return reply.send({ success: true, ...result });
  } catch (err) {
    return handleError('ActivityController', err, reply);
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
    return handleError('ActivityController', err, reply);
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
    return handleError('ActivityController', err, reply);
  }
}

/**
 * POST /api/activities
 * Log a new activity. Body is camelCase — passed directly to the service.
 */
export async function createActivity(
  request: FastifyRequest<{ Body: CreateActivityBody }>,
  reply: FastifyReply
) {
  try {
    const b = request.body;
    const activity = await ActivityService.createActivity({
      title:        b.title,
      activityType: b.activityType as 'quantity' | 'duration' | 'completion',
      activityDate: b.activityDate,
      ...(b.value    !== undefined && { value: b.value }),
      ...(b.unit     !== undefined && { unit: b.unit }),
      ...(b.goalId   !== undefined && { goalId: b.goalId }),
      ...(b.category !== undefined && { category: b.category as 'growth' | 'maintenance' }),
      ...(b.status   !== undefined && { status: b.status as 'planned' | 'completed' | 'skipped' }),
      ...(b.notes    !== undefined && { notes: b.notes }),
      ...(b.rawInput !== undefined && { rawInput: b.rawInput }),
    });
    return reply.status(201).send({ success: true, data: activity });
  } catch (err) {
    return handleError('ActivityController', err, reply);
  }
}

/**
 * PATCH /api/activities/:id
 * Update an activity. Body is camelCase — passed directly to the service.
 */
export async function updateActivity(
  request: FastifyRequest<{ Params: ActivityParams; Body: UpdateActivityBody }>,
  reply: FastifyReply
) {
  try {
    const b = request.body;
    const activity = await ActivityService.updateActivity(request.params.id, {
      ...(b.title        !== undefined && { title: b.title }),
      ...(b.activityType !== undefined && { activityType: b.activityType as 'quantity' | 'duration' | 'completion' }),
      ...(b.value        !== undefined && { value: b.value }),
      ...(b.unit         !== undefined && { unit: b.unit }),
      ...(b.goalId       !== undefined && { goalId: b.goalId }),
      ...(b.activityDate !== undefined && { activityDate: b.activityDate }),
      ...(b.category     !== undefined && { category: b.category as 'growth' | 'maintenance' }),
      ...(b.status       !== undefined && { status: b.status as 'planned' | 'completed' | 'skipped' }),
      ...(b.notes        !== undefined && { notes: b.notes }),
      ...(b.completedAt  !== undefined && { completedAt: b.completedAt }),
    });
    return reply.send({ success: true, data: activity });
  } catch (err) {
    return handleError('ActivityController', err, reply);
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
    return handleError('ActivityController', err, reply);
  }
}
