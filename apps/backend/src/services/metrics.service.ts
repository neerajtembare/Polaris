/**
 * @file services/metrics.service.ts
 * @description Aggregates dashboard metrics from activities and goals.
 *   Computes period totals, daily activity heatmap, and streaks.
 *   Called exclusively by the metrics controller.
 * @module @polaris/backend/services
 *
 * @dependencies
 * - @prisma/client (via lib/prisma)
 *
 * @relatedFiles
 * - src/controllers/metrics.controller.ts
 * - src/lib/prisma.ts
 * - src/services/goal.service.ts (computeProgress reused via getGoalProgress)
 */

import type { DashboardMetrics, GoalProgressEntry, MetricsPeriod } from '@polaris/shared';
import prisma from '../lib/prisma.js';

// Re-export for consumers that import from this module (e.g. controller)
export type { DashboardMetrics, MetricsPeriod };

// ---------------------------------------------------------------------------
// Internal date helpers
// ---------------------------------------------------------------------------

/** Returns today's date as YYYY-MM-DD using local server time */
function todayStr(): string {
  return new Date().toISOString().split('T')[0] as string;
}

/** Returns a Date at the start of a YYYY-MM-DD string (00:00:00 UTC) */
function startOfDay(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** Returns a Date at the end of a YYYY-MM-DD string (23:59:59.999 UTC) */
function endOfDay(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999Z`);
}

/** Subtract `days` from a YYYY-MM-DD string, return new YYYY-MM-DD */
function subtractDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().split('T')[0] as string;
}

/** Add `days` to a YYYY-MM-DD string, return new YYYY-MM-DD */
function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0] as string;
}

/** Number of days in a period type */
const PERIOD_DAYS: Record<MetricsPeriod, number> = {
  week:  7,
  month: 30,
  year:  365,
};

// ---------------------------------------------------------------------------
// Streak calculation helper
// ---------------------------------------------------------------------------

/**
 * Given a set of date strings with activity, compute current and longest streaks.
 * A streak is defined as consecutive calendar days with ≥1 completed activity.
 */
function computeStreaks(activeDates: Set<string>): {
  currentStreak: number;
  longestStreak: number;
} {
  if (activeDates.size === 0) return { currentStreak: 0, longestStreak: 0 };

  const today = todayStr();
  const yesterday = subtractDays(today, 1);

  // Current streak: walk backward from today (include yesterday if today has none yet)
  let streakStart = activeDates.has(today) ? today : yesterday;
  let currentStreak = 0;
  let cursor = streakStart;
  while (activeDates.has(cursor)) {
    currentStreak++;
    cursor = subtractDays(cursor, 1);
  }

  // Longest streak: scan all active dates sorted ascending
  const sorted = Array.from(activeDates).sort();
  let longest = 0;
  let run     = 0;
  let prev: string | null = null;

  for (const date of sorted) {
    if (prev !== null && date === addDays(prev, 1)) {
      run++;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = date;
  }

  return { currentStreak, longestStreak: longest };
}

// ---------------------------------------------------------------------------
// Public service function
// ---------------------------------------------------------------------------

/**
 * Compute aggregated dashboard metrics for the requested period.
 *
 * @param period - 'week' | 'month' | 'year'
 */
export async function getDashboardMetrics(
  period: MetricsPeriod
): Promise<DashboardMetrics> {
  const endDate   = todayStr();
  const startDate = subtractDays(endDate, PERIOD_DAYS[period] - 1);

  const periodStart = startOfDay(startDate);
  const periodEnd   = endOfDay(endDate);

  // ---------------------------------------------------------------------------
  // Fetch all non-deleted activities in the period (single query)
  // ---------------------------------------------------------------------------
  type PeriodActivity = { goalId: string | null; status: string; activityDate: Date };
  type DateActivity   = { activityDate: Date };

  const activities: PeriodActivity[] = await prisma.activity.findMany({
    where: {
      isDeleted:    false,
      activityDate: { gte: periodStart, lte: periodEnd },
    },
    select: {
      goalId:       true,
      status:       true,
      activityDate: true,
    },
  });

  // Period totals
  const totalActivities     = activities.length;
  const completedActivities = activities.filter((a: PeriodActivity) => a.status === 'completed').length;
  const plannedActivities   = activities.filter((a: PeriodActivity) => a.status === 'planned').length;

  // Goals touched (distinct, non-null)
  const touchedGoalIds = new Set<string>(
    activities.map((a: PeriodActivity) => a.goalId).filter((id): id is string => id !== null)
  );
  const goalsTouched = touchedGoalIds.size;

  // Activity-by-day heatmap (completed activities per calendar day)
  // Pre-fill all days in the period with 0
  const activityByDay: Record<string, number> = {};
  let cursor = startDate;
  while (cursor <= endDate) {
    activityByDay[cursor] = 0;
    cursor = addDays(cursor, 1);
  }
  for (const a of activities) {
    if (a.status === 'completed') {
      const dayKey = a.activityDate.toISOString().split('T')[0] as string;
      if (dayKey in activityByDay) {
        (activityByDay[dayKey] as number)++;
      }
    }
  }

  // Streak — needs completed activity dates, capped to the last 2 years to bound the query.
  // The 2-year window is large enough for any realistic streak but prevents a full table scan
  // from growing linearly as the user accumulates years of history.
  const twoYearsAgo = startOfDay(subtractDays(endDate, 365 * 2));
  const allCompletedDates: DateActivity[] = await prisma.activity.findMany({
    where: { isDeleted: false, status: 'completed', activityDate: { gte: twoYearsAgo } },
    select: { activityDate: true },
  });
  const activeDatesSet = new Set<string>(
    allCompletedDates.map((a: DateActivity) => a.activityDate.toISOString().split('T')[0] as string)
  );
  const { currentStreak, longestStreak } = computeStreaks(activeDatesSet);

  // ---------------------------------------------------------------------------
  // Goal progress — active goals with target values
  // Single groupBy replaces the previous N+1 aggregate-per-goal loop.
  // ---------------------------------------------------------------------------
  type ActiveGoal = { id: string; title: string; targetValue: number | null; targetUnit: string | null };

  const activeGoals = await prisma.goal.findMany({
    where: { isDeleted: false, status: 'active' },
    select: { id: true, title: true, targetValue: true, targetUnit: true },
    orderBy: { createdAt: 'desc' },
    take: 10,   // cap at top 10 for the dashboard
  }) as ActiveGoal[];

  const activeGoalIds = activeGoals.map((g: ActiveGoal) => g.id);

  // One query to sum completed activity values grouped by goalId
  const grouped = await prisma.activity.groupBy({
    by: ['goalId'],
    where: { goalId: { in: activeGoalIds }, isDeleted: false, status: 'completed' },
    _sum: { value: true },
  });

  const sumByGoalId = new Map<string, number>(
    grouped.map((row) => [row.goalId as string, row._sum.value ?? 0])
  );

  const goalProgress: GoalProgressEntry[] = activeGoals.map((goal: ActiveGoal) => {
    const currentValue = sumByGoalId.get(goal.id) ?? 0;
    const targetValue  = goal.targetValue;
    const percentage   =
      targetValue && targetValue > 0
        ? Math.min(Math.round((currentValue / targetValue) * 100), 100)
        : null;

    return {
      goalId:    goal.id,
      goalTitle: goal.title,
      currentValue,
      targetValue,
      unit:      goal.targetUnit ?? null,
      percentage,
    };
  });

  return {
    period,
    startDate,
    endDate,
    totalActivities,
    completedActivities,
    plannedActivities,
    goalsTouched,
    currentStreak,
    longestStreak,
    activityByDay,
    goalProgress,
  };
}
