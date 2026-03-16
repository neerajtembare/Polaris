/**
 * @file controllers/ai.controller.ts
 * @description HTTP handler for the AI parse-activity endpoint.
 *   This controller never mutates the database — it only returns suggestions
 *   for the frontend to display in the review panel.
 *
 *   Architecture: AI suggests → user reviews → user confirms → standard CRUD saves.
 *
 * @module @polaris/backend/controllers
 *
 * @relatedFiles
 *   - src/routes/ai.ts
 *   - src/services/ai.service.ts
 *   - src/services/goal.service.ts  (used to fetch goal context)
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { parseActivity }    from '../services/ai.service.js';
import { breakdownGoal }    from '../ai/breakdown.js';
import { analyzeWeek }      from '../ai/analyze-week.js';
import { listGoals }        from '../services/goal.service.js';
import { getGoalById }      from '../services/goal.service.js';
import { getDashboardMetrics } from '../services/metrics.service.js';
import { handleError }      from '../lib/handleError.js';

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

    const result = await parseActivity(rawInput.trim(), goalContext);

    return reply.send({ success: true, data: result });
  } catch (err) {
    return handleError('AIController', err, reply);
  }
}

/**
 * POST /api/ai/breakdown
 *
 * Decomposes a goal into sub-goals and suggested activities.
 * Nothing is saved — user reviews and creates manually.
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

    const result = await breakdownGoal({
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
 *
 * Generates behavioral insights from the past week's dashboard metrics.
 * Nothing is saved — user reviews the analysis.
 */
export async function analyzeWeekHandler(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const metrics = await getDashboardMetrics('week');
    const result = await analyzeWeek(metrics);
    return reply.send({ success: true, data: result });
  } catch (err) {
    return handleError('AIController', err, reply);
  }
}
