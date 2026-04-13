/**
 * @file ai/providers/ollama.ts
 * @description Ollama provider for activity parsing.
 *   Opt-in via AI_PROVIDER=ollama. Model is configurable via OLLAMA_MODEL
 *   (default: llama3.2:3b). OLLAMA_URL defaults to http://localhost:11434.
 *   Includes structured observability logging for debugging.
 * @module @polaris/backend/ai
 */

import type { AIActivityParse } from '@polaris/shared';
import type { AIProvider, GoalContext } from '../types.js';
import { buildActivityParseUserPrompt, ACTIVITY_PARSE_SYSTEM_PROMPT, buildFewShotActivityParseUserPrompt } from '../prompts/activity-parse.js';
import { parseAndValidateActivityResponse } from '../utils/validateResponse.js';
import { getMockProvider } from './index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if the model name suggests it is a small (≤8B) model */
function isSmallModel(model: string): boolean {
  return /[1-8]b/i.test(model);
}

type OllamaResponse = { response: string; done: boolean; total_duration?: number };

/**
 * Calls Ollama to parse the raw input.
 * Model is read from OLLAMA_MODEL env var (default: llama3.2:3b).
 * Small models (≤8B) get few-shot examples in the user prompt.
 * Falls back to MockProvider when JSON is malformed.
 */
export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';

  async parse(rawInput: string, goals: GoalContext[]): Promise<AIActivityParse> {
    const ollamaUrl = process.env['OLLAMA_URL'] ?? 'http://localhost:11434';
    const model = process.env['OLLAMA_MODEL'] ?? 'llama3.2:3b';
    const small = isSmallModel(model);

    // Model-aware prompt strategy: small models need few-shot examples
    const userPrompt = small
      ? buildFewShotActivityParseUserPrompt(rawInput, goals)
      : buildActivityParseUserPrompt(rawInput, goals);

    const requestBody = {
      model,
      system: ACTIVITY_PARSE_SYSTEM_PROMPT,
      prompt: userPrompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.05,   // Near-deterministic for structured output
        num_predict: 600,    // Enough for full JSON + confidence field
        top_p: 0.9,
        repeat_penalty: 1.1,
      },
    };

    const startMs = Date.now();
    console.error(`[Ollama] → Request | model=${model} | input="${rawInput.slice(0, 60)}${rawInput.length > 60 ? '…' : ''}" | small=${small}`);

    let response: Response;
    try {
      response = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        // No timeout — Ollama can be slow on first inference; let it finish
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Ollama] ✗ Network error after ${Date.now() - startMs}ms | ${msg}`);
      throw err;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`[Ollama] ✗ HTTP ${response.status} ${response.statusText} | body="${body.slice(0, 200)}"`);
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const json = (await response.json()) as OllamaResponse;
    const elapsed = Date.now() - startMs;
    const content = json.response ?? '';

    console.error(`[Ollama] ← Response | elapsed=${elapsed}ms | done=${json.done} | chars=${content.length} | preview="${content.slice(0, 120).replace(/\n/g, '\\n')}"`);

    if (!content.trim()) {
      console.error('[Ollama] ✗ Empty response — model may have timed out or hit token limit');
      console.error('[Ollama] ↩ Falling back to MockProvider');
      return await getMockProvider().parse(rawInput, goals);
    }

    const parsed = parseAndValidateActivityResponse(content, goals, rawInput);
    if (parsed) {
      console.error(`[Ollama] ✓ Parsed | type=${parsed.activityType} | value=${parsed.value} | unit=${parsed.unit} | confidence=${parsed.confidence} | goal="${parsed.suggestedGoalTitle ?? 'none'}"`);
      return { ...parsed, provider: this.name };
    }

    console.error(`[Ollama] ✗ JSON validation failed — raw: "${content.slice(0, 200)}"`);
    console.error('[Ollama] ↩ Falling back to MockProvider');
    return await getMockProvider().parse(rawInput, goals);
  }
}

