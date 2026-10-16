/**
 * @file services/polaris-context.service.ts
 * @description Assembles the PolarisContext object used by all AI prompts.
 *   Queries active goals (capped at 10), recent activities (capped at 20),
 *   and current streak from the metrics service.
 * @module @polaris/backend/services
 *
 * @dependencies
 * - @prisma/client (via lib/prisma)
 * - @polaris/shared (PolarisContext, TimeOfDay)
 *
 * @relatedFiles
 * - apps/backend/src/services/metrics.service.ts
 * - apps/backend/src/controllers/ai.controller.ts
 * - packages/ai/src/PolarisAI.ts
 */

import type { PolarisContext, TimeOfDay } from '@polaris/shared';
import prisma from '../lib/prisma.js';

// ---------------------------------------------------------------------------
// Time-of-day helper
// ---------------------------------------------------------------------------

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5  && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function dayOfWeekStr(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

// ---------------------------------------------------------------------------
// Streak helper (mirrors metrics.service streak logic, but lightweight)
// ---------------------------------------------------------------------------

async function getCurrentStreak(): Promise<{ current: number; longest: number }> {
  // Pull all distinct activity dates (completed, not deleted), most-recent first
  const rows = await prisma.activity.findMany({
    where: { isDeleted: false, status: 'completed' },
    select: { activityDate: true },
    orderBy: { activityDate: 'desc' },
  });

  // Convert DateTime → YYYY-MM-DD strings and deduplicate
  const distinctDates = [
    ...new Set(rows.map((r) => r.activityDate.toISOString().split('T')[0] as string)),
  ];
  if (distinctDates.length === 0) return { current: 0, longest: 0 };

  const todayStr = new Date().toISOString().split('T')[0] as string;

  let current = 0;
  let longest = 0;
  let run = 0;
  let prevDate: string | null = null;

  for (const dateStr of distinctDates) {
    if (prevDate === null) {
      // Start counting only if most-recent date is today or yesterday
      const diff = daysBetween(dateStr, todayStr);
      if (diff <= 1) {
        run = 1;
      } else {
        run = 0;
      }
    } else {
      const diff = daysBetween(dateStr, prevDate);
      if (diff === 1) {
        run += 1;
      } else {
        if (run > longest) longest = run;
        run = 1;
      }
    }
    prevDate = dateStr;
  }
  if (run > longest) longest = run;
  current = run;

  return { current, longest };
}

function daysBetween(earlier: string, later: string): number {
  const a = new Date(`${earlier}T12:00:00Z`);
  const b = new Date(`${later}T12:00:00Z`);
  return Math.round(Math.abs(b.getTime() - a.getTime()) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Assembles a PolarisContext for injection into AI prompts.
 * Safe to call on every AI request — all queries are fast and capped.
 */
export async function assemblePolarisContext(): Promise<PolarisContext> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);
  const todayStr = todayStart.toISOString().split('T')[0] as string;

  // Active goals (max 10) — include latest completed activity date for dormancy
  const goals = await prisma.goal.findMany({
    where: { isDeleted: false, status: 'active' },
    select: {
      id: true,
      title: true,
      timeframe: true,
      targetValue: true,
      activities: {
        where: { isDeleted: false, status: 'completed' },
        select: { value: true, activityDate: true },
        orderBy: { activityDate: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const activeGoals = goals.map((g) => {
    const total = g.activities.reduce((sum, a) => sum + (a.value ?? 0), 0);
    const progress =
      g.targetValue && g.targetValue > 0
        ? Math.min(100, Math.round((total / g.targetValue) * 100))
        : 0;
    const latestActivity = g.activities[0];
    const lastActivityDaysAgo = latestActivity
      ? daysBetween(latestActivity.activityDate.toISOString().split('T')[0] as string, todayStr)
      : -1;
    return {
      id: g.id,
      title: g.title,
      progress,
      timeframe: g.timeframe,
      lastActivityDaysAgo,
    };
  });

  // Recent activities — last 7 days, max 20
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const recentRows = await prisma.activity.findMany({
    where: {
      isDeleted: false,
      status: 'completed',
      activityDate: { gte: sevenDaysAgo },
    },
    select: { title: true, activityDate: true, activityType: true },
    orderBy: { activityDate: 'desc' },
    take: 20,
  });

  const recentActivities = recentRows.map((a) => ({
    title: a.title,
    date:  a.activityDate.toISOString().split('T')[0] as string,
    type:  a.activityType,
  }));

  // Today's planned activities (status = 'planned', date = today)
  const plannedRows = await prisma.activity.findMany({
    where: {
      isDeleted: false,
      status: 'planned',
      activityDate: { gte: todayStart, lte: todayEnd },
    },
    select: { title: true, goal: { select: { title: true } } },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  const todayPlanned = plannedRows.map((a) => ({
    title: a.title,
    goalTitle: a.goal?.title ?? null,
  }));

  // Today's completed activities
  const completedTodayRows = await prisma.activity.findMany({
    where: {
      isDeleted: false,
      status: 'completed',
      activityDate: { gte: todayStart, lte: todayEnd },
    },
    select: { title: true, value: true, unit: true },
    orderBy: { activityDate: 'asc' },
    take: 20,
  });

  const todayCompleted = completedTodayRows.map((a) => ({
    title: a.title,
    value: a.value,
    unit:  a.unit,
  }));

  const { current, longest } = await getCurrentStreak();

  return {
    activeGoals,
    recentActivities,
    todayPlanned,
    todayCompleted,
    currentStreak: current,
    longestStreak: longest,
    timeOfDay: getTimeOfDay(),
    dayOfWeek: dayOfWeekStr(),
    currentDate: todayStr,
  };
}
