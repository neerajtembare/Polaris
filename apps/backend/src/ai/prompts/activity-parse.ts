/**
 * @file ai/prompts/activity-parse.ts
 * @description Prompt templates for activity parsing (OpenAI).
 *   Extracted from OpenAIProvider for versioning and reuse.
 * @module @polaris/backend/ai
 */

import type { GoalContext } from '../types.js';

export const ACTIVITY_PARSE_SYSTEM_PROMPT = `You are an activity parser for a goal-tracking app.
Parse the user's input into a structured JSON activity. Be concise and accurate.
Respond ONLY with valid JSON matching the schema — no prose, no markdown fences.`;

/**
 * Build the user prompt for activity parsing.
 */
export function buildActivityParseUserPrompt(rawInput: string, goals: GoalContext[]): string {
  const goalsJson = JSON.stringify(
    goals.map((g) => ({ id: g.id, title: g.title, unit: g.targetUnit }))
  );

  return `Parse: "${rawInput}"

Active goals (id, title, unit):
${goalsJson}

Return JSON:
{
  "title": "clean activity title",
  "activityType": "quantity" | "duration" | "completion",
  "value": number or null,
  "unit": "string or null",
  "suggestedGoalId": "goal id or null",
  "suggestedGoalTitle": "goal title or null",
  "confidence": 0.0-1.0
}`;
}
