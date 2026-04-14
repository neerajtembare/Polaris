/**
 * @file ai/utils/callProviderText.ts
 * @description Generic LLM text-completion helper (system + user prompt → string).
 *   Routes through AI_PROVIDER env var: openai → OpenAI API, ollama → Ollama API.
 *   Returns null when provider is 'mock' or unconfigured, or on network error.
 *   Used by breakdown.ts and analyze-week.ts which need a chat-style interface.
 *   All requests and responses are logged to JSONL via logAiExchange().
 * @module @polaris/backend/ai
 */

import { logAiExchange } from './aiLogger.js';

interface CallProviderTextOptions {
  systemPrompt: string;
  userPrompt:   string;
  maxTokens:    number;
  temperature:  number;
  logPrefix:    string;
}

/**
 * Call the configured LLM provider with system + user prompts.
 * Returns the raw text content of the response, or null on failure/mock mode.
 */
export async function callProviderText(opts: CallProviderTextOptions): Promise<string | null> {
  const { systemPrompt, userPrompt, maxTokens, temperature, logPrefix } = opts;
  const provider = process.env['AI_PROVIDER'] ?? 'mock';

  if (provider === 'mock') return null;

  const startMs = Date.now();

  if (provider === 'openai') {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      console.error(`[${logPrefix}] ✗ OPENAI_API_KEY not set`);
      return null;
    }

    console.error(`[${logPrefix}][OpenAI] → Request | maxTokens=${maxTokens}`);
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model:       'gpt-4o-mini',
          temperature,
          max_tokens:  maxTokens,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userPrompt },
          ],
        }),
        // No timeout — allow provider to respond at its own pace
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.error(`[${logPrefix}][OpenAI] ✗ HTTP ${response.status}`);
        logAiExchange({
          ts: new Date().toISOString(), provider: 'openai', operation: logPrefix,
          input: userPrompt, systemPrompt: systemPrompt.slice(0, 2000), userPrompt,
          rawResponse: body, parsed: null, elapsedMs: Date.now() - startMs,
          error: `HTTP ${response.status}`,
        });
        return null;
      }

      type OAIResp = { choices: Array<{ message: { content: string } }> };
      const json = (await response.json()) as OAIResp;
      const raw = json.choices[0]?.message?.content ?? '';
      // Strip markdown fences — GPT sometimes wraps despite system prompt instructions
      const content = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      const elapsed = Date.now() - startMs;
      console.error(`[${logPrefix}][OpenAI] ← elapsed=${elapsed}ms | chars=${content.length}`);
      logAiExchange({
        ts: new Date().toISOString(), provider: 'openai', operation: logPrefix,
        input: userPrompt, systemPrompt: systemPrompt.slice(0, 2000), userPrompt,
        rawResponse: raw, parsed: content || null, elapsedMs: elapsed,
      });
      return content || null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${logPrefix}][OpenAI] ✗ Error:`, err);
      logAiExchange({
        ts: new Date().toISOString(), provider: 'openai', operation: logPrefix,
        input: userPrompt, systemPrompt: systemPrompt.slice(0, 2000), userPrompt,
        rawResponse: '', parsed: null, elapsedMs: Date.now() - startMs,
        error: msg,
      });
      return null;
    }
  }

  if (provider === 'ollama') {
    const ollamaUrl = process.env['OLLAMA_URL'] ?? 'http://localhost:11434';
    const model     = process.env['OLLAMA_MODEL'] ?? 'gemma4:e4b';

    console.error(`[${logPrefix}][Ollama] → Request | model=${model} | maxTokens=${maxTokens}`);
    try {
      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          system:  systemPrompt,
          prompt:  userPrompt,
          stream:  false,
          format:  'json',
          options: { temperature, num_predict: maxTokens, top_p: 0.9, repeat_penalty: 1.1 },
        }),
        // No timeout — allow Ollama to finish even on slow hardware
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.error(`[${logPrefix}][Ollama] ✗ HTTP ${response.status}`);
        logAiExchange({
          ts: new Date().toISOString(), provider: 'ollama', operation: logPrefix,
          input: userPrompt, systemPrompt: systemPrompt.slice(0, 2000), userPrompt,
          rawResponse: body, parsed: null, elapsedMs: Date.now() - startMs,
          error: `HTTP ${response.status}`,
        });
        return null;
      }

      type OllamaResp = { response: string; done: boolean };
      const json = (await response.json()) as OllamaResp;
      // format:'json' should prevent fences, but strip defensively
      const raw = json.response ?? '';
      const content = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      const elapsed = Date.now() - startMs;
      console.error(`[${logPrefix}][Ollama] ← elapsed=${elapsed}ms | done=${json.done} | chars=${content.length}`);
      logAiExchange({
        ts: new Date().toISOString(), provider: 'ollama', operation: logPrefix,
        input: userPrompt, systemPrompt: systemPrompt.slice(0, 2000), userPrompt,
        rawResponse: raw, parsed: content || null, elapsedMs: elapsed,
      });
      return content || null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${logPrefix}][Ollama] ✗ Error:`, err);
      logAiExchange({
        ts: new Date().toISOString(), provider: 'ollama', operation: logPrefix,
        input: userPrompt, systemPrompt: systemPrompt.slice(0, 2000), userPrompt,
        rawResponse: '', parsed: null, elapsedMs: Date.now() - startMs,
        error: msg,
      });
      return null;
    }
  }

  console.error(`[${logPrefix}] ✗ Unknown AI_PROVIDER="${provider}" — no request made`);
  return null;
}
