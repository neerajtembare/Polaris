/**
 * @file services/goal.service.ts
 * @description Business logic for Goals — all database queries live here.
 *   Controllers call this; nothing else should query Prisma directly for goals.
 * @module @polaris/backend/services
 *
 * @dependencies
 * - @prisma/client (via lib/prisma)
 * - lib/errors
 *
 * @relatedFiles
 * - src/controllers/goal.controller.ts
 * - src/lib/prisma.ts
 * - prisma/schema.prisma
 */

import prisma from '../lib/prisma.js';
import { notFound } from '../lib/errors.js';
import type { Goal as PrismaGoal } from '@prisma/client';
import type { CreateGoalInput, UpdateGoalInput } from '@polaris/shared';

// ---------------------------------------------------------------------------
// Types returned by this service
// ---------------------------------------------------------------------------

/** Computed progress metrics derived from linked activities */
export interface GoalProgress {
  goalId: string;
  currentValue: number;
  targetValue: number | null;
  unit: string | null;
  percentage: number | null;
  activityCount: number;
  lastActivityDate: string | null;
  daysActive: number;
}

/** Row shape returned by computeProgress's activity query */
type ActivityProgressRow = { value: number | null; activityDate: Date };

/** Filters accepted by listGoals */
export interface ListGoalsFilter {
  status?: string;        // 'active' | 'archived' | 'all' — default: 'active'
  timeframe?: string;
  parentId?: string | null;
  includeProgress?: boolean;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Compute progress metrics for a goal by aggregating its completed activities.
 * This is intentionally kept as a pure calculation — no side effects.
 */
async function computeProgress(goalId: string): Promise<GoalProgress> {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    select: { targetValue: true, targetUnit: true },
  });

  const activities = await prisma.activity.findMany({
    where: { goalId, isDeleted: false, status: 'completed' },
    select: { value: true, activityDate: true },
    orderBy: { activityDate: 'desc' },
  });

  const currentValue = activities.reduce(
    (sum: number, a: ActivityProgressRow) => sum + (a.value ?? 1),
    0
  );
  const targetValue = goal?.targetValue ?? null;
  const percentage =
    targetValue && targetValue > 0
      ? Math.min(Math.round((currentValue / targetValue) * 100), 100)
      : null;

  const dates = activities.map((a: ActivityProgressRow) =>
    a.activityDate.toISOString().split('T')[0] as string
  );
  const uniqueDates = new Set(dates);

  return {
    goalId,
    currentValue,
    targetValue,
    unit: goal?.targetUnit ?? null,
    percentage,
    activityCount: activities.length,
    lastActivityDate: dates[0] ?? null,
    daysActive: uniqueDates.size,
  };
}

/**
 * Write an event record for any mutation on a Goal.
 * Errors here are non-fatal — logged but never propagate to the caller.
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
        entityType: 'goal',
        entityId,
        eventType,
        previousState: previousState ? JSON.stringify(previousState) : null,
        newState: JSON.stringify(newState),
      },
    });
  } catch (err) {
    console.error('[GoalService] Failed to write event log:', err);
  }
}

// ---------------------------------------------------------------------------
// Public service methods
// ---------------------------------------------------------------------------

/**
 * Return all goals matching the optional filters.
 * Soft-deleted goals are always excluded.
 */
export async function listGoals(filter: ListGoalsFilter = {}) {
  const { status = 'active', timeframe, parentId, includeProgress = false } = filter;

  const goals = await prisma.goal.findMany({
    where: {
      isDeleted: false,
      ...(status !== 'all' && { status }),
      ...(timeframe && { timeframe }),
      ...(parentId === 'null' ? { parentId: null } : parentId ? { parentId } : {}),
    },
    orderBy: [{ timeframe: 'asc' }, { createdAt: 'desc' }],
  });

  if (!includeProgress) return goals;

  // Attach progress to each goal concurrently
  return Promise.all(
    goals.map(async (goal: PrismaGoal) => ({
      ...goal,
      progress: await computeProgress(goal.id),
    }))
  );
}

/**
 * Return a single goal by ID.
 * Throws 404 if not found or soft-deleted.
 */
export async function getGoalById(
  id: string,
  opts: { includeProgress?: boolean; includeChildren?: boolean } = {}
) {
  const goal = await prisma.goal.findFirst({
    where: { id, isDeleted: false },
    include: {
      ...(opts.includeChildren && {
        children: { where: { isDeleted: false }, select: { id: true, title: true, status: true } },
      }),
    },
  });

  if (!goal) throw notFound('Goal', id);

  if (!opts.includeProgress) return goal;

  return { ...goal, progress: await computeProgress(goal.id) };
}

/**
 * Create a new goal and log a 'created' event.
 * Returns the newly created goal.
 */
export async function createGoal(data: CreateGoalInput) {
  const goal = await prisma.goal.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      timeframe: data.timeframe ?? 'short',
      targetValue: data.targetValue ?? null,
      targetUnit: data.targetUnit ?? null,
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
      parentId: data.parentId ?? null,
    },
  });

  await logEvent(goal.id, 'created', goal);
  return goal;
}

/**
 * Update an existing goal and log an 'updated' event.
 * Throws 404 if goal is not found or soft-deleted.
 */
export async function updateGoal(id: string, data: UpdateGoalInput) {
  const existing = await prisma.goal.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw notFound('Goal', id);

  const updated = await prisma.goal.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.timeframe !== undefined && { timeframe: data.timeframe }),
      ...(data.targetValue !== undefined && { targetValue: data.targetValue }),
      ...(data.targetUnit !== undefined && { targetUnit: data.targetUnit }),
      ...(data.targetDate !== undefined && {
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
      }),
      ...(data.parentId !== undefined && { parentId: data.parentId }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });

  await logEvent(id, 'updated', updated, existing);
  return updated;
}

/**
 * Soft-delete a goal (and optionally its children) by setting `isDeleted = true`.
 * Throws 404 if goal is not found.
 */
export async function deleteGoal(id: string, cascade = false) {
  const existing = await prisma.goal.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw notFound('Goal', id);

  await prisma.goal.update({ where: { id }, data: { isDeleted: true } });

  if (cascade) {
    await prisma.goal.updateMany({ where: { parentId: id }, data: { isDeleted: true } });
  }

  await logEvent(id, 'deleted', { id, isDeleted: true }, existing);

  return { id, deleted: true };
}

/**
 * Return computed progress metrics for a goal.
 * Throws 404 if goal is not found.
 */
export async function getGoalProgress(id: string): Promise<GoalProgress> {
  const exists = await prisma.goal.findFirst({
    where: { id, isDeleted: false },
    select: { id: true },
  });
  if (!exists) throw notFound('Goal', id);

  return computeProgress(id);
}
