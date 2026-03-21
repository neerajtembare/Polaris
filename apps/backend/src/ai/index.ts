/**
 * @file ai/index.ts
 * @description AI module — activity parsing, providers, prompts.
 *   Re-exports for backward compatibility with ai.service.ts facade.
 * @module @polaris/backend/ai
 */

import type { AIActivityParse } from '@polaris/shared';
import type { GoalContext } from './types.js';
import { getProvider, getMockProvider } from './providers/index.js';

export type { AIActivityParse, GoalContext };

/**
 * Parse natural-language activity description into structured fields.
 * Falls back to MockProvider if the configured provider throws.
 */
export async function parseActivity(
  rawInput: string,
  goals:    GoalContext[]
): Promise<AIActivityParse> {
  const provider = getProvider();
  const mock = getMockProvider();

  try {
    return await provider.parse(rawInput, goals);
  } catch (err) {
    if (provider.name !== 'mock') {
      console.error(`[AIService] ${provider.name} failed, falling back to mock:`, err);
      return await mock.parse(rawInput, goals);
    }
    throw err;
  }
}

export { getProvider };
