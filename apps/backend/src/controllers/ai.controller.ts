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
 * GET /api/ai/config
 */
export async function getAiConfigHandler(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const provider = process.env['AI_PROVIDER'] ?? 'mock';
  const ollamaModel = process.env['OLLAMA_MODEL'] ?? 'llama3.2:3b';
  const ollamaUrl = process.env['OLLAMA_URL'] ?? 'http://localhost:11434';

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
