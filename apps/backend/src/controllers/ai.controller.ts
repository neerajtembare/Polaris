/**
 * @file controllers/ai.controller.ts
 * @description HTTP handlers for AI endpoints.
 *   All AI calls route through aiService (PolarisAI singleton from @polaris/ai).
 *   Controllers never mutate the database — suggestions only.
 *
 * @module @polaris/backend/controllers
 *
 * @relatedFiles
 *   - src/routes/ai.ts
 *   - src/services/ai.service.ts
 *   - packages/ai/src/PolarisAI.ts
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { aiService }           from '../services/ai.service.js';
import { listGoals }           from '../services/goal.service.js';
import { getGoalById }         from '../services/goal.service.js';
import { getDashboardMetrics } from '../services/metrics.service.js';
import { assemblePolarisContext } from '../services/polaris-context.service.js';
import { handleError }         from '../lib/handleError.js';
import { getProvider }         from '@polaris/ai';

// ---------------------------------------------------------------------------
// Request body shapes
// ---------------------------------------------------------------------------

interface ParseActivityBody {
  rawInput: string;
}

interface BreakdownBody {
  goalId: string;
}

interface SetAiConfigBody {
  model: string;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/**
 * POST /api/ai/parse-activity
 */
export async function parseActivityHandler(
  request: FastifyRequest<{ Body: ParseActivityBody }>,
  reply:   FastifyReply
): Promise<void> {
  try {
    const { rawInput } = request.body;

    const goals = await listGoals({ status: 'active' });
    type GoalRow = { id: string; title: string; targetUnit: string | null };
    const goalContext = (goals as GoalRow[]).slice(0, 10).map((g: GoalRow) => ({
      id:         g.id,
      title:      g.title,
      targetUnit: g.targetUnit,
    }));

    const result = await aiService.parseActivity(rawInput.trim(), goalContext);
    return reply.send({ success: true, data: result });
  } catch (err) {
    return handleError('AIController', err, reply);
  }
}

/**
 * POST /api/ai/breakdown
 */
export async function breakdownHandler(
  request: FastifyRequest<{ Body: BreakdownBody }>,
  reply:   FastifyReply
): Promise<void> {
  try {
    const { goalId } = request.body;

    const goal = await getGoalById(goalId, { includeProgress: false, includeChildren: false });
    if (!goal) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Goal not found' },
      });
    }

    const targetDate: string | null =
      goal.targetDate != null
        ? ((goal.targetDate as Date).toISOString().split('T')[0] ?? null)
        : null;

    const result = await aiService.breakdownGoal({
      title:       goal.title,
      description: goal.description ?? null,
      timeframe:   goal.timeframe,
      targetValue: goal.targetValue ?? null,
      targetUnit:  goal.targetUnit ?? null,
      targetDate:  targetDate ?? null,
    });

    return reply.send({ success: true, data: result });
  } catch (err) {
    return handleError('AIController', err, reply);
  }
}

/**
 * POST /api/ai/analyze-week
 */
export async function analyzeWeekHandler(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const metrics = await getDashboardMetrics('week');
    const result = await aiService.analyzeWeek(metrics);
    return reply.send({ success: true, data: result });
  } catch (err) {
    return handleError('AIController', err, reply);
  }
}

/**
 * GET /api/ai/analyze-week/stream
 * Streams the weekly analysis as Server-Sent Events.
 * Each event is `data: <chunk>\n\n`. A final `data: [DONE]\n\n` marks completion.
 * Uses the active provider's chatStream() — works for Gemini, Ollama, OpenAI, and mock.
 */
