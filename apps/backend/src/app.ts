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
import type { FastifyError } from 'fastify';
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

  // ------------------------------------------------------------------
  // Global error handler — normalises ALL errors (including Fastify's
  // own schema validation errors) into the standard API envelope:
  //   { success: false, error: { code, message, details? } }
  // ------------------------------------------------------------------
  app.setErrorHandler((error, _request, reply) => {
    const err = error as FastifyError;
    // Fastify schema validation errors (FST_ERR_VALIDATION)
    if (err.validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: err.validation,
        },
      });
    }
    // Any other error
    const statusCode = err.statusCode ?? 500;
    app.log.error(err);
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: err.code ?? 'INTERNAL_ERROR',
        message: statusCode >= 500 ? 'An unexpected error occurred' : err.message,
      },
    });
  });

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
