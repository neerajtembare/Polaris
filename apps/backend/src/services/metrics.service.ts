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

import prisma from '../lib/prisma.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MetricsPeriod = 'week' | 'month' | 'year';

export interface DashboardMetrics {
  period:              MetricsPeriod;
  startDate:           string;     // YYYY-MM-DD
  endDate:             string;     // YYYY-MM-DD
  totalActivities:     number;     // all non-deleted in period
  completedActivities: number;     // status = 'completed'
  plannedActivities:   number;     // status = 'planned'
  goalsTouched:        number;     // distinct goals with ≥1 activity in period
  currentStreak:       number;     // consecutive days (today going back) with ≥1 completed activity
  longestStreak:       number;     // longest ever consecutive run
  activityByDay:       Record<string, number>;  // YYYY-MM-DD → count of completed activities
  goalProgress: Array<{
    goalId:     string;
    title:      string;
    percentage: number | null;
  }>;
}

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
  const activities = await prisma.activity.findMany({
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
  const completedActivities = activities.filter((a) => a.status === 'completed').length;
  const plannedActivities   = activities.filter((a) => a.status === 'planned').length;

  // Goals touched (distinct, non-null)
  const touchedGoalIds = new Set(
    activities.map((a) => a.goalId).filter((id): id is string => id !== null)
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

  // Streak — needs ALL completed activity dates across all time, not just the period
  const allCompletedDates = await prisma.activity.findMany({
    where: { isDeleted: false, status: 'completed' },
    select: { activityDate: true },
  });
  const activeDatesSet = new Set(
    allCompletedDates.map((a) => a.activityDate.toISOString().split('T')[0] as string)
  );
  const { currentStreak, longestStreak } = computeStreaks(activeDatesSet);

  // ---------------------------------------------------------------------------
  // Goal progress — active goals with target values
  // ---------------------------------------------------------------------------
  const activeGoals = await prisma.goal.findMany({
    where: { isDeleted: false, status: 'active', NOT: { targetValue: null } },
    select: { id: true, title: true, targetValue: true },
    orderBy: { createdAt: 'desc' },
    take: 10,   // cap at top 10 for the dashboard
  });

  // For each active goal, aggregate completed activity values
  const goalProgress = await Promise.all(
    activeGoals.map(async (goal) => {
      const result = await prisma.activity.aggregate({
        where: { goalId: goal.id, isDeleted: false, status: 'completed' },
        _sum: { value: true },
        _count: true,
      });
      const currentValue = result._sum.value ?? 0;
      const percentage =
        goal.targetValue && goal.targetValue > 0
          ? Math.min(Math.round((currentValue / goal.targetValue) * 100), 100)
          : null;

      return { goalId: goal.id, title: goal.title, percentage };
    })
  );

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
