/**
 * @file ai/providers/index.ts
 * @description Provider factory and exports.
 * @module @polaris/backend/ai
 */

import type { AIProvider, GoalContext } from '../types.js';
import { MockProvider } from './mock.provider.js';
import { OpenAIProvider } from './openai.provider.js';
import { OllamaProvider } from './ollama.provider.js';
import { GeminiProvider } from './gemini.provider.js';

export type { AIProvider, GoalContext };
export type { ChatMessage, ChatOptions, ChatResult, ToolSchema, ToolCall } from '../types.js';

const mock = new MockProvider();

/**
 * Return the active AI provider based on AI_PROVIDER env var.
 * Defaults to MockProvider.
 *
 * Set AI_PROVIDER=gemini + GEMINI_API_KEY for Gemini (recommended).
 * Set AI_PROVIDER=ollama for local inference.
 * Set AI_PROVIDER=openai + OPENAI_API_KEY for OpenAI.
 */
export function getProvider(): AIProvider {
  const providerName = process.env['AI_PROVIDER'] ?? 'mock';
  if (providerName === 'gemini') return new GeminiProvider();
  if (providerName === 'openai') return new OpenAIProvider();
  if (providerName === 'ollama') return new OllamaProvider();
  return mock;
}

/** Singleton mock instance for fallback */
export function getMockProvider(): MockProvider {
  return mock;
}
