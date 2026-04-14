/**
 * @file ai/providers/gemini.provider.ts
 * @description Google Gemini provider — primary cloud provider for TARS and all AI features.
 *   Implements parse(), chat(), and chatStream() via Gemini REST API.
 *
 * @module @polaris/backend/ai
 *
 * @dependencies
 * - @polaris/shared (types)
 * - prompts/activity-parse.prompt.ts
 * - utils/validate-response.ts
 * - utils/ai-logger.ts
 *
 * @relatedFiles
 * - packages/ai/src/types.ts (AIProvider interface)
 * - packages/ai/src/providers/index.ts (factory)
 *
 * Environment variables:
 *   GEMINI_API_KEY   — Required. API key from Google AI Studio.
 *   GEMINI_MODEL     — Optional. Default: gemma-4-26b-a4b-it (1,500 RPD free tier).
 *                      Use gemini-2.5-flash for quality (20 RPD limit).
 */

import type { AIActivityParse } from '@polaris/shared';
import type { AIProvider, GoalContext, ChatMessage, ChatOptions, ChatResult } from '../types.js';
import { buildActivityParseUserPrompt, ACTIVITY_PARSE_SYSTEM_PROMPT } from '../prompts/activity-parse.prompt.js';
import { parseAndValidateActivityResponse } from '../utils/validate-response.js';
import { logAiExchange } from '../utils/ai-logger.js';
import { getMockProvider } from './index.js';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// ---------------------------------------------------------------------------
// Gemini REST API shapes
// ---------------------------------------------------------------------------

type GeminiRole = 'user' | 'model';

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
}

interface GeminiContent {
  role:  GeminiRole;
  parts: GeminiPart[];
}

interface GeminiFunctionDeclaration {
  name:        string;
  description: string;
  parameters:  Record<string, unknown>;
}

interface GeminiRequest {
  contents:           GeminiContent[];
  systemInstruction?: { parts: Array<{ text: string }> };
  tools?:             Array<{ functionDeclarations: GeminiFunctionDeclaration[] }>;
  generationConfig?:  { temperature?: number; maxOutputTokens?: number };
}

