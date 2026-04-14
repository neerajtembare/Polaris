/**
 * @file ai/providers/openai.ts
 * @description OpenAI provider for activity parsing.
 *   Opt-in via AI_PROVIDER=openai + OPENAI_API_KEY.
 * @module @polaris/backend/ai
 */

import type { AIActivityParse } from '@polaris/shared';
import type { AIProvider, GoalContext } from '../types.js';
import { buildActivityParseUserPrompt, ACTIVITY_PARSE_SYSTEM_PROMPT } from '../prompts/activity-parse.prompt.js';
import { parseAndValidateActivityResponse } from '../utils/validate-response.js';
import { logAiExchange } from '../utils/ai-logger.js';
import { getMockProvider } from './index.js';

/**
 * Calls GPT-4o-mini to parse the raw input.
 * Falls back to MockProvider when JSON is malformed.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';

  async parse(rawInput: string, goals: GoalContext[]): Promise<AIActivityParse> {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) throw new Error('OPENAI_API_KEY not set');

    const userPrompt = buildActivityParseUserPrompt(rawInput, goals);
    const startMs = Date.now();
    console.error(`[OpenAI] → Request | model=gpt-4o-mini | input="${rawInput.slice(0, 60)}${rawInput.length > 60 ? '…' : ''}"`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       'gpt-4o-mini',
        temperature: 0.2,
        max_tokens:  300,
        messages: [
          { role: 'system', content: ACTIVITY_PARSE_SYSTEM_PROMPT },
          { role: 'user',   content: userPrompt },
        ],
      }),
      // No timeout — allow OpenAI to respond at its own pace
    });

    if (!response.ok) {
      console.error(`[OpenAI] ✗ HTTP ${response.status} ${response.statusText}`);
      logAiExchange({
        ts: new Date().toISOString(), provider: 'openai', operation: 'parse-activity',
        input: rawInput, systemPrompt: ACTIVITY_PARSE_SYSTEM_PROMPT.slice(0, 2000), userPrompt,
        rawResponse: '', parsed: null, elapsedMs: Date.now() - startMs,
        error: `HTTP ${response.status} ${response.statusText}`,
      });
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    type OpenAIResponse = { choices: Array<{ message: { content: string } }> };
    const json = (await response.json()) as OpenAIResponse;
    const content = json.choices[0]?.message?.content ?? '';
    const elapsed = Date.now() - startMs;
    console.error(`[OpenAI] ← Response | elapsed=${elapsed}ms | chars=${content.length}`);

    const parsed = parseAndValidateActivityResponse(content, goals, rawInput);
    if (parsed) {
      console.error(`[OpenAI] ✓ Parsed | type=${parsed.activityType} | value=${parsed.value} | unit=${parsed.unit} | confidence=${parsed.confidence}`);
      logAiExchange({
        ts: new Date().toISOString(), provider: 'openai', operation: 'parse-activity',
        input: rawInput, systemPrompt: ACTIVITY_PARSE_SYSTEM_PROMPT.slice(0, 2000), userPrompt,
        rawResponse: content, parsed: { ...parsed }, elapsedMs: elapsed,
      });
      return { ...parsed, provider: this.name };
    }

    console.error(`[OpenAI] ✗ JSON validation failed — raw: "${content.slice(0, 200)}"`);
    console.error('[OpenAI] ↩ Falling back to MockProvider');
    logAiExchange({
      ts: new Date().toISOString(), provider: 'openai', operation: 'parse-activity',
      input: rawInput, systemPrompt: ACTIVITY_PARSE_SYSTEM_PROMPT.slice(0, 2000), userPrompt,
      rawResponse: content, parsed: null, elapsedMs: elapsed,
      error: 'JSON validation failed — fell back to mock',
    });
    return await getMockProvider().parse(rawInput, goals);
  }
}
