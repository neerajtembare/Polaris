/**
 * @file ai/providers/ollama.ts
 * @description Ollama provider for activity parsing.
 *   Opt-in via AI_PROVIDER=ollama. Model is configurable via OLLAMA_MODEL
 *   (default: gemma4:e4b). OLLAMA_URL defaults to http://localhost:11434.
 *   Includes structured observability logging for debugging.
 * @module @polaris/backend/ai
 */

import type { AIActivityParse } from '@polaris/shared';
import type { AIProvider, GoalContext, ChatMessage, ChatOptions, ChatResult } from '../types.js';
import { buildActivityParseUserPrompt, ACTIVITY_PARSE_SYSTEM_PROMPT, buildFewShotActivityParseUserPrompt } from '../prompts/activity-parse.prompt.js';
import { parseAndValidateActivityResponse } from '../utils/validate-response.js';
import { logAiExchange } from '../utils/ai-logger.js';
import { getMockProvider } from './index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if the model name suggests it is a small (≤8B) model that needs few-shot prompting.
 * Excludes gemma4 series — despite "4b" in the alias name (active params),
 * gemma4 is a MoE model that performs like a much larger model and handles
 * structured JSON output reliably without few-shot examples. */
function isSmallModel(model: string): boolean {
  if (/^gemma4/i.test(model)) return false;
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
    const model = process.env['OLLAMA_MODEL'] ?? 'gemma4:e4b';
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
      logAiExchange({
        ts: new Date().toISOString(), provider: 'ollama', operation: 'parse-activity',
        input: rawInput,
        systemPrompt: ACTIVITY_PARSE_SYSTEM_PROMPT.slice(0, 2000),
        userPrompt,
        rawResponse: '',
        parsed: null,
        elapsedMs: Date.now() - startMs,
        error: msg,
      });
      throw err;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`[Ollama] ✗ HTTP ${response.status} ${response.statusText} | body="${body.slice(0, 200)}"`);
      logAiExchange({
        ts: new Date().toISOString(), provider: 'ollama', operation: 'parse-activity',
        input: rawInput,
        systemPrompt: ACTIVITY_PARSE_SYSTEM_PROMPT.slice(0, 2000),
        userPrompt,
        rawResponse: body,
        parsed: null,
        elapsedMs: Date.now() - startMs,
        error: `HTTP ${response.status} ${response.statusText}`,
      });
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const json = (await response.json()) as OllamaResponse;
    const elapsed = Date.now() - startMs;
    const content = json.response ?? '';

    console.error(`[Ollama] ← Response | elapsed=${elapsed}ms | done=${json.done} | chars=${content.length} | preview="${content.slice(0, 120).replace(/\n/g, '\\n')}"`);

    if (!content.trim()) {
      console.error('[Ollama] ✗ Empty response — model may have timed out or hit token limit');
      console.error('[Ollama] ↩ Falling back to MockProvider');
      logAiExchange({
        ts: new Date().toISOString(), provider: 'ollama', operation: 'parse-activity',
        input: rawInput,
        systemPrompt: ACTIVITY_PARSE_SYSTEM_PROMPT.slice(0, 2000),
        userPrompt,
        rawResponse: '',
        parsed: null,
        elapsedMs: elapsed,
        error: 'Empty response from model',
      });
      return await getMockProvider().parse(rawInput, goals);
    }

    const parsed = parseAndValidateActivityResponse(content, goals, rawInput);
    if (parsed) {
      console.error(`[Ollama] ✓ Parsed | type=${parsed.activityType} | value=${parsed.value} | unit=${parsed.unit} | confidence=${parsed.confidence} | goal="${parsed.suggestedGoalTitle ?? 'none'}"`);
      logAiExchange({
        ts: new Date().toISOString(), provider: 'ollama', operation: 'parse-activity',
        input: rawInput,
        systemPrompt: ACTIVITY_PARSE_SYSTEM_PROMPT.slice(0, 2000),
        userPrompt,
        rawResponse: content,
        parsed: { ...parsed },
        elapsedMs: elapsed,
      });
      return { ...parsed, provider: this.name };
    }

    console.error(`[Ollama] ✗ JSON validation failed — raw: "${content.slice(0, 200)}"`);
    console.error('[Ollama] ↩ Falling back to MockProvider');
    logAiExchange({
      ts: new Date().toISOString(), provider: 'ollama', operation: 'parse-activity',
      input: rawInput,
      systemPrompt: ACTIVITY_PARSE_SYSTEM_PROMPT.slice(0, 2000),
      userPrompt,
      rawResponse: content,
      parsed: null,
      elapsedMs: elapsed,
      error: 'JSON validation failed — fell back to mock',
    });
    return await getMockProvider().parse(rawInput, goals);
  }

  // ---------------------------------------------------------------------------
  // chat() — multi-turn via /api/chat endpoint
  // ---------------------------------------------------------------------------

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    const ollamaUrl = process.env['OLLAMA_URL']   ?? 'http://localhost:11434';
    const model     = process.env['OLLAMA_MODEL'] ?? 'gemma4:e4b';
    const startMs   = Date.now();

    type OllamaChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
    const ollamaMessages: OllamaChatMessage[] = messages.map((m) => ({
      role:    m.role,
      content: m.content,
    }));

    const body: Record<string, unknown> = {
      model,
      messages: ollamaMessages,
      stream:   false,
      options: {
        temperature:  options.temperature ?? 0.7,
        num_predict:  options.maxTokens   ?? 1024,
      },
    };

    if (options.responseFormat === 'json') body['format'] = 'json';

    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Ollama chat error: ${response.status} ${response.statusText} — ${errBody.slice(0, 200)}`);
    }

    type OllamaChatResponse = { message?: { content?: string } };
    const json    = (await response.json()) as OllamaChatResponse;
    const text    = json.message?.content ?? null;
    return { text, toolCall: null, provider: this.name, latencyMs: Date.now() - startMs };
  }

  // ---------------------------------------------------------------------------
  // chatStream() — streaming via /api/chat with stream: true (NDJSON)
  // ---------------------------------------------------------------------------

  async *chatStream(
    messages: ChatMessage[],
    options:  Omit<ChatOptions, 'tools' | 'responseFormat'> = {}
  ): AsyncIterable<string> {
    const ollamaUrl = process.env['OLLAMA_URL']   ?? 'http://localhost:11434';
    const model     = process.env['OLLAMA_MODEL'] ?? 'gemma4:e4b';

    type OllamaChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
    const ollamaMessages: OllamaChatMessage[] = messages.map((m) => ({
      role:    m.role,
      content: m.content,
    }));

    const body = {
      model,
      messages: ollamaMessages,
      stream:   true,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens   ?? 1024,
      },
    };

    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(300_000),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Ollama stream error: ${response.status} ${response.statusText}`);
    }

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Ollama streaming returns NDJSON: one JSON object per line
        for (const line of chunk.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const obj = JSON.parse(trimmed) as { message?: { content?: string }; done?: boolean };
            if (obj.message?.content) yield obj.message.content;
            if (obj.done) return;
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

