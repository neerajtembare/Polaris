/**
 * @file controllers/metrics.controller.ts
 * @description HTTP handler(s) for the Metrics API.
 *   Thin layer: validates query params, delegates to metrics service.
 * @module @polaris/backend/controllers
 *
 * @dependencies
 * - fastify (FastifyRequest, FastifyReply)
 * - services/metrics.service
 *
 * @relatedFiles
 * - src/routes/metrics.ts
 * - src/services/metrics.service.ts
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { getDashboardMetrics, type MetricsPeriod } from '../services/metrics.service.js';
import { badRequest } from '../lib/errors.js';

const VALID_PERIODS: MetricsPeriod[] = ['week', 'month', 'year'];

/**
 * GET /api/metrics/dashboard
 * Returns aggregated dashboard metrics for the requested period.
 */
export async function getDashboard(
  request: FastifyRequest<{ Querystring: { period?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const rawPeriod = request.query.period ?? 'week';

  if (!VALID_PERIODS.includes(rawPeriod as MetricsPeriod)) {
    throw badRequest(`Invalid period "${rawPeriod}". Must be one of: ${VALID_PERIODS.join(', ')}.`);
  }

  const metrics = await getDashboardMetrics(rawPeriod as MetricsPeriod);
  await reply.send({ success: true, data: metrics });
}
