/**
 * @file ai/utils/callProviderText.ts
 * @description Generic LLM text-completion helper (system + user prompt → string).
 *   Routes through AI_PROVIDER env var: openai → OpenAI API, ollama → Ollama API.
 *   Returns null when provider is 'mock' or unconfigured, or on network error.
 *   Used by breakdown.ts and analyze-week.ts which need a chat-style interface.
 * @module @polaris/backend/ai
 */

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
        console.error(`[${logPrefix}][OpenAI] ✗ HTTP ${response.status}`);
        return null;
      }

      type OAIResp = { choices: Array<{ message: { content: string } }> };
      const json = (await response.json()) as OAIResp;
      const raw = json.choices[0]?.message?.content ?? '';
      // Strip markdown fences — GPT sometimes wraps despite system prompt instructions
      const content = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      console.error(`[${logPrefix}][OpenAI] ← elapsed=${Date.now() - startMs}ms | chars=${content.length}`);
      return content || null;
    } catch (err) {
      console.error(`[${logPrefix}][OpenAI] ✗ Error:`, err);
      return null;
    }
  }

  if (provider === 'ollama') {
    const ollamaUrl = process.env['OLLAMA_URL'] ?? 'http://localhost:11434';
    const model     = process.env['OLLAMA_MODEL'] ?? 'llama3.2:3b';

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
        console.error(`[${logPrefix}][Ollama] ✗ HTTP ${response.status}`);
        return null;
      }

      type OllamaResp = { response: string; done: boolean };
      const json = (await response.json()) as OllamaResp;
      const raw = json.response ?? '';
      const content = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      console.error(`[${logPrefix}][Ollama] ← elapsed=${Date.now() - startMs}ms | done=${json.done} | chars=${content.length}`);
      return content || null;
    } catch (err) {
      console.error(`[${logPrefix}][Ollama] ✗ Error:`, err);
      return null;
    }
  }

  console.error(`[${logPrefix}] ✗ Unknown AI_PROVIDER="${provider}" — no request made`);
  return null;
}
