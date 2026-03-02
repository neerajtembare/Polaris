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

/**
 * Register all application routes as a Fastify plugin
 */
export const registerRoutes: FastifyPluginAsync = async (app): Promise<void> => {
  // Health check
  app.get('/health', async (_request, reply) => {
    try {
      // Dynamic import to avoid top-level prisma connection at startup
      const { default: prisma } = await import('../lib/prisma.js');
      await prisma.$queryRaw`SELECT 1`;
      return reply.send({ success: true, data: { status: 'healthy', database: 'connected' } });
    } catch {
      return reply
        .status(503)
        .send({ success: false, error: { code: 'DB_UNAVAILABLE', message: 'Database unavailable' } });
    }
  });

  // Future route modules mounted here:
  // app.register(goalsRoutes, { prefix: '/api/goals' });
  // app.register(activitiesRoutes, { prefix: '/api/activities' });
}
