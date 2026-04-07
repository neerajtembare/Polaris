/**
 * @file src/services/__tests__/goal.service.test.ts
 * @description Unit tests for the GoalService — mocks Prisma so no real DB is needed.
 * @module @polaris/backend/services/test
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Prisma singleton BEFORE importing the service
// ---------------------------------------------------------------------------

vi.mock('../../lib/prisma.js', () => {
  const prisma = {
    goal: {
      findMany:  vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create:    vi.fn(),
      update:    vi.fn(),
      updateMany: vi.fn(),
    },
    activity: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    event: {
      create: vi.fn().mockResolvedValue({}),
    },
  };
  return { default: prisma };
});

import prisma from '../../lib/prisma.js';
import * as GoalService from '../goal.service.js';
import { AppError } from '../../lib/errors.js';

// Helpers
const mockGoal = (overrides = {}) => ({
  id: 'goal-1',
  title: 'Read 24 books',
  description: null,
  timeframe: 'long',
  targetValue: 24,
  targetUnit: 'books',
  targetDate: null,
  parentId: null,
  status: 'active',
  isDeleted: false,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

// ---------------------------------------------------------------------------
// listGoals
// ---------------------------------------------------------------------------

describe('listGoals()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries with isDeleted: false and default status active', async () => {
    (prisma.goal.findMany as Mock).mockResolvedValue([]);

    await GoalService.listGoals();

    expect(prisma.goal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isDeleted: false, status: 'active' }),
      })
    );
  });

  it('returns goals without progress by default', async () => {
    const goals = [mockGoal()];
    (prisma.goal.findMany as Mock).mockResolvedValue(goals);

    const result = await GoalService.listGoals();

    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty('progress');
    // Should NOT query activities when includeProgress is false
    expect(prisma.activity.findMany).not.toHaveBeenCalled();
  });

  it('accepts status=all filter and omits status from where clause', async () => {
    (prisma.goal.findMany as Mock).mockResolvedValue([]);

    await GoalService.listGoals({ status: 'all' });

    const calledWith = (prisma.goal.findMany as Mock).mock.calls[0]?.[0];
    expect(calledWith?.where).not.toHaveProperty('status');
  });

  it('attaches progress when includeProgress=true', async () => {
    const goals = [mockGoal({ id: 'goal-1' })];
    (prisma.goal.findMany as Mock).mockResolvedValue(goals);
    (prisma.goal.findUnique as Mock).mockResolvedValue({ targetValue: 24, targetUnit: 'books' });
    (prisma.activity.findMany as Mock).mockResolvedValue([{ value: 10, activityDate: new Date() }]);

    const result = await GoalService.listGoals({ includeProgress: true }) as unknown as Array<{ progress: unknown }>;

    expect(result[0]).toHaveProperty('progress');
  });
});

// ---------------------------------------------------------------------------
// getGoalById
// ---------------------------------------------------------------------------

describe('getGoalById()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the goal when found', async () => {
    const goal = mockGoal();
    (prisma.goal.findFirst as Mock).mockResolvedValue(goal);

    const result = await GoalService.getGoalById('goal-1');

    expect(result).toEqual(goal);
    expect(prisma.goal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'goal-1', isDeleted: false },
      })
    );
  });

  it('throws 404 when goal does not exist', async () => {
    (prisma.goal.findFirst as Mock).mockResolvedValue(null);

    await expect(GoalService.getGoalById('nonexistent')).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 404 &&
        err.code === 'NOT_FOUND'
    );
  });
});

// ---------------------------------------------------------------------------
// createGoal
// ---------------------------------------------------------------------------

describe('createGoal()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a goal and logs an event', async () => {
    const goal = mockGoal();
    (prisma.goal.create as Mock).mockResolvedValue(goal);

    const result = await GoalService.createGoal({ title: 'Read 24 books', timeframe: 'long' });

    expect(result.title).toBe('Read 24 books');
    expect(prisma.event.create).toHaveBeenCalledOnce();
    const eventData = (prisma.event.create as Mock).mock.calls[0]?.[0]?.data;
    expect(eventData?.eventType).toBe('created');
    expect(eventData?.entityType).toBe('goal');
  });

  it('handles optional fields with null defaults', async () => {
    const goal = mockGoal({ description: null, targetValue: null });
    (prisma.goal.create as Mock).mockResolvedValue(goal);

    await GoalService.createGoal({ title: 'Simple goal' });

    const createData = (prisma.goal.create as Mock).mock.calls[0]?.[0]?.data;
    expect(createData?.description).toBeNull();
    expect(createData?.targetValue).toBeNull();
    expect(createData?.timeframe).toBe('short'); // default
  });
});

// ---------------------------------------------------------------------------
// updateGoal
// ---------------------------------------------------------------------------

describe('updateGoal()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates the goal and logs an event', async () => {
    const existing = mockGoal();
    const updated  = mockGoal({ title: 'Read 30 books', targetValue: 30 });

    (prisma.goal.findFirst as Mock).mockResolvedValue(existing);
    (prisma.goal.update as Mock).mockResolvedValue(updated);

    const result = await GoalService.updateGoal('goal-1', { title: 'Read 30 books', targetValue: 30 });

    expect(result.title).toBe('Read 30 books');
    expect(prisma.event.create).toHaveBeenCalledOnce();
    const eventData = (prisma.event.create as Mock).mock.calls[0]?.[0]?.data;
    expect(eventData?.eventType).toBe('updated');
  });

  it('throws 404 when updating non-existent goal', async () => {
    (prisma.goal.findFirst as Mock).mockResolvedValue(null);

    await expect(GoalService.updateGoal('missing', { title: 'New' })).rejects.toSatisfy(
      (err: unknown) => err instanceof AppError && err.statusCode === 404
    );
    expect(prisma.goal.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deleteGoal
// ---------------------------------------------------------------------------

describe('deleteGoal()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('soft-deletes a goal', async () => {
    const existing = mockGoal();
    (prisma.goal.findFirst as Mock).mockResolvedValue(existing);
    (prisma.goal.update as Mock).mockResolvedValue({ ...existing, isDeleted: true });

    const result = await GoalService.deleteGoal('goal-1');

    expect(result).toEqual({ id: 'goal-1', deleted: true });
    expect(prisma.goal.update).toHaveBeenCalledWith({
      where: { id: 'goal-1' },
      data: { isDeleted: true },
    });
    expect(prisma.goal.updateMany).not.toHaveBeenCalled();
  });

  it('cascades to children when cascade=true', async () => {
    const existing = mockGoal();
    (prisma.goal.findFirst as Mock).mockResolvedValue(existing);
    (prisma.goal.update as Mock).mockResolvedValue({ ...existing, isDeleted: true });
    (prisma.goal.updateMany as Mock).mockResolvedValue({ count: 2 });

    await GoalService.deleteGoal('goal-1', true);

    expect(prisma.goal.updateMany).toHaveBeenCalledWith({
      where: { parentId: 'goal-1' },
      data: { isDeleted: true },
    });
  });

  it('throws 404 for non-existent goal', async () => {
    (prisma.goal.findFirst as Mock).mockResolvedValue(null);

    await expect(GoalService.deleteGoal('missing')).rejects.toSatisfy(
      (err: unknown) => err instanceof AppError && err.statusCode === 404
    );
  });
});
