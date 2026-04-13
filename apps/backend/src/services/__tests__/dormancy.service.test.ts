/**
 * @file src/services/__tests__/dormancy.service.test.ts
 * @description Unit tests for DormancyService — mocks Prisma so no real DB is needed.
 * @module @polaris/backend/services/test
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('../../lib/prisma.js', () => {
  const prisma = {
    goal: {
      findMany: vi.fn(),
    },
  };
  return { default: prisma };
});

import prisma from '../../lib/prisma.js';
import { getDormantGoals, DORMANCY_THRESHOLD_DAYS } from '../dormancy.service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a Date that is `days` ago from now */
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

const mockGoalRow = (overrides: {
  id?: string;
  title?: string;
  timeframe?: string;
  targetValue?: number | null;
  activities?: Array<{ activityDate: Date; value: number }>;
} = {}) => ({
  id:          overrides.id ?? 'goal-1',
  title:       overrides.title ?? 'Read 24 books',
  timeframe:   overrides.timeframe ?? 'long',
  targetValue: overrides.targetValue ?? 24,
  activities:  overrides.activities ?? [],
});

// ---------------------------------------------------------------------------
// getDormantGoals
// ---------------------------------------------------------------------------

describe('getDormantGoals()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns goals that have never been touched', async () => {
    (prisma.goal.findMany as Mock).mockResolvedValue([
      mockGoalRow({ activities: [] }),
    ]);

    const result = await getDormantGoals();
    expect(result).toHaveLength(1);
    expect(result[0]?.daysSinceLastActivity).toBeNull();
  });

  it(`returns goals untouched for >= ${DORMANCY_THRESHOLD_DAYS} days`, async () => {
    (prisma.goal.findMany as Mock).mockResolvedValue([
      mockGoalRow({
        activities: [{ activityDate: daysAgo(DORMANCY_THRESHOLD_DAYS), value: 1 }],
      }),
    ]);

    const result = await getDormantGoals();
    expect(result).toHaveLength(1);
    expect(result[0]?.daysSinceLastActivity).toBeGreaterThanOrEqual(DORMANCY_THRESHOLD_DAYS);
  });

  it('excludes goals touched recently (< threshold)', async () => {
    (prisma.goal.findMany as Mock).mockResolvedValue([
      mockGoalRow({
        activities: [{ activityDate: daysAgo(2), value: 1 }],
      }),
    ]);

    const result = await getDormantGoals();
    expect(result).toHaveLength(0);
  });

  it('computes progress as a percentage of targetValue', async () => {
    (prisma.goal.findMany as Mock).mockResolvedValue([
      mockGoalRow({
        targetValue: 100,
        activities:  [
          { activityDate: daysAgo(10), value: 40 },
          { activityDate: daysAgo(30), value: 20 },
        ],
      }),
    ]);

    const result = await getDormantGoals();
    expect(result[0]?.progress).toBe(60);
  });

  it('returns progress 0 when targetValue is null', async () => {
    (prisma.goal.findMany as Mock).mockResolvedValue([
      mockGoalRow({ targetValue: null, activities: [] }),
    ]);

    const result = await getDormantGoals();
    expect(result[0]?.progress).toBe(0);
  });

  it('returns empty array when no goals exist', async () => {
    (prisma.goal.findMany as Mock).mockResolvedValue([]);
    const result = await getDormantGoals();
    expect(result).toHaveLength(0);
  });
});
