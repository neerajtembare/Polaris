/**
 * @file ai/analyze-week.ts
 * @description Weekly analysis — behavioral insights from dashboard metrics.
 *   Uses OpenAI when available, else returns mock template.
 * @module @polaris/backend/ai
 */

import type { AIWeeklyAnalysis, DashboardMetrics } from '@polaris/shared';
import { buildWeeklyAnalysisUserPrompt, WEEKLY_ANALYSIS_SYSTEM_PROMPT } from './prompts/weekly-analysis.js';

export type { AIWeeklyAnalysis };

/** Mock response when OpenAI is not configured */
function mockAnalysis(metrics: DashboardMetrics): AIWeeklyAnalysis {
  const completionRate =
    metrics.totalActivities > 0
      ? Math.round((metrics.completedActivities / metrics.totalActivities) * 100)
      : 0;

  return {
    summary: `This week you completed ${metrics.completedActivities} of ${metrics.totalActivities} activities (${completionRate}% completion rate). ${metrics.currentStreak > 0 ? `You're on a ${metrics.currentStreak}-day streak.` : ''}`,
    insights: [
      metrics.completedActivities > 0 ? 'You had productive days this week.' : 'Consider logging more activities to get insights.',
      metrics.goalsTouched > 0 ? `You worked toward ${metrics.goalsTouched} goal(s).` : 'No goals were touched — create or link activities to goals.',
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
 * Uses OpenAI when AI_PROVIDER=openai, else returns mock.
 */
export async function analyzeWeek(metrics: DashboardMetrics): Promise<AIWeeklyAnalysis> {
  const providerName = process.env['AI_PROVIDER'] ?? 'mock';
  const apiKey = process.env['OPENAI_API_KEY'];

  if (providerName !== 'openai' || !apiKey) {
    return mockAnalysis(metrics);
  }

  try {
    const userPrompt = buildWeeklyAnalysisUserPrompt(metrics);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       'gpt-4o-mini',
        temperature: 0.4,
        max_tokens:  600,
        messages: [
          { role: 'system', content: WEEKLY_ANALYSIS_SYSTEM_PROMPT },
          { role: 'user',   content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    type OpenAIResponse = { choices: Array<{ message: { content: string } }> };
    const json = (await response.json()) as OpenAIResponse;
    const content = json.choices[0]?.message?.content ?? '';

    let parsed: { summary?: string; insights?: unknown[]; suggestions?: unknown[] };
    try {
      parsed = JSON.parse(content) as { summary?: string; insights?: unknown[]; suggestions?: unknown[] };
    } catch {
      console.warn('[AIService] Weekly analysis malformed JSON, falling back to mock');
      return mockAnalysis(metrics);
    }

    return {
      summary:    typeof parsed.summary === 'string' ? parsed.summary : mockAnalysis(metrics).summary,
      insights:   Array.isArray(parsed.insights) ? parsed.insights.map(String).slice(0, 6) : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String).slice(0, 6) : [],
      provider:   'openai',
    };
  } catch (err) {
    console.error('[AIService] Weekly analysis failed, falling back to mock:', err);
    return mockAnalysis(metrics);
  }
}
