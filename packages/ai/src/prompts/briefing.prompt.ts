/**
 * @file prompts/briefing.prompt.ts
 * @description Startup briefing prompt — the first thing TARS says when you open the app.
 *   Generates a personalized, data-driven morning briefing from PolarisContext.
 *   Streamed via SSE — the user sees it typing in as the app loads.
 * @module @polaris/ai/prompts
 *
 * @relatedFiles
 * - packages/ai/src/tars/briefing.ts
 * - packages/shared/src/types/ai.ts (PolarisContext)
 */

import type { PolarisContext } from '@polaris/shared';

export const BRIEFING_SYSTEM_PROMPT = `You are TARS, a productivity assistant in the Polaris app.
Generate a startup briefing for the user based on their data.

Rules:
- 3-5 sentences maximum.
- Lead with the most important signal (streak, dormant goal, big win this week).
- Be specific — cite actual numbers and goal names.
- Plain text. No markdown, no bullet points, no greetings like "Good morning".
- End with one actionable suggestion for today.
- If there's nothing notable, say something honest and motivating. Don't pad.`;

/**
 * Build the user-turn briefing prompt from PolarisContext.
 * Includes today's planned/completed activities if available.
 */
export function buildBriefingPrompt(ctx: PolarisContext): string {
  const timeGreeting = ctx.timeOfDay === 'morning' ? 'Morning briefing' :
                        ctx.timeOfDay === 'afternoon' ? 'Afternoon check-in' :
                        ctx.timeOfDay === 'evening'   ? 'Evening wrap-up' :
                                                         'Night check-in';

  const streakLine =
    ctx.currentStreak > 1
      ? `Active streak: ${ctx.currentStreak} days (longest: ${ctx.longestStreak}).`
      : ctx.currentStreak === 1
      ? `Streak: 1 day. Don't break it.`
      : `No active streak. Longest ever: ${ctx.longestStreak} days.`;

  const goalsSummary =
    ctx.activeGoals.length === 0
      ? 'No active goals.'
      : ctx.activeGoals
          .map((g) => {
            const dormantNote = g.lastActivityDaysAgo >= 7 ? ` [DORMANT ${g.lastActivityDaysAgo}d]` : '';
            return `"${g.title}" (${g.timeframe}) ${g.progress}%${dormantNote}`;
          })
          .join(', ');

  const recentLine =
    ctx.recentActivities.length === 0
      ? 'No activity this week.'
      : `Last logged: "${ctx.recentActivities[0]?.title ?? 'unknown'}" on ${ctx.recentActivities[0]?.date ?? 'unknown'}.`;

  const planned   = ctx.todayPlanned;
  const completed = ctx.todayCompleted;

  const todayLine =
    completed.length > 0
      ? `Today: ${completed.length} done${planned.length > 0 ? `, ${planned.length} planned` : ''}.`
      : planned.length > 0
      ? `Today: ${planned.length} planned, none done yet.`
      : 'Nothing logged today.';

  return `${timeGreeting} — ${ctx.dayOfWeek}, ${ctx.currentDate}.

${streakLine}
Goals: ${goalsSummary}
Recent: ${recentLine}
${todayLine}

Generate a concise startup briefing (3-5 sentences). Be specific. End with one clear suggestion for today.`;
}


