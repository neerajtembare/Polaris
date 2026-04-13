/**
 * @file ai/providers/openai.ts
 * @description OpenAI provider for activity parsing.
 *   Opt-in via AI_PROVIDER=openai + OPENAI_API_KEY.
 * @module @polaris/backend/ai
 */

import type { AIActivityParse } from '@polaris/shared';
import type { AIProvider, GoalContext } from '../types.js';
import { buildActivityParseUserPrompt, ACTIVITY_PARSE_SYSTEM_PROMPT } from '../prompts/activity-parse.js';
import { parseAndValidateActivityResponse } from '../utils/validateResponse.js';
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
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    type OpenAIResponse = { choices: Array<{ message: { content: string } }> };
    const json = (await response.json()) as OpenAIResponse;
    const content = json.choices[0]?.message?.content ?? '';
    console.error(`[OpenAI] ← Response | elapsed=${Date.now() - startMs}ms | chars=${content.length}`);

    const parsed = parseAndValidateActivityResponse(content, goals, rawInput);
    if (parsed) {
      console.error(`[OpenAI] ✓ Parsed | type=${parsed.activityType} | value=${parsed.value} | unit=${parsed.unit} | confidence=${parsed.confidence}`);
      return { ...parsed, provider: this.name };
    }

    console.error(`[OpenAI] ✗ JSON validation failed — raw: "${content.slice(0, 200)}"`);
    console.error('[OpenAI] ↩ Falling back to MockProvider');
    return await getMockProvider().parse(rawInput, goals);
  }
}
