/**
 * @file lib/handleError.ts
 * @description Shared error formatter for Fastify route handlers.
 *   Converts AppError → standardised { success, error } envelope.
 *   Prevents the same try/catch pattern from being copy-pasted in every controller.
 * @module @polaris/backend/lib
 */

import type { FastifyReply } from 'fastify';
import { AppError } from './errors.js';

/**
 * Send an appropriate error response for any thrown value.
 * - AppError  → HTTP status from the error, structured error body
 * - Anything else → 500 INTERNAL_ERROR
 *
 * @param context - Controller name for log messages (e.g. 'GoalController')
 */
export function handleError(
  context: string,
  err: unknown,
  reply: FastifyReply
): ReturnType<FastifyReply['send']> {
  if (err instanceof AppError) {
    return reply.status(err.statusCode).send({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
  }
  console.error(`[${context}] Unexpected error:`, err);
  return reply.status(500).send({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
}
