/**
 * @file services/focus-session.service.ts
 * @description Business logic for FocusSessions — all database queries live here.
 *   Handles create, complete (with auto-Activity), abandon, list, and soft-delete.
 * @module @polaris/backend/services
 *
 * @dependencies
 * - @prisma/client (via lib/prisma)
 * - lib/errors
 * - @polaris/shared (FocusSession types)
 *
 * @relatedFiles
 * - src/controllers/focus-session.controller.ts
 * - src/lib/prisma.ts
 * - prisma/schema.prisma (FocusSession model)
 */

import prisma from '../lib/prisma.js';
import { notFound } from '../lib/errors.js';
import type {
  CreateFocusSessionInput,
  UpdateFocusSessionInput,
  CompleteFocusSessionInput,
  AbandonFocusSessionInput,
  FocusSession,
} from '@polaris/shared';

// ---------------------------------------------------------------------------
// Internal Prisma shape (avoids depending on generated types pre-compile)
// ---------------------------------------------------------------------------

interface PrismaFocusSession {
  id:         string;
  goalId:     string | null;
  activityId: string | null;
  plannedMins: number;
  actualMins: number | null;
  breaks:     number;
  status:     string;
  startedAt:  Date;
  endedAt:    Date | null;
  notes:      string | null;
  userId:     string | null;
  isDeleted:  boolean;
  createdAt:  Date;
  updatedAt:  Date;
}

// ---------------------------------------------------------------------------
// Serialiser
// ---------------------------------------------------------------------------

