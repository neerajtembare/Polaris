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
 * Falls back to a single non-streamed event if Ollama streaming is unavailable.
 */
export async function analyzeWeekStreamHandler(
  _request: FastifyRequest,
  reply:   FastifyReply
): Promise<void> {
  const ollamaUrl = process.env['OLLAMA_URL']   ?? 'http://localhost:11434';
  const model     = process.env['OLLAMA_MODEL'] ?? 'gemma4:e4b';
  const provider  = process.env['AI_PROVIDER']  ?? 'mock';

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

  try {
    if (provider !== 'ollama') {
      // Non-streaming providers: generate all at once then emit as one event
      const result = await aiService.analyzeWeek(metrics);
      sendEvent(JSON.stringify({ type: 'result', data: result }));
      sendEvent('[DONE]');
      reply.raw.end();
      return;
    }

    // Build prompt (mirrors analyze-week.ts logic)
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

    const res = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        stream: true,
        format: 'json',
        options: { temperature: 0.4, num_predict: 700 },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok || !res.body) {
      // Fallback to non-streamed
      const result = await aiService.analyzeWeek(metrics);
      sendEvent(JSON.stringify({ type: 'result', data: result }));
      sendEvent('[DONE]');
      reply.raw.end();
      return;
    }

    // Stream token chunks
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      // Each line from Ollama is a JSON object: { response: "token", done: bool }
      for (const line of chunk.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const obj = JSON.parse(trimmed) as { response?: string; done?: boolean };
          if (obj.response) {
            buffer += obj.response;
            sendEvent(JSON.stringify({ type: 'token', token: obj.response }));
          }
          if (obj.done) {
            // Attempt to parse completed buffer and send as structured result
            try {
              const parsed = JSON.parse(buffer) as {
                summary?: string;
                insights?: string[];
                suggestions?: string[];
              };
              sendEvent(JSON.stringify({
                type: 'result',
                data: {
                  summary:     parsed.summary     ?? '',
                  insights:    parsed.insights    ?? [],
                  suggestions: parsed.suggestions ?? [],
                  provider:    'ollama',
                },
              }));
            } catch {
              // Buffer wasn't valid JSON (partial) — send raw
              sendEvent(JSON.stringify({ type: 'result', data: { summary: buffer, insights: [], suggestions: [], provider: 'ollama' } }));
            }
          }
        } catch {
          // Non-JSON line — skip
        }
      }
    }

    sendEvent('[DONE]');
    reply.raw.end();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    sendEvent(JSON.stringify({ type: 'error', message: msg }));
    sendEvent('[DONE]');
    reply.raw.end();
  }
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
 */
export async function getAiConfigHandler(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const provider   = process.env['AI_PROVIDER']  ?? 'mock';
  const ollamaModel = process.env['OLLAMA_MODEL'] ?? 'gemma4:e4b';
  const ollamaUrl   = process.env['OLLAMA_URL']   ?? 'http://localhost:11434';

  return reply.send({
    success: true,
    data: {
      provider,
      ollamaModel: provider === 'ollama' ? ollamaModel : null,
      ollamaUrl:   provider === 'ollama' ? ollamaUrl   : null,
    },
  });
}

/**
 * POST /api/ai/config
 * Update the active Ollama model at runtime.
 * Takes effect immediately on the next inference call — no restart required.
 * Body: { model: string }
 */
export async function setAiConfigHandler(
  request: FastifyRequest<{ Body: SetAiConfigBody }>,
  reply:   FastifyReply
): Promise<void> {
  const { model } = request.body;
  // OllamaProvider reads process.env['OLLAMA_MODEL'] per-request, so this
  // takes effect immediately without restarting the server.
  process.env['OLLAMA_MODEL'] = model;
  return reply.send({ success: true, data: { model } });
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
