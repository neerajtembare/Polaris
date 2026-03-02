/**
 * @file lib/errors.ts
 * @description Application error classes and HTTP error helpers
 * @module @polaris/backend/lib
 *
 * @dependencies
 * - none (pure TypeScript)
 *
 * @relatedFiles
 * - src/controllers/goal.controller.ts
 * - src/controllers/activity.controller.ts
 */

// ---------------------------------------------------------------------------
// Base application error
// ---------------------------------------------------------------------------

/**
 * Structured application error with an HTTP status code and a stable
 * machine-readable error `code` that is returned in API responses.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// ---------------------------------------------------------------------------
// Convenience factories (keep controllers readable)
// ---------------------------------------------------------------------------

/** 404 — record does not exist or is soft-deleted */
export function notFound(resource: string, id: string): AppError {
  return new AppError(404, 'NOT_FOUND', `${resource} with id "${id}" not found`);
}

/** 400 — caller sent invalid / conflicting data */
export function badRequest(message: string, details?: unknown): AppError {
  return new AppError(400, 'BAD_REQUEST', message, details);
}
