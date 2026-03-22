/**
 * @file ai/providers/index.ts
 * @description Provider factory and exports.
 * @module @polaris/backend/ai
 */

import type { AIProvider, GoalContext } from '../types.js';
import { MockProvider } from './mock.js';
import { OpenAIProvider } from './openai.js';
import { OllamaProvider } from './ollama.js';

export type { AIProvider, GoalContext };

const mock = new MockProvider();

/**
 * Return the active AI provider.
 * Defaults to MockProvider. Set AI_PROVIDER=openai + OPENAI_API_KEY for real AI.
 */
export function getProvider(): AIProvider {
  const providerName = process.env['AI_PROVIDER'] ?? 'mock';
  if (providerName === 'openai') return new OpenAIProvider();
  if (providerName === 'ollama') return new OllamaProvider();
  return mock;
}

/** Singleton mock instance for fallback */
export function getMockProvider(): MockProvider {
  return mock;
}
