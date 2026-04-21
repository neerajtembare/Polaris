/**
 * @file ai/providers/openai.ts
 * @description OpenAI provider for activity parsing.
 *   Opt-in via AI_PROVIDER=openai + OPENAI_API_KEY.
 * @module @polaris/backend/ai
 */

import type { AIActivityParse } from '@polaris/shared';
import type { AIProvider, GoalContext, ChatMessage, ChatOptions, ChatResult } from '../types.js';
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
      signal: AbortSignal.timeout(30_000),
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

  // ---------------------------------------------------------------------------
  // chat() — multi-turn via chat completions
  // ---------------------------------------------------------------------------

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) throw new Error('OPENAI_API_KEY not set');

    const startMs = Date.now();
    const model   = process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini';

    type OAIMessage = { role: string; content: string };
    const oaiMessages: OAIMessage[] = messages.map((m) => ({
      role:    m.role,
      content: m.content,
    }));

    const body: Record<string, unknown> = {
      model,
      temperature: options.temperature ?? 0.7,
      max_tokens:  options.maxTokens   ?? 1024,
      messages:    oaiMessages,
    };

    if (options.responseFormat === 'json') {
      body['response_format'] = { type: 'json_object' };
    }

    if (options.tools && options.tools.length > 0) {
      body['tools'] = options.tools.map((t) => ({
        type:     'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`OpenAI chat error: ${response.status} ${response.statusText} — ${errBody.slice(0, 200)}`);
    }

    type OAIResponse = {
      choices: Array<{
        message: {
          content:    string | null;
          tool_calls?: Array<{ function: { name: string; arguments: string } }>;
        };
      }>;
    };
    const json      = (await response.json()) as OAIResponse;
    const latencyMs = Date.now() - startMs;
    const choice    = json.choices[0];

    if (!choice) return { text: null, toolCall: null, provider: this.name, latencyMs };

    // Function/tool call takes priority
    const toolCall = choice.message.tool_calls?.[0];
    if (toolCall) {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>; } catch { /* noop */ }
      return { text: null, toolCall: { name: toolCall.function.name, args }, provider: this.name, latencyMs };
    }

    return { text: choice.message.content, toolCall: null, provider: this.name, latencyMs };
  }

  // ---------------------------------------------------------------------------
  // chatStream() — streaming via stream: true
  // ---------------------------------------------------------------------------

  async *chatStream(
    messages: ChatMessage[],
    options:  Omit<ChatOptions, 'tools' | 'responseFormat'> = {}
  ): AsyncIterable<string> {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) throw new Error('OPENAI_API_KEY not set');

    const model = process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini';

    type OAIMessage = { role: string; content: string };
    const oaiMessages: OAIMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: options.temperature ?? 0.7,
        max_tokens:  options.maxTokens   ?? 1024,
        messages:    oaiMessages,
        stream:      true,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`OpenAI stream error: ${response.status} ${response.statusText}`);
    }

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // OpenAI streaming returns SSE: "data: {...}\n\n" lines
        for (const line of chunk.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (jsonStr === '[DONE]') return;
          try {
            const parsed = JSON.parse(jsonStr) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // skip malformed lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
