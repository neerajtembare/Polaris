/**
 * @file ai/providers/mock.ts
 * @description Keyword-based mock AI provider. No API key, no network.
 *   Simulates activity parsing for development and zero-config usage.
 * @module @polaris/backend/ai
 */

import type { ActivityType, AIActivityParse } from '@polaris/shared';
import type { AIProvider, GoalContext } from '../types.js';

/**
 * Simulates AI parsing by matching common keywords.
 * Confidence is set to 0.7 for partial matches and 0.9 for strong matches.
 * This is the default provider and always available.
 */
export class MockProvider implements AIProvider {
  readonly name = 'mock';

  async parse(rawInput: string, goals: GoalContext[]): Promise<AIActivityParse> {
    const lower = rawInput.toLowerCase();

    type ParsedFields = { activityType: ActivityType; value: number | null; unit: string | null };
    const fields = this.extractFields(lower);

    const { goalId, goalTitle, confidence } = this.matchGoal(lower, goals, fields.unit);

    const title = this.buildTitle(rawInput);

    return {
      title,
      activityType:       fields.activityType,
      value:              fields.value,
      unit:               fields.unit,
      suggestedGoalId:    goalId,
      suggestedGoalTitle: goalTitle,
      confidence,
      provider:           this.name,
    };
  }

  private extractFields(lower: string): { activityType: ActivityType; value: number | null; unit: string | null } {
    const patterns: Array<{ regex: RegExp; unit: string; activityType: ActivityType; multiplier?: number }> = [
      { regex: /(\d+(?:\.\d+)?)\s*(?:pages?|pg)/,              unit: 'pages',   activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:books?)/,                unit: 'books',   activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:chapters?)/,             unit: 'chapters', activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*km/,                        unit: 'km',      activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*miles?/,                    unit: 'miles',   activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:steps?)/,                unit: 'steps',   activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/,           unit: 'hours',   activityType: 'duration' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:minutes?|mins?)/,        unit: 'min',     activityType: 'duration', multiplier: 1 / 60 },
      { regex: /[₹$](\d+(?:,\d+)*(?:\.\d+)?)/,                unit: '₹',       activityType: 'quantity' },
      { regex: /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:rupees?|inr)/,  unit: '₹',       activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:reps?)/,                 unit: 'reps',    activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:sets?)/,                 unit: 'sets',    activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:sessions?)/,              unit: 'sessions', activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:lessons?)/,              unit: 'lessons', activityType: 'quantity' },
    ];

    for (const { regex, unit, activityType, multiplier } of patterns) {
      const m = lower.match(regex);
      if (m) {
        const raw = parseFloat((m[1] as string).replace(/,/g, ''));
        const value = multiplier ? parseFloat((raw * multiplier).toFixed(2)) : raw;
        return { activityType, value, unit };
      }
    }

    const completionWords = ['meditat', 'yoga', 'did', 'completed', 'finished', 'done', 'journal'];
    if (completionWords.some((w) => lower.includes(w))) {
      return { activityType: 'completion', value: null, unit: null };
    }

    return { activityType: 'quantity', value: null, unit: null };
  }

  private matchGoal(
    lower: string,
    goals: GoalContext[],
    detectedUnit: string | null
  ): { goalId: string | null; goalTitle: string | null; confidence: number } {
    if (goals.length === 0) return { goalId: null, goalTitle: null, confidence: 0.6 };

    type ScoredGoal = { goal: GoalContext; score: number };
    const scored: ScoredGoal[] = goals.map((goal) => {
      let score = 0;
      const titleWords = goal.title.toLowerCase().split(/\W+/);

      if (detectedUnit && goal.targetUnit) {
        if (goal.targetUnit.toLowerCase() === detectedUnit.toLowerCase()) score += 40;
      }

      for (const word of titleWords) {
        if (word.length >= 4 && lower.includes(word)) score += 15;
      }

      const domainMap: Array<{ keywords: string[]; goalKeywords: string[] }> = [
        { keywords: ['read', 'book', 'page', 'chapter'],           goalKeywords: ['read', 'book'] },
        { keywords: ['run', 'jog', 'walk', 'km', 'mile', 'step'],  goalKeywords: ['run', 'km', 'walk'] },
        { keywords: ['save', 'rupee', '₹', '$', 'money', 'invest'], goalKeywords: ['save', 'money', '₹'] },
        { keywords: ['study', 'python', 'code', 'learn', 'lesson'], goalKeywords: ['study', 'python', 'learn', 'code'] },
        { keywords: ['gym', 'workout', 'train', 'lift', 'exercise'], goalKeywords: ['gym', 'workout', 'fit'] },
      ];
      const goalLower = goal.title.toLowerCase();
      for (const { keywords, goalKeywords } of domainMap) {
        const inputMatch = keywords.some((k) => lower.includes(k));
        const goalMatch  = goalKeywords.some((k) => goalLower.includes(k));
        if (inputMatch && goalMatch) score += 25;
      }

      return { goal, score };
    });

    const best = scored.reduce((a, b) => (a.score > b.score ? a : b));

    if (best.score === 0) return { goalId: null, goalTitle: null, confidence: 0.55 };

    const confidence = best.score >= 40 ? 0.9 : best.score >= 20 ? 0.75 : 0.6;
    return { goalId: best.goal.id, goalTitle: best.goal.title, confidence };
  }

  private buildTitle(rawInput: string): string {
    const trimmed = rawInput.trim();
    if (!trimmed) return 'Activity';
    return (trimmed.charAt(0).toUpperCase() + trimmed.slice(1)).slice(0, 200);
  }
}
