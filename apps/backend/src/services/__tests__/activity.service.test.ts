/**
 * @file src/services/__tests__/activity.service.test.ts
 * @description Unit tests for ActivityService — mocks Prisma so no real DB is needed.
 * @module @polaris/backend/services/test
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// Mock Prisma BEFORE importing the service
vi.mock('../../lib/prisma.js', () => {
  const prisma = {
    activity: {
      findMany:  vi.fn(),
      findFirst: vi.fn(),
      create:    vi.fn(),
      update:    vi.fn(),
      count:     vi.fn().mockResolvedValue(0),
    },
    goal: {
      findFirst: vi.fn(),
    },
    event: {
      create: vi.fn().mockResolvedValue({}),
    },
  };
  return { default: prisma };
});

import prisma from '../../lib/prisma.js';
import * as ActivityService from '../activity.service.js';
import { AppError } from '../../lib/errors.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockActivity = (overrides = {}) => ({
  id: 'act-1',
  title: 'Read chapter',
  notes: null,
  activityType: 'quantity',
  value: 1,
  unit: 'chapters',
  rawInput: null,
  goalId: 'goal-1',
  activityDate: new Date('2026-03-15'),
  category: 'growth',
  status: 'planned',
  aiGenerated: false,
  aiCategorized: false,
  isDeleted: false,
  createdAt: new Date('2026-03-15'),
  updatedAt: new Date('2026-03-15'),
  completedAt: null,
  goal: { title: 'Read 24 books' },
  ...overrides,
});

// ---------------------------------------------------------------------------
// createActivity
// ---------------------------------------------------------------------------

describe('createActivity()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a quantity activity with a value', async () => {
    const activity = mockActivity();
    (prisma.goal.findFirst as Mock).mockResolvedValue({ id: 'goal-1', isDeleted: false });
    (prisma.activity.create as Mock).mockResolvedValue(activity);

    const result = await ActivityService.createActivity({
      title: 'Read chapter',
      activityType: 'quantity',
      value: 1,
      unit: 'chapters',
      activityDate: '2026-03-15',
      goalId: 'goal-1',
    });

    expect(result.title).toBe('Read chapter');
    expect(prisma.activity.create).toHaveBeenCalledOnce();
    expect(prisma.event.create).toHaveBeenCalledOnce();
  });

  it('throws 400 when quantity activity has no value', async () => {
    await expect(
      ActivityService.createActivity({
        title: 'Run',
        activityType: 'quantity',
        activityDate: '2026-03-15',
        // value intentionally omitted
      })
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof AppError && err.statusCode === 400
    );
    expect(prisma.activity.create).not.toHaveBeenCalled();
  });

  it('throws 400 when duration activity has no value', async () => {
    await expect(
      ActivityService.createActivity({
        title: 'Meditate',
        activityType: 'duration',
        activityDate: '2026-03-15',
        // value intentionally omitted
      })
    ).rejects.toSatisfy((err: unknown) => err instanceof AppError && err.statusCode === 400);
  });

  it('allows completion type without a value', async () => {
    const activity = mockActivity({ activityType: 'completion', value: null });
    (prisma.activity.create as Mock).mockResolvedValue(activity);

    const result = await ActivityService.createActivity({
      title: 'Daily standup',
      activityType: 'completion',
      activityDate: '2026-03-15',
    });

    expect(result.activityType).toBe('completion');
    expect(prisma.activity.create).toHaveBeenCalledOnce();
  });

  it('throws 404 when goalId references a non-existent goal', async () => {
    (prisma.goal.findFirst as Mock).mockResolvedValue(null);

    await expect(
      ActivityService.createActivity({
        title: 'Run',
        activityType: 'quantity',
        value: 5,
        unit: 'km',
        activityDate: '2026-03-15',
        goalId: 'missing-goal',
      })
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof AppError && err.statusCode === 404
    );
    expect(prisma.activity.create).not.toHaveBeenCalled();
  });

  it('auto-sets completedAt to activityDate when status is completed', async () => {
    const activity = mockActivity({ status: 'completed', completedAt: new Date('2026-03-15') });
    (prisma.activity.create as Mock).mockResolvedValue(activity);

    await ActivityService.createActivity({
      title: 'Workout',
      activityType: 'completion',
      activityDate: '2026-03-15',
      status: 'completed',
    });

    const createData = (prisma.activity.create as Mock).mock.calls[0]?.[0]?.data;
    expect(createData?.completedAt).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getActivityById
// ---------------------------------------------------------------------------

describe('getActivityById()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns activity when found', async () => {
    const activity = mockActivity();
    (prisma.activity.findFirst as Mock).mockResolvedValue(activity);

    const result = await ActivityService.getActivityById('act-1');
    expect(result).toEqual(activity);
  });

  it('throws 404 when activity not found', async () => {
    (prisma.activity.findFirst as Mock).mockResolvedValue(null);

    await expect(ActivityService.getActivityById('missing')).rejects.toSatisfy(
      (err: unknown) => err instanceof AppError && err.statusCode === 404
    );
  });
});

// ---------------------------------------------------------------------------
// updateActivity
// ---------------------------------------------------------------------------

describe('updateActivity()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates and returns the activity', async () => {
    const existing = mockActivity();
    const updated  = mockActivity({ title: 'Read 2 chapters', value: 2 });

    (prisma.activity.findFirst as Mock).mockResolvedValue(existing);
    (prisma.activity.update as Mock).mockResolvedValue(updated);

    const result = await ActivityService.updateActivity('act-1', {
      title: 'Read 2 chapters',
      value: 2,
    });

    expect(result.title).toBe('Read 2 chapters');
    expect(prisma.event.create).toHaveBeenCalledOnce();
  });

  it('throws 404 when activity not found', async () => {
    (prisma.activity.findFirst as Mock).mockResolvedValue(null);

    await expect(
      ActivityService.updateActivity('missing', { title: 'x' })
    ).rejects.toSatisfy((err: unknown) => err instanceof AppError && err.statusCode === 404);
    expect(prisma.activity.update).not.toHaveBeenCalled();
  });

  it('sets completedAt when status changes to completed', async () => {
    const existing = mockActivity({ status: 'planned', completedAt: null });
    const updated  = mockActivity({ status: 'completed', completedAt: new Date() });

    (prisma.activity.findFirst as Mock).mockResolvedValue(existing);
    (prisma.activity.update as Mock).mockResolvedValue(updated);

    await ActivityService.updateActivity('act-1', { status: 'completed' });

    const updateData = (prisma.activity.update as Mock).mock.calls[0]?.[0]?.data;
    expect(updateData?.completedAt).not.toBeNull();
  });
});
