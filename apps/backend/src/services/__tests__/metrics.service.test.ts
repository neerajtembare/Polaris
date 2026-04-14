/**
 * @file src/services/__tests__/metrics.service.test.ts
 * @description Unit tests for MetricsService — mocks Prisma so no real DB is needed.
 * @module @polaris/backend/services/test
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('../../lib/prisma.js', () => {
  const prisma = {
    activity: {
      findMany:  vi.fn(),
      groupBy:   vi.fn(),
    },
    goal: {
      findMany: vi.fn(),
    },
  };
  return { default: prisma };
});

import prisma from '../../lib/prisma.js';
import { getDashboardMetrics } from '../metrics.service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const today = new Date().toISOString().split('T')[0] as string;

/** Build a fake activity with a date `daysAgo` from today */
function activityOnDay(daysAgo: number, status = 'completed') {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return { goalId: 'goal-1', status, activityDate: d };
}

// ---------------------------------------------------------------------------
// getDashboardMetrics
// ---------------------------------------------------------------------------

describe('getDashboardMetrics()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns zero metrics when there are no activities', async () => {
    (prisma.activity.findMany as Mock).mockResolvedValue([]);
    (prisma.goal.findMany as Mock).mockResolvedValue([]);
    (prisma.activity.groupBy as Mock).mockResolvedValue([]);

    const result = await getDashboardMetrics('week');

    expect(result.totalActivities).toBe(0);
    expect(result.completedActivities).toBe(0);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
  });

  it('counts total and completed activities correctly', async () => {
    (prisma.activity.findMany as Mock)
      // First call: period activities
      .mockResolvedValueOnce([
        activityOnDay(0, 'completed'),
        activityOnDay(1, 'completed'),
        activityOnDay(2, 'planned'),
      ])
      // Second call: streak data (all-time completed)
      .mockResolvedValueOnce([
        activityOnDay(0, 'completed'),
        activityOnDay(1, 'completed'),
      ]);
    (prisma.goal.findMany as Mock).mockResolvedValue([]);
    (prisma.activity.groupBy as Mock).mockResolvedValue([]);

    const result = await getDashboardMetrics('week');

    expect(result.totalActivities).toBe(3);
    expect(result.completedActivities).toBe(2);
    expect(result.plannedActivities).toBe(1);
  });

  it('calculates a current streak of 2 for consecutive days', async () => {
    (prisma.activity.findMany as Mock)
      .mockResolvedValueOnce([activityOnDay(0), activityOnDay(1)])
      .mockResolvedValueOnce([activityOnDay(0), activityOnDay(1)]);
    (prisma.goal.findMany as Mock).mockResolvedValue([]);
    (prisma.activity.groupBy as Mock).mockResolvedValue([]);

    const result = await getDashboardMetrics('week');

    expect(result.currentStreak).toBeGreaterThanOrEqual(2);
  });

  it('returns currentStreak 0 when there is no activity today or yesterday', async () => {
    (prisma.activity.findMany as Mock)
      .mockResolvedValueOnce([]) // period
      .mockResolvedValueOnce([activityOnDay(5)]); // streak: activity 5 days ago, no streak
    (prisma.goal.findMany as Mock).mockResolvedValue([]);
    (prisma.activity.groupBy as Mock).mockResolvedValue([]);

    const result = await getDashboardMetrics('week');
    expect(result.currentStreak).toBe(0);
  });

  it('builds activityByDay heatmap filled for entire period', async () => {
    (prisma.activity.findMany as Mock)
      .mockResolvedValueOnce([activityOnDay(0)])
      .mockResolvedValueOnce([activityOnDay(0)]);
    (prisma.goal.findMany as Mock).mockResolvedValue([]);
    (prisma.activity.groupBy as Mock).mockResolvedValue([]);

    const result = await getDashboardMetrics('week');

    // Week period: 7 days
    expect(Object.keys(result.activityByDay)).toHaveLength(7);
    // Today should have count 1
    expect(result.activityByDay?.[today]).toBe(1);
  });

  it('works with month and year periods', async () => {
    (prisma.activity.findMany as Mock).mockResolvedValue([]);
    (prisma.goal.findMany as Mock).mockResolvedValue([]);
    (prisma.activity.groupBy as Mock).mockResolvedValue([]);

    const monthResult = await getDashboardMetrics('month');
    const yearResult  = await getDashboardMetrics('year');

    expect(Object.keys(monthResult.activityByDay)).toHaveLength(30);
    expect(Object.keys(yearResult.activityByDay)).toHaveLength(365);
  });
});
