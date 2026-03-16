/**
 * @file ai/prompts/goal-breakdown.ts
 * @description Prompt templates for goal decomposition (OpenAI).
 * @module @polaris/backend/ai
 */

export const GOAL_BREAKDOWN_SYSTEM_PROMPT = `You are a goal decomposition assistant for a goal-tracking app.
Given a high-level goal, suggest 2-4 sub-goals and 2-4 suggested activities.
Be practical and actionable. Respond ONLY with valid JSON — no prose, no markdown.`;

export function buildGoalBreakdownUserPrompt(goal: {
  title: string;
  description: string | null;
  timeframe: string;
  targetValue: number | null;
  targetUnit: string | null;
  targetDate: string | null;
}): string {
  const parts = [
    `Goal: "${goal.title}"`,
    goal.description ? `Description: ${goal.description}` : null,
    `Timeframe: ${goal.timeframe}`,
    goal.targetValue != null ? `Target: ${goal.targetValue} ${goal.targetUnit ?? ''}`.trim() : null,
    goal.targetDate ? `Target date: ${goal.targetDate}` : null,
  ].filter(Boolean);

  return `${parts.join('\n')}

Return JSON:
{
  "subGoals": [
    {
      "title": "string",
      "timeframe": "long" | "medium" | "short",
      "targetDate": "YYYY-MM-DD or null",
      "targetValue": number or null,
      "targetUnit": "string or null",
      "rationale": "brief reason"
    }
  ],
  "suggestedActivities": [
    {
      "title": "string",
      "activityType": "quantity" | "duration" | "completion",
      "value": number or null,
      "unit": "string or null",
      "frequency": "daily" | "weekly" etc,
      "suggestedDuration": minutes or null,
      "rationale": "brief reason"
    }
  ]
}`;
}
