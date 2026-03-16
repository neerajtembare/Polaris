/**
 * @file ai/types.ts
 * @description Shared types for the AI module.
 * @module @polaris/backend/ai
 */

import type { AIActivityParse } from '@polaris/shared';

/** A single active goal sent as context to the AI */
export interface GoalContext {
  id:         string;
  title:     string;
  targetUnit: string | null;
}

/** Provider interface — all AI providers implement this */
export interface AIProvider {
  readonly name: string;
  parse(rawInput: string, goals: GoalContext[]): Promise<AIActivityParse>;
}
