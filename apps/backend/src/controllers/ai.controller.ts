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
import { listGoals }        from '../services/goal.service.js';
import { handleError }      from '../lib/handleError.js';

// ---------------------------------------------------------------------------
// Request body shape
// ---------------------------------------------------------------------------

interface ParseActivityBody {
  /** The user's free-text activity description (e.g. "ran 5km in the park") */
  rawInput: string;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * POST /api/ai/parse-activity
 *
 * Accepts a raw natural-language description, fetches the user's active goals
 * for context, runs them through the AI service, and returns structured
 * suggestions. Nothing is saved — the frontend's review panel handles that.
 */
export async function parseActivityHandler(
  request: FastifyRequest<{ Body: ParseActivityBody }>,
  reply:   FastifyReply
): Promise<void> {
  try {
    const { rawInput } = request.body;

    // Fetch up to 10 active goals to provide context to the AI
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
