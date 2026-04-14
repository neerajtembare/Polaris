/**
 * @file prompts/daily-coach.ts
 * @description Prompts for the Daily Coach AI feature.
 *   Generates a personalised motivational message, a suggested activity,
 *   and a streak status line based on the user's PolarisContext.
 * @module @polaris/ai/prompts
 *
 * @relatedFiles
 * - packages/ai/src/PolarisAI.ts
 * - packages/shared/src/types/daily-coach.ts
 */

import type { PolarisContext } from '@polaris/shared';

export const DAILY_COACH_SYSTEM_PROMPT = `You are Polaris Coach, a concise and encouraging personal productivity coach.
You help users stay consistent with their goals by offering specific, data-driven motivation.
Always respond in valid JSON only — no markdown, no explanation outside the JSON.
Be warm but brief. Reference the user's actual work when encouraging them.`;

/**
 * Build the user-turn prompt for the daily coach.
 */
export function buildDailyCoachPrompt(ctx: PolarisContext): string {
  const goalsSummary =
    ctx.activeGoals.length === 0
      ? 'No active goals yet.'
      : ctx.activeGoals
          .map((g) => `- "${g.title}" (${g.timeframe}) — ${g.progress}% complete`)
          .join('\n');

  const recentSummary =
    ctx.recentActivities.length === 0
      ? 'No activity logged in the last 7 days.'
      : ctx.recentActivities
          .slice(0, 7)
          .map((a) => `- ${a.date}: ${a.title} (${a.type})`)
          .join('\n');

  const streakLine =
    ctx.currentStreak > 0
      ? `Current streak: ${ctx.currentStreak} day${ctx.currentStreak > 1 ? 's' : ''} (longest: ${ctx.longestStreak}).`
      : `No active streak. Longest ever: ${ctx.longestStreak} day${ctx.longestStreak !== 1 ? 's' : ''}.`;

  return `Time of day: ${ctx.timeOfDay} on ${ctx.dayOfWeek}.

ACTIVE GOALS:
${goalsSummary}

RECENT ACTIVITY (last 7 days):
${recentSummary}

STREAK: ${streakLine}

Generate a daily coaching response as JSON with exactly this structure:
{
  "message": "<1-2 sentences, warm and specific to their actual goals/work>",
  "suggestion": {
    "title": "<concise activity title>",
    "activityType": "<quantity|duration|completion>",
    "value": <number>,
    "unit": "<unit string>",
    "goalId": "<goal id from the list, or null>"
  },
  "streakMessage": "<one short encouraging line about their streak>"
}

Rules:
- message must reference something specific from their goals or recent activity.
- suggestion must be realistic for ${ctx.timeOfDay} on a ${ctx.dayOfWeek}.
- If there are no goals, set suggestion to null.
- streakMessage should be upbeat even if streak is 0.
- Respond ONLY with the JSON object. No backticks, no prose.`;
}
