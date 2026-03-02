/**
 * @file services/activity.service.ts
 * @description Business logic for Activities — all database queries live here.
 *   Controllers call this; nothing else should query Prisma directly for activities.
 * @module @polaris/backend/services
 *
 * @dependencies
 * - @prisma/client (via lib/prisma)
 * - lib/errors
 *
 * @relatedFiles
 * - src/controllers/activity.controller.ts
 * - src/lib/prisma.ts
 * - prisma/schema.prisma
 */

import prisma from '../lib/prisma.js';
import { notFound, badRequest } from '../lib/errors.js';
import type { Prisma } from '@prisma/client';
import type { CreateActivityInput, UpdateActivityInput } from '@polaris/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Prisma payload type for an activity with its goal title included */
type ActivityWithGoal = Prisma.ActivityGetPayload<{
  include: { goal: { select: { title: true } } };
}>;

/** Shape of each activity item returned by listActivities */
export type ListedActivity = Omit<ActivityWithGoal, 'goal'> & { goalTitle: string | null };

export interface ListActivitiesFilter {
  date?: string;         // single day  YYYY-MM-DD
  startDate?: string;
  endDate?: string;
  goalId?: string;
  status?: string;
  activityType?: string;
  limit?: number;
  offset?: number;
}

export interface TodayActivities {
  date: string;
  planned: unknown[];
  completed: unknown[];
  skipped: unknown[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Parse a YYYY-MM-DD string into start/end DateTime boundaries for a full day */
function dayBounds(dateStr: string): { gte: Date; lt: Date } {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) throw badRequest(`Invalid date: "${dateStr}"`);
  const next = new Date(d);
  next.setDate(next.getDate() + 1);
  return { gte: d, lt: next };
}

/**
 * Write an event record for any mutation on an Activity.
 * Errors here are non-fatal — logged but never propagated.
 */
async function logEvent(
  entityId: string,
  eventType: string,
  newState: unknown,
  previousState?: unknown
): Promise<void> {
  try {
    await prisma.event.create({
      data: {
        entityType: 'activity',
        entityId,
        eventType,
        previousState: previousState ? JSON.stringify(previousState) : null,
        newState: JSON.stringify(newState),
      },
    });
  } catch (err) {
    console.error('[ActivityService] Failed to write event log:', err);
  }
}

// ---------------------------------------------------------------------------
// Public service methods
// ---------------------------------------------------------------------------

/**
 * Return activities matching optional filters.
 * Always excludes soft-deleted records.
 */
export async function listActivities(filter: ListActivitiesFilter = {}) {
  const {
    date, startDate, endDate, goalId, status, activityType,
    limit = 50, offset = 0,
  } = filter;

  // Build activityDate filter
  let dateFilter: Record<string, unknown> | undefined;
  if (date) {
    dateFilter = dayBounds(date);
  } else if (startDate ?? endDate) {
    dateFilter = {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate && { lte: new Date(endDate) }),
    };
  }

  const where = {
    isDeleted: false,
    ...(dateFilter && { activityDate: dateFilter }),
    ...(goalId && { goalId }),
    ...(status && { status }),
    ...(activityType && { activityType }),
  };

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: { goal: { select: { title: true } } },
      orderBy: { activityDate: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.activity.count({ where }),
  ]);

  // Flatten goal title onto activity for convenience
  const data: ListedActivity[] = activities.map(({ goal, ...a }: ActivityWithGoal) => ({
    ...a,
    goalTitle: goal?.title ?? null,
  }));

  return { data, meta: { total, limit, offset } };
}

/**
 * Return a single activity by ID.
 * Throws 404 if not found or soft-deleted.
 */
export async function getActivityById(id: string) {
  const activity = await prisma.activity.findFirst({
    where: { id, isDeleted: false },
    include: { goal: { select: { id: true, title: true } } },
  });
  if (!activity) throw notFound('Activity', id);
  return activity;
}

/**
 * Create a new activity and log a 'created' event.
 * If `status` is 'completed' and `completedAt` is not supplied, it is set to now.
 */
export async function createActivity(data: CreateActivityInput) {
  // quantity/duration types need a value
  if (data.activityType !== 'completion' && data.value === undefined) {
    throw badRequest(`Activities of type "${data.activityType}" require a value`);
  }

  // If goal_id is provided, verify it exists and isn't deleted
  if (data.goalId) {
    const goal = await prisma.goal.findFirst({ where: { id: data.goalId, isDeleted: false } });
    if (!goal) throw notFound('Goal', data.goalId);
  }

  const isCompleted = (data.status ?? 'planned') === 'completed';

  const activity = await prisma.activity.create({
    data: {
      title: data.title,
      notes: data.notes ?? null,
      activityType: data.activityType,
      value: data.value ?? null,
      unit: data.unit ?? null,
      rawInput: data.rawInput ?? null,
      goalId: data.goalId ?? null,
      activityDate: new Date(data.activityDate),
      category: data.category ?? 'growth',
      status: data.status ?? 'planned',
      completedAt: isCompleted ? new Date() : null,
    },
  });

  await logEvent(activity.id, 'created', activity);
  return activity;
}

/**
 * Update an existing activity and log an 'updated' event.
 * If status changes to 'completed', completedAt is set automatically.
 * Throws 404 if activity is not found or soft-deleted.
 */
export async function updateActivity(id: string, data: UpdateActivityInput) {
  const existing = await prisma.activity.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw notFound('Activity', id);

  // If linking to a new goal, confirm that goal exists
  if (data.goalId !== undefined && data.goalId !== null) {
    const goal = await prisma.goal.findFirst({ where: { id: data.goalId, isDeleted: false } });
    if (!goal) throw notFound('Goal', data.goalId);
  }

  const completingNow = data.status === 'completed' && existing.status !== 'completed';

  const updated = await prisma.activity.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.activityType !== undefined && { activityType: data.activityType }),
      ...(data.value !== undefined && { value: data.value }),
      ...(data.unit !== undefined && { unit: data.unit }),
      ...(data.goalId !== undefined && { goalId: data.goalId }),
      ...(data.activityDate !== undefined && { activityDate: new Date(data.activityDate) }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.completedAt !== undefined
        ? { completedAt: data.completedAt ? new Date(data.completedAt) : null }
        : completingNow
        ? { completedAt: new Date() }
        : {}),
    },
  });

  await logEvent(id, 'updated', updated, existing);
  return updated;
}

/**
 * Soft-delete an activity by setting `isDeleted = true`.
 * Throws 404 if not found.
 */
export async function deleteActivity(id: string) {
  const existing = await prisma.activity.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw notFound('Activity', id);

  await prisma.activity.update({ where: { id }, data: { isDeleted: true } });
  await logEvent(id, 'deleted', { id, isDeleted: true }, existing);

  return { id, deleted: true };
}

/**
 * Return today's activities grouped by status (planned / completed / skipped).
 * "Today" is determined by the server's local date.
 */
export async function getTodayActivities(): Promise<TodayActivities> {
  const today = new Date().toISOString().split('T')[0] as string;
  const { data: activities } = await listActivities({ date: today, limit: 200 });

  return {
    date: today,
    planned:   activities.filter((a) => a.status === 'planned'),
    completed: activities.filter((a) => a.status === 'completed'),
    skipped:   activities.filter((a) => a.status === 'skipped'),
  };
}
