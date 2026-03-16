/**
 * @file ai/prompts/weekly-analysis.ts
 * @description Prompt templates for weekly analysis (OpenAI).
 * @module @polaris/backend/ai
 */

import type { DashboardMetrics } from '@polaris/shared';

export const WEEKLY_ANALYSIS_SYSTEM_PROMPT = `You are a behavioral insights assistant for a goal-tracking app.
Given dashboard metrics for a week (activity counts, completion rate, streaks, goal progress), generate:
1. A brief 1–2 sentence summary of the week.
2. 2–4 concrete insights (patterns, wins, areas to improve).
3. 2–4 actionable suggestions for the coming week.
Be encouraging but honest. Respond ONLY with valid JSON — no prose, no markdown.`;

export function buildWeeklyAnalysisUserPrompt(metrics: DashboardMetrics): string {
  const { period, startDate, endDate, totalActivities, completedActivities, plannedActivities, goalsTouched, currentStreak, longestStreak, activityByDay, goalProgress } = metrics;

  const completionRate = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;

  const activitySummary = Object.entries(activityByDay)
    .filter(([, count]) => count > 0)
    .map(([date, count]) => `${date}: ${count}`)
    .join(', ') || 'none';

  const goalSummary = goalProgress
    .map((g) => `${g.goalTitle}: ${g.currentValue}${g.targetValue != null ? `/${g.targetValue}` : ''}${g.unit ? ` ${g.unit}` : ''} (${g.percentage ?? 0}%)`)
    .join('; ') || 'none';

  return `Period: ${period} (${startDate} to ${endDate})

Metrics:
- Total activities: ${totalActivities}
- Completed: ${completedActivities}
- Planned: ${plannedActivities}
- Completion rate: ${completionRate}%
- Goals touched: ${goalsTouched}
- Current streak: ${currentStreak} days
- Longest streak: ${longestStreak} days

Activity by day: ${activitySummary}

Goal progress: ${goalSummary}

Return JSON:
{
  "summary": "1-2 sentence overview of the week",
  "insights": ["insight 1", "insight 2", ...],
  "suggestions": ["suggestion 1", "suggestion 2", ...]
}`;
}
