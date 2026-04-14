/**
 * @file PolarisAI.ts
 * @description Main AI facade for the Polaris app.
 *   Single entry point for all AI operations.
 *   Reads provider configuration from environment variables.
 *   All methods are safe to call — they always return a result (falling back to mock).
 *
 * @module @polaris/ai
 *
 * @dependencies
 * - @polaris/shared (types)
 * - providers/ (ollama, openai, mock)
 * - breakdown.ts, analyze-week.ts
 *
 * Environment variables:
 *   AI_PROVIDER  = 'mock' | 'openai' | 'ollama'  (default: 'mock')
 *   OPENAI_API_KEY                                (required for openai)
 *   OLLAMA_URL   = 'http://localhost:11434'       (default)
 *   OLLAMA_MODEL = 'llama3.2:3b'                 (default)
 */

import type { AIActivityParse, DashboardMetrics, PolarisContext, DailyCoachResponse } from '@polaris/shared';
import type { GoalContext } from './types.js';
import { getProvider, getMockProvider } from './providers/index.js';
import { breakdownGoal, type GoalInput, type AIGoalBreakdown } from './breakdown.js';
import { analyzeWeek, type AIWeeklyAnalysis } from './analyze-week.js';
import { dailyCoach } from './daily-coach.js';

export type { DailyCoachResponse };

export type { GoalContext, GoalInput, AIGoalBreakdown, AIWeeklyAnalysis };

/**
 * Polaris AI — central facade for all AI-powered features.
 *
 * Usage:
 *   import { PolarisAI } from '@polaris/ai';
 *   const ai = new PolarisAI();
 *   const result = await ai.parseActivity('read 30 pages', goals);
 */
export class PolarisAI {
  private readonly provider = getProvider();
  private readonly mock = getMockProvider();

  /**
   * Parse a natural-language activity description into structured fields.
   * Falls back to MockProvider if the configured provider fails.
   */
  async parseActivity(rawInput: string, goals: GoalContext[]): Promise<AIActivityParse> {
    try {
      return await this.provider.parse(rawInput, goals);
    } catch (err) {
      if (this.provider.name !== 'mock') {
        console.error(`[PolarisAI] ${this.provider.name} failed, falling back to mock:`, err);
        return await this.mock.parse(rawInput, goals);
      }
      throw err;
    }
  }

  /**
   * Decompose a goal into sub-goals and suggested activities.
   * Returns mock template if no provider is configured.
   */
  async breakdownGoal(input: GoalInput): Promise<AIGoalBreakdown> {
    return breakdownGoal(input);
  }

  /**
   * Generate behavioral insights from a week of dashboard metrics.
   * Returns mock insights if no provider is configured.
   */
  async analyzeWeek(metrics: DashboardMetrics): Promise<AIWeeklyAnalysis> {
    return analyzeWeek(metrics);
  }

  /**
   * Generate a personalised daily coaching message with a suggested activity.
   * Falls back to a quote-based response if the AI provider fails.
   */
  async dailyCoach(ctx: PolarisContext): Promise<DailyCoachResponse> {
    return dailyCoach(ctx, this.provider);
  }

  /** The name of the currently active provider */
  get providerName(): string {
    return this.provider.name;
  }
}

/** Singleton instance — use this in the backend rather than constructing per-request */
export const polarisAI = new PolarisAI();