function serialize(s: PrismaFocusSession): FocusSession {
  return {
    id:          s.id,
    goalId:      s.goalId,
    activityId:  s.activityId,
    plannedMins: s.plannedMins,
    actualMins:  s.actualMins,
    breaks:      s.breaks,
    status:      s.status as FocusSession['status'],
    startedAt:   s.startedAt.toISOString(),
    endedAt:     s.endedAt ? s.endedAt.toISOString() : null,
    notes:       s.notes,
    userId:      s.userId,
    isDeleted:   s.isDeleted,
    createdAt:   s.createdAt.toISOString(),
    updatedAt:   s.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Query filters
// ---------------------------------------------------------------------------

export interface ListFocusSessionsFilter {
  status?: string;
  goalId?: string;
  limit?:  number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * List focus sessions (reverse chronological, excludes soft-deleted).
 */
export async function listFocusSessions(filter: ListFocusSessionsFilter = {}): Promise<FocusSession[]> {
  const { status, goalId, limit = 50, offset = 0 } = filter;

  const sessions = await prisma.focusSession.findMany({
    where: {
      isDeleted: false,
      ...(status ? { status } : {}),
      ...(goalId ? { goalId } : {}),
    },
    orderBy: { startedAt: 'desc' },
    take: limit,
    skip: offset,
  });

  return sessions.map(serialize);
}

/**
 * Get a single session by ID. Throws 404 if not found or soft-deleted.
 */
export async function getFocusSession(id: string): Promise<FocusSession> {
  const session = await prisma.focusSession.findFirst({
    where: { id, isDeleted: false },
  });
  if (!session) throw notFound('FocusSession', id);
  return serialize(session);
}

/**
 * Create a new focus session in 'active' status.
 */
export async function createFocusSession(input: CreateFocusSessionInput): Promise<FocusSession> {
  const session = await prisma.focusSession.create({
    data: {
      goalId:      input.goalId ?? null,
      plannedMins: input.plannedMins,
      notes:       input.notes ?? null,
      status:      'active',
      startedAt:   new Date(),
    },
  });
  return serialize(session);
}

/**
 * Partial update — for timer UI state (breaks++, notes, etc).
 */
export async function updateFocusSession(id: string, input: UpdateFocusSessionInput): Promise<FocusSession> {
  const existing = await prisma.focusSession.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw notFound('FocusSession', id);

  const session = await prisma.focusSession.update({
    where: { id },
    data: {
      ...(input.status     !== undefined ? { status:     input.status }                  : {}),
      ...(input.actualMins !== undefined ? { actualMins: input.actualMins }              : {}),
      ...(input.breaks     !== undefined ? { breaks:     input.breaks }                  : {}),
      ...(input.endedAt    !== undefined ? { endedAt:    new Date(input.endedAt) }        : {}),
      ...(input.notes      !== undefined ? { notes:      input.notes }                   : {}),
      ...(input.activityId !== undefined ? { activityId: input.activityId }              : {}),
    },
  });
  return serialize(session);
}

/**
 * Mark a session completed. Optionally auto-creates an Activity linked to the session.
 * The auto-created activity is linked back via `activityId` on the session.
 */
export async function completeFocusSession(
  id: string,
  input: CompleteFocusSessionInput
): Promise<FocusSession> {
  const session = await prisma.focusSession.findFirst({ where: { id, isDeleted: false } });
  if (!session) throw notFound('FocusSession', id);

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  let activityId: string | null = session.activityId;

  // Auto-log activity if requested and not already linked
  if (input.autoLogActivity && !activityId) {
    const goal = session.goalId
      ? await prisma.goal.findFirst({ where: { id: session.goalId, isDeleted: false }, select: { title: true } })
      : null;

    const activity = await prisma.activity.create({
      data: {
        title:        goal ? `Focus: ${goal.title}` : 'Focus Session',
        activityType: 'duration',
        value:        input.actualMins,
        unit:         'min',
        status:       'completed',
        goalId:       session.goalId ?? null,
        activityDate: today ?? now.toISOString().substring(0, 10),
        completedAt:  now,
        notes:        input.notes ?? null,
      },
    });
    activityId = activity.id;
  }

  const updated = await prisma.focusSession.update({
    where: { id },
    data: {
      status:     'completed',
      actualMins: input.actualMins,
      breaks:     input.breaks ?? session.breaks,
      endedAt:    now,
      notes:      input.notes ?? session.notes,
      activityId,
    },
  });

  return serialize(updated);
}

/**
 * Mark a session abandoned and log partial minutes if > 0.
 */
export async function abandonFocusSession(
  id: string,
  input: AbandonFocusSessionInput
): Promise<FocusSession> {
  const session = await prisma.focusSession.findFirst({ where: { id, isDeleted: false } });
  if (!session) throw notFound('FocusSession', id);

  const now = new Date();

  let activityId: string | null = session.activityId;

  // Log partial time if meaningful (> 2 minutes)
  if (input.actualMins > 2 && !activityId) {
    const today = now.toISOString().split('T')[0];
    const goal = session.goalId
      ? await prisma.goal.findFirst({ where: { id: session.goalId, isDeleted: false }, select: { title: true } })
      : null;

    const activity = await prisma.activity.create({
      data: {
        title:        goal ? `Partial focus: ${goal.title}` : 'Partial focus session',
        activityType: 'duration',
        value:        input.actualMins,
        unit:         'min',
        status:       'completed',
        goalId:       session.goalId ?? null,
        activityDate: today ?? now.toISOString().substring(0, 10),
        completedAt:  now,
        notes:        input.notes ?? 'Session abandoned.',
      },
    });
    activityId = activity.id;
  }

  const updated = await prisma.focusSession.update({
    where: { id },
    data: {
      status:     'abandoned',
      actualMins: input.actualMins,
      endedAt:    now,
      notes:      input.notes ?? session.notes,
      activityId,
    },
  });

  return serialize(updated);
}

/**
 * Soft-delete a session.
 */
export async function deleteFocusSession(id: string): Promise<void> {
  const existing = await prisma.focusSession.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw notFound('FocusSession', id);
  await prisma.focusSession.update({ where: { id }, data: { isDeleted: true } });
}

/**
 * Aggregate focus minutes per day for a date range (used in Insights chart).
 * Returns a Record<YYYY-MM-DD, totalMinutes>.
 */
export async function getFocusMinutesByDay(
  startDate: string,
  endDate: string
): Promise<Record<string, number>> {
  const sessions = await prisma.focusSession.findMany({
    where: {
      isDeleted:  false,
      status:     { in: ['completed', 'abandoned'] },
      startedAt:  { gte: new Date(startDate), lte: new Date(`${endDate}T23:59:59Z`) },
      actualMins: { not: null },
    },
    select: { startedAt: true, actualMins: true },
  });

  const result: Record<string, number> = {};
  for (const s of sessions) {
    const day = s.startedAt.toISOString().split('T')[0] as string;
    result[day] = (result[day] ?? 0) + (s.actualMins ?? 0);
  }
  return result;
}
