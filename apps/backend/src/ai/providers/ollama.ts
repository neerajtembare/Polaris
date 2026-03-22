/**
 * @file ai/providers/ollama.ts
 * @description Ollama provider for activity parsing.
 *   Opt-in via AI_PROVIDER=ollama. Uses llama3.2:3b locally.
 * @module @polaris/backend/ai
 */

import type { AIActivityParse } from '@polaris/shared';
import type { AIProvider, GoalContext } from '../types.js';
import { buildActivityParseUserPrompt, ACTIVITY_PARSE_SYSTEM_PROMPT } from '../prompts/activity-parse.js';
import { parseAndValidateActivityResponse } from '../utils/validateResponse.js';
import { getMockProvider } from './index.js';

/**
 * Calls Ollama (llama3.2:3b) to parse the raw input.
 * Falls back to MockProvider when JSON is malformed.
 */
export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';

  async parse(rawInput: string, goals: GoalContext[]): Promise<AIActivityParse> {
    const ollamaUrl = process.env['OLLAMA_URL'] || 'http://localhost:11434';
    const userPrompt = buildActivityParseUserPrompt(rawInput, goals);

    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:3b',
        system: ACTIVITY_PARSE_SYSTEM_PROMPT,
        prompt: userPrompt,
        stream: false,
        format: 'json',
        options: { temperature: 0.1, num_predict: 200 }
      }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    type OllamaResponse = { response: string };
    const json = (await response.json()) as OllamaResponse;
    const content = json.response ?? '';

    const parsed = parseAndValidateActivityResponse(content, goals, rawInput);
    if (parsed) {
      return { ...parsed, provider: this.name };
    }

    console.warn('[AIService] Ollama returned malformed JSON, falling back to mock');
    return await getMockProvider().parse(rawInput, goals);
  }
}
