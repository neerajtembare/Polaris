/**
 * @file services/dormancy.service.ts
 * @description Detects goals that have had no activity for >= DORMANCY_THRESHOLD_DAYS.
 *   Used by the Weekly Review screen and Goal Matrix to surface neglected goals.
 * @module @polaris/backend/services
 *
 * @dependencies
 * - @prisma/client (via lib/prisma)
 * - @polaris/shared (DormantGoal)
 *
 * @relatedFiles
 * - apps/backend/src/routes/goals.ts
 * - apps/frontend/src/hooks/useDormantGoals.ts
 */

import type { DormantGoal } from '@polaris/shared';
import prisma from '../lib/prisma.js';

/** Goals untouched for this many days are considered dormant */
export const DORMANCY_THRESHOLD_DAYS = 7;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysBetween(date: Date): number {
  const now = Date.now();
  return Math.floor((now - date.getTime()) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Returns all active goals that have had no completed activity for
 * >= DORMANCY_THRESHOLD_DAYS days (or have never been touched).
 */
export async function getDormantGoals(): Promise<DormantGoal[]> {
  const goals = await prisma.goal.findMany({
    where: { isDeleted: false, status: 'active' },
    select: {
      id:          true,
      title:       true,
      timeframe:   true,
      targetValue: true,
      activities: {
        where:   { isDeleted: false, status: 'completed' },
        select:  { activityDate: true, value: true },
        orderBy: { activityDate: 'desc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const dormant: DormantGoal[] = [];

  for (const goal of goals) {
    const lastActivity = goal.activities[0] ?? null;

    const daysSince =
      lastActivity !== null ? daysBetween(lastActivity.activityDate) : null;

    // Mark dormant if never touched OR untouched for >= threshold
    const isDormant = daysSince === null || daysSince >= DORMANCY_THRESHOLD_DAYS;
    if (!isDormant) continue;

    // Compute progress
    const totalValue = goal.activities.reduce((sum, a) => sum + (a.value ?? 0), 0);
    const progress =
      goal.targetValue && goal.targetValue > 0
        ? Math.min(100, Math.round((totalValue / goal.targetValue) * 100))
        : 0;

    dormant.push({
      id:                    goal.id,
      title:                 goal.title,
      timeframe:             goal.timeframe as DormantGoal['timeframe'],
      progress,
      daysSinceLastActivity: daysSince,
      lastActivityDate:
        lastActivity !== null
          ? lastActivity.activityDate.toISOString().split('T')[0]!
          : null,
    });
  }

  // Most-dormant first (nulls treated as max)
  dormant.sort((a, b) => {
    const da = a.daysSinceLastActivity ?? 9999;
    const db = b.daysSinceLastActivity ?? 9999;
    return db - da;
  });

  return dormant;
}