interface GeminiCandidate {
  content: { parts: GeminiPart[] };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapRole(role: 'system' | 'user' | 'assistant'): GeminiRole {
  return role === 'assistant' ? 'model' : 'user';
}

/**
 * Split messages into Gemini-style systemInstruction + contents.
 * System messages are extracted and merged into systemInstruction.
 * All other messages become contents[].
 */
function buildContents(messages: ChatMessage[]): {
  systemInstruction?: { parts: Array<{ text: string }> };
  contents: GeminiContent[];
} {
  const systemMessages = messages.filter((m) => m.role === 'system');
  const chatMessages   = messages.filter((m) => m.role !== 'system');

  const systemInstruction =
    systemMessages.length > 0
      ? { parts: [{ text: systemMessages.map((m) => m.content).join('\n\n') }] }
      : undefined;

  const contents: GeminiContent[] = chatMessages.map((m) => ({
    role:  mapRole(m.role),
    parts: [{ text: m.content }],
  }));

  return {
    ...(systemInstruction ? { systemInstruction } : {}),
    contents,
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Google Gemini provider — primary cloud provider for Polaris.
 * Fast (~2-5s), supports function calling, SSE streaming, multi-turn chat.
 *
 * Just-works setup:
 *   AI_PROVIDER=gemini
 *   GEMINI_API_KEY=<your-key>
 *
 * Optional:
 *   GEMINI_MODEL=gemini-2.5-flash   (default: gemma-4-26b-a4b-it — 1,500 RPD free tier)
 */
export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';

  private get apiKey(): string {
    const key = process.env['GEMINI_API_KEY'];
    if (!key) throw new Error('GEMINI_API_KEY is not set');
    return key;
  }

  private get model(): string {
    return process.env['GEMINI_MODEL'] ?? 'gemma-4-26b-a4b-it';
  }

  // ---------------------------------------------------------------------------
  // parse() — activity parsing via chat() under the hood
  // ---------------------------------------------------------------------------

  async parse(rawInput: string, goals: GoalContext[]): Promise<AIActivityParse> {
    const userPrompt = buildActivityParseUserPrompt(rawInput, goals);
    const startMs    = Date.now();

    console.error(
      `[Gemini] → parse | model=${this.model} | input="${rawInput.slice(0, 60)}${rawInput.length > 60 ? '…' : ''}"`
    );

    try {
      const result = await this.chat(
        [
          { role: 'system', content: ACTIVITY_PARSE_SYSTEM_PROMPT },
          { role: 'user',   content: userPrompt },
        ],
        { temperature: 0.1, maxTokens: 400, responseFormat: 'json' }
      );

      const content = result.text ?? '';
      const elapsed = result.latencyMs;
      console.error(`[Gemini] ← parse | elapsed=${elapsed}ms | chars=${content.length}`);

      const parsed = parseAndValidateActivityResponse(content, goals, rawInput);
      if (parsed) {
        console.error(
          `[Gemini] ✓ Parsed | type=${parsed.activityType} | value=${parsed.value} | confidence=${parsed.confidence}`
        );
        logAiExchange({
          ts: new Date().toISOString(), provider: this.name, operation: 'parse-activity',
          input: rawInput, systemPrompt: ACTIVITY_PARSE_SYSTEM_PROMPT.slice(0, 2000), userPrompt,
          rawResponse: content, parsed: { ...parsed }, elapsedMs: elapsed,
        });
        return { ...parsed, provider: this.name };
      }

      console.error(`[Gemini] ✗ parse validation failed — raw: "${content.slice(0, 200)}"`);
      console.error('[Gemini] ↩ Falling back to MockProvider');
      logAiExchange({
        ts: new Date().toISOString(), provider: this.name, operation: 'parse-activity',
        input: rawInput, systemPrompt: ACTIVITY_PARSE_SYSTEM_PROMPT.slice(0, 2000), userPrompt,
        rawResponse: content, parsed: null, elapsedMs: Date.now() - startMs,
        error: 'parse validation failed — fell back to mock',
      });
      return await getMockProvider().parse(rawInput, goals);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Gemini] ✗ parse failed: ${msg}`);
      logAiExchange({
        ts: new Date().toISOString(), provider: this.name, operation: 'parse-activity',
        input: rawInput, systemPrompt: ACTIVITY_PARSE_SYSTEM_PROMPT.slice(0, 2000), userPrompt,
        rawResponse: '', parsed: null, elapsedMs: Date.now() - startMs, error: msg,
      });
      return await getMockProvider().parse(rawInput, goals);
    }
  }

  // ---------------------------------------------------------------------------
  // chat() — single-turn or multi-turn, with optional function calling
  // ---------------------------------------------------------------------------

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    const startMs = Date.now();
    const { systemInstruction, contents } = buildContents(messages);

    const body: GeminiRequest = {
      contents,
      generationConfig: {
        temperature:      options.temperature ?? 0.7,
        maxOutputTokens:  options.maxTokens   ?? 1024,
      },
    };

    if (systemInstruction) body.systemInstruction = systemInstruction;

    if (options.tools && options.tools.length > 0) {
      body.tools = [
        {
          functionDeclarations: options.tools.map((t) => ({
            name:        t.name,
            description: t.description,
            parameters:  t.parameters,
          })),
        },
      ];
    }

    const url = `${GEMINI_BASE}/models/${this.model}:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(
        `Gemini API error: ${response.status} ${response.statusText} — ${errBody.slice(0, 300)}`
      );
    }

    const json      = (await response.json()) as GeminiResponse;
    const latencyMs = Date.now() - startMs;
    const candidate = json.candidates?.[0];

    if (!candidate) {
      return { text: null, toolCall: null, provider: this.name, latencyMs };
    }

    // Function call takes priority over text
    const funcCallPart = candidate.content.parts.find((p) => p.functionCall);
    if (funcCallPart?.functionCall) {
      const { name, args } = funcCallPart.functionCall;
      return { text: null, toolCall: { name, args }, provider: this.name, latencyMs };
    }

    const text = candidate.content.parts.map((p) => p.text ?? '').join('') || null;
    return { text, toolCall: null, provider: this.name, latencyMs };
  }

  // ---------------------------------------------------------------------------
  // chatStream() — SSE streaming via alt=sse
  // ---------------------------------------------------------------------------

  async *chatStream(
    messages: ChatMessage[],
    options:  Omit<ChatOptions, 'tools' | 'responseFormat'> = {}
  ): AsyncIterable<string> {
    const { systemInstruction, contents } = buildContents(messages);

    const body: GeminiRequest = {
      contents,
      generationConfig: {
        temperature:     options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens   ?? 1024,
      },
    };
    if (systemInstruction) body.systemInstruction = systemInstruction;

    const url = `${GEMINI_BASE}/models/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;
    const response = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      const errBody = await response.text().catch(() => '');
      throw new Error(
        `Gemini stream error: ${response.status} ${response.statusText} — ${errBody.slice(0, 300)}`
      );
    }

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // SSE format: zero or more "data: {...}\n\n" lines per chunk
        for (const line of chunk.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (jsonStr === '[DONE]') return;
          try {
            const parsed    = JSON.parse(jsonStr) as GeminiResponse;
            const candidate = parsed.candidates?.[0];
            if (!candidate) continue;
            for (const part of candidate.content.parts) {
              if (part.text) yield part.text;
            }
          } catch {
            // skip malformed lines — SSE chunks may split across reads
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
