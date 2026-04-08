/**
 * @file ai/analyze-week.ts
 * @description Weekly analysis — behavioral insights from dashboard metrics.
 *   Routes through the configured AI provider (openai or ollama).
 *   Falls back to a mock template when no provider is configured.
 * @module @polaris/backend/ai
 */

import type { AIWeeklyAnalysis, DashboardMetrics } from '@polaris/shared';
import { buildWeeklyAnalysisUserPrompt, WEEKLY_ANALYSIS_SYSTEM_PROMPT } from './prompts/weekly-analysis.js';
import { callProviderText } from './utils/callProviderText.js';

export type { AIWeeklyAnalysis };

/** Mock response when no provider is configured */
function mockAnalysis(metrics: DashboardMetrics): AIWeeklyAnalysis {
  const completionRate =
    metrics.totalActivities > 0
      ? Math.round((metrics.completedActivities / metrics.totalActivities) * 100)
      : 0;

  return {
    summary: `This week you completed ${metrics.completedActivities} of ${metrics.totalActivities} activities (${completionRate}% completion rate).${metrics.currentStreak > 0 ? ` You're on a ${metrics.currentStreak}-day streak.` : ''}`,
    insights: [
      metrics.completedActivities > 0
        ? 'You had productive days this week.'
        : 'Consider logging more activities to get insights.',
      metrics.goalsTouched > 0
        ? `You worked toward ${metrics.goalsTouched} goal(s).`
        : 'No goals were touched — create or link activities to goals.',
    ],
    suggestions: [
      'Set a small daily target to build consistency.',
      'Link activities to goals to track progress.',
    ],
    provider: 'mock',
  };
}

/**
 * Analyze the past week's metrics and return behavioral insights.
 * Uses the configured AI_PROVIDER (openai or ollama), falls back to mock.
 */
export async function analyzeWeek(metrics: DashboardMetrics): Promise<AIWeeklyAnalysis> {
  const userPrompt = buildWeeklyAnalysisUserPrompt(metrics);

  const result = await callProviderText({
    systemPrompt: WEEKLY_ANALYSIS_SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 700,
    temperature: 0.4,
    logPrefix: 'AnalyzeWeek',
  });

  if (!result) return mockAnalysis(metrics);

  let parsed: { summary?: string; insights?: unknown[]; suggestions?: unknown[] };
  try {
    parsed = JSON.parse(result) as { summary?: string; insights?: unknown[]; suggestions?: unknown[] };
  } catch {
    console.error('[AnalyzeWeek] ✗ JSON parse failed — falling back to mock');
    return mockAnalysis(metrics);
  }

  const provider = process.env['AI_PROVIDER'] ?? 'mock';
  return {
    summary:     typeof parsed.summary === 'string' ? parsed.summary : mockAnalysis(metrics).summary,
    insights:    Array.isArray(parsed.insights) ? parsed.insights.map(String).slice(0, 6) : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String).slice(0, 6) : [],
    provider,
  };
}

