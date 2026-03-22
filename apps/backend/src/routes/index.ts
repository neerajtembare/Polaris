/**
 * @file routes/index.ts
 * @description Root route registration — mounts all sub-routers
 * @module @polaris/backend/routes
 *
 * @dependencies
 * - fastify
 *
 * @relatedFiles
 * - src/app.ts
 */

import type { FastifyPluginAsync } from 'fastify';
import { goalsRoutes }      from './goals.js';
import { activitiesRoutes } from './activities.js';
import metricsRoutes        from './metrics.js';
import aiRoutes             from './ai.js';
import voiceRoutes          from './voice.js';

/**
 * Register all application routes as a Fastify plugin.
 * Add new route modules here as features are built.
 */
export const registerRoutes: FastifyPluginAsync = async (app): Promise<void> => {
  // ------------------------------------------------------------------
  // Health check — used by dev tooling and future monitoring
  // ------------------------------------------------------------------
  app.get('/health', async (_request, reply) => {
    try {
      const { default: prisma } = await import('../lib/prisma.js');
      await prisma.$queryRaw`SELECT 1`;
      return reply.send({ success: true, data: { status: 'healthy', database: 'connected' } });
    } catch {
      return reply
        .status(503)
        .send({ success: false, error: { code: 'DB_UNAVAILABLE', message: 'Database unavailable' } });
    }
  });

  // ------------------------------------------------------------------
  // Feature routes (add new modules below as each milestone is built)
  // ------------------------------------------------------------------
  app.register(goalsRoutes,      { prefix: '/api/goals' });
  app.register(activitiesRoutes, { prefix: '/api/activities' });
  app.register(metricsRoutes,    { prefix: '/api/metrics' });
  app.register(aiRoutes,         { prefix: '/api/ai' });
  app.register(voiceRoutes,      { prefix: '/api/voice' });
};