export async function analyzeWeekStreamHandler(
  _request: FastifyRequest,
  reply:   FastifyReply
): Promise<void> {
  // Fetch data BEFORE committing headers so errors can still be returned as HTTP errors
  let metrics: Awaited<ReturnType<typeof getDashboardMetrics>>;
  try {
    metrics = await getDashboardMetrics('week');
  } catch (err) {
    return handleError('AIController', err, reply);
  }

  // Headers committed — from this point on we must stream, not throw HTTP errors
  void reply.raw.writeHead(200, {
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection':    'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const sendEvent = (data: string) => {
    reply.raw.write(`data: ${data}\n\n`);
  };

  const completionRate =
    metrics.totalActivities > 0
      ? Math.round((metrics.completedActivities / metrics.totalActivities) * 100)
      : 0;

  const userPrompt = `Weekly metrics:
- Activities completed: ${metrics.completedActivities} / ${metrics.totalActivities} (${completionRate}%)
- Goals touched: ${metrics.goalsTouched}
- Current streak: ${metrics.currentStreak} days
- Period: last 7 days

Return JSON with: { "summary": "string", "insights": ["string"], "suggestions": ["string"] }`;

  const systemPrompt = `You are a productivity coach analyzing a week of user data.
Return only valid JSON. Be specific, actionable, and encouraging.`;

  try {
    const provider = getProvider();

    // Mock provider: send a single non-streamed result
    if (provider.name === 'mock') {
      const result = await aiService.analyzeWeek(metrics);
      sendEvent(JSON.stringify({ type: 'result', data: result }));
      sendEvent('[DONE]');
      reply.raw.end();
      return;
    }

    let buffer = '';
    for await (const chunk of provider.chatStream(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      { temperature: 0.4, maxTokens: 700 }
    )) {
      buffer += chunk;
      sendEvent(JSON.stringify({ type: 'token', token: chunk }));
    }

    // Parse accumulated buffer into structured result
    try {
      const parsed = JSON.parse(buffer) as {
        summary?:     string;
        insights?:    string[];
        suggestions?: string[];
      };
      sendEvent(JSON.stringify({
        type: 'result',
        data: {
          summary:     parsed.summary     ?? '',
          insights:    parsed.insights    ?? [],
          suggestions: parsed.suggestions ?? [],
          provider:    provider.name,
        },
      }));
    } catch {
      // Buffer wasn't valid JSON — send raw as summary
      sendEvent(JSON.stringify({
        type: 'result',
        data: { summary: buffer, insights: [], suggestions: [], provider: provider.name },
      }));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    sendEvent(JSON.stringify({ type: 'error', message: msg }));
  }

  sendEvent('[DONE]');
  reply.raw.end();
}

/**
 * GET /api/ai/daily-coach
 * Returns a personalised daily coaching message + suggested activity.
 * Safe to call repeatedly — the frontend caches the result for the day.
 */
export async function dailyCoachHandler(
  _request: FastifyRequest,
  reply:   FastifyReply
): Promise<void> {
  try {
    const ctx    = await assemblePolarisContext();
    const result = await aiService.dailyCoach(ctx);
    return reply.send({ success: true, data: result });
  } catch (err) {
    return handleError('AIController.dailyCoach', err, reply);
  }
}

/**
 * GET /api/ai/config
 * Returns the active provider, model, and live connection status.
 * Status is checked via a lightweight health ping (cached 30s on the client via staleTime).
 */
export async function getAiConfigHandler(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const providerName = process.env['AI_PROVIDER'] ?? 'mock';

  const model =
    providerName === 'gemini' ? (process.env['GEMINI_MODEL'] ?? 'gemma-4-26b-a4b-it') :
    providerName === 'ollama' ? (process.env['OLLAMA_MODEL'] ?? 'gemma4:e4b') :
    providerName === 'openai' ? (process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini') :
    'mock';

  let status: 'connected' | 'error' | 'unknown' | 'slow' = 'unknown';
  let statusMessage: string | undefined;
  let latencyMs: number | undefined;

  try {
    if (providerName === 'gemini') {
      const apiKey = process.env['GEMINI_API_KEY'];
      if (!apiKey) {
        status = 'error';
        statusMessage = 'GEMINI_API_KEY is not set';
      } else {
        const startMs = Date.now();
        const pingRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }] }),
            signal:  AbortSignal.timeout(8_000),
          }
        );
        latencyMs = Date.now() - startMs;
        if (pingRes.ok) {
          status = latencyMs > 10_000 ? 'slow' : 'connected';
          statusMessage = `Gemini API responding (${latencyMs}ms)`;
        } else {
          const body = await pingRes.text().catch(() => '');
          status = 'error';
          statusMessage = `HTTP ${pingRes.status}: ${body.slice(0, 120)}`;
        }
      }
    } else if (providerName === 'ollama') {
      const ollamaUrl = process.env['OLLAMA_URL'] ?? 'http://localhost:11434';
      const startMs   = Date.now();
      const pingRes   = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(5_000) });
      latencyMs = Date.now() - startMs;
      if (pingRes.ok) {
        status = latencyMs > 10_000 ? 'slow' : 'connected';
        statusMessage = `Ollama responding (${latencyMs}ms)`;
      } else {
        status = 'error';
        statusMessage = `Ollama unreachable: HTTP ${pingRes.status}`;
      }
    } else if (providerName === 'openai') {
      // Don't ping OpenAI — wastes quota. Return unknown.
      status = 'unknown';
      statusMessage = 'OpenAI status not checked (API credits)';
    } else {
      // mock
      status = 'connected';
      statusMessage = 'Mock provider always available';
    }
  } catch (err) {
    status = 'error';
    statusMessage = err instanceof Error ? err.message : 'Health check failed';
  }

  return reply.send({
    success: true,
    data: { provider: providerName, model, status, statusMessage, latencyMs },
  });
}

/**
 * POST /api/ai/config
 * Switch the active model at runtime. Takes effect on the next inference call.
 * Body: { model: string }
 */
export async function setAiConfigHandler(
  request: FastifyRequest<{ Body: SetAiConfigBody }>,
  reply:   FastifyReply
): Promise<void> {
  const { model }    = request.body;
  const providerName = process.env['AI_PROVIDER'] ?? 'mock';

  // Set the correct env var based on active provider
  if (providerName === 'gemini') {
    process.env['GEMINI_MODEL'] = model;
  } else if (providerName === 'ollama') {
    process.env['OLLAMA_MODEL'] = model;
  } else if (providerName === 'openai') {
    process.env['OPENAI_MODEL'] = model;
  }
  // mock: no-op

  return reply.send({ success: true, data: { provider: providerName, model } });
}

/**
 * GET /api/ai/ollama-models
 */
export async function getOllamaModelsHandler(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const ollamaUrl = process.env['OLLAMA_URL'] ?? 'http://localhost:11434';

  try {
    const res = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) {
      return reply.send({ success: true, data: { models: [] } });
    }

    type OllamaTagsResponse = { models: Array<{ name: string; modified_at: string; size: number }> };
    const json = (await res.json()) as OllamaTagsResponse;
    const models = (json.models ?? []).map((m) => m.name);

    return reply.send({ success: true, data: { models } });
  } catch {
    return reply.send({ success: true, data: { models: [] } });
  }
}
