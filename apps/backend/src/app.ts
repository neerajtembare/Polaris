/**
 * @file app.ts
 * @description Fastify application factory — registers plugins and routes
 * @module @polaris/backend
 *
 * @dependencies
 * - fastify
 * - @fastify/cors
 * - @fastify/helmet
 *
 * @relatedFiles
 * - src/index.ts
 * - src/routes/index.ts
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { registerRoutes } from './routes/index.js';
import { config } from './config/index.js';

/**
 * Build and configure the Fastify application instance
 */
export async function buildApp() {
  const loggerOptions = config.isDev
    ? ({ level: 'info', transport: { target: 'pino-pretty', options: { colorize: true } } } as const)
    : ({ level: 'warn' } as const);

  const app = Fastify({ logger: loggerOptions });

  // Security headers
  await app.register(helmet, { contentSecurityPolicy: false });

  // CORS — allow frontend dev server
  await app.register(cors, {
    origin: config.isDev ? ['http://localhost:5173'] : false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  // Routes (registered as a Fastify plugin)
  await app.register(registerRoutes);

  return app;
}
