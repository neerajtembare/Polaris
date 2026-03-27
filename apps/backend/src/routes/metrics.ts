/**
 * @file routes/metrics.ts
 * @description Fastify route definitions for the Metrics API.
 *   Mounts under /api/metrics (set in routes/index.ts).
 * @module @polaris/backend/routes
 *
 * @dependencies
 * - fastify (FastifyPluginAsync)
 * - controllers/metrics.controller
 *
 * @relatedFiles
 * - src/controllers/metrics.controller.ts
 * - src/routes/index.ts
 */

import type { FastifyPluginAsync } from 'fastify';
import { getDashboard } from '../controllers/metrics.controller.js';

// ---------------------------------------------------------------------------
// JSON schema for the dashboard query string
// ---------------------------------------------------------------------------

const getDashboardSchema = {
  querystring: {
    type: 'object',
    properties: {
      period: {
        type:    'string',
        enum:    ['week', 'month', 'year'],
        default: 'week',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data:    { type: 'object', additionalProperties: true },
      },
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

/**
 * Registers all /metrics sub-routes.
 * Mounted at /api/metrics in routes/index.ts.
 */
const metricsRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/metrics/dashboard
  app.get(
    '/dashboard',
    { schema: getDashboardSchema },
    getDashboard
  );
};

export default metricsRoutes;
