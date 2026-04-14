/**
 * @file controllers/focus-session.controller.ts
 * @description HTTP handlers for the Focus Sessions API.
 *   Delegates all logic to FocusSessionService; keeps controllers thin.
 * @module @polaris/backend/controllers
 *
 * @dependencies
 * - fastify (types)
 * - services/focus-session.service
 * - lib/errors, lib/handleError
 *
 * @relatedFiles
 * - src/routes/focus-sessions.ts
 * - src/services/focus-session.service.ts
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type {
  CreateFocusSessionInput,
  UpdateFocusSessionInput,
  CompleteFocusSessionInput,
  AbandonFocusSessionInput,
} from '@polaris/shared';
import * as FocusSessionService from '../services/focus-session.service.js';
import { handleError }          from '../lib/handleError.js';

// ---------------------------------------------------------------------------
// Param / query shapes
// ---------------------------------------------------------------------------

interface SessionParams { id: string; }

interface ListSessionsQuery {
  status?: string;
  goalId?: string;
  limit?:  number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/** GET /api/focus-sessions */
export async function listFocusSessions(
  request: FastifyRequest<{ Querystring: ListSessionsQuery }>,
  reply: FastifyReply
) {
  try {
    const sessions = await FocusSessionService.listFocusSessions(request.query);
    return reply.send({ success: true, data: sessions });
  } catch (err) {
    return handleError('FocusSessionController', err, reply);
  }
}

/** GET /api/focus-sessions/:id */
export async function getFocusSession(
  request: FastifyRequest<{ Params: SessionParams }>,
  reply: FastifyReply
) {
  try {
    const session = await FocusSessionService.getFocusSession(request.params.id);
    return reply.send({ success: true, data: session });
  } catch (err) {
    return handleError('FocusSessionController', err, reply);
  }
}

/** POST /api/focus-sessions */
export async function createFocusSession(
  request: FastifyRequest<{ Body: CreateFocusSessionInput }>,
  reply: FastifyReply
) {
  try {
    const session = await FocusSessionService.createFocusSession(request.body);
    return reply.status(201).send({ success: true, data: session });
  } catch (err) {
    return handleError('FocusSessionController', err, reply);
  }
}

/** PATCH /api/focus-sessions/:id */
export async function updateFocusSession(
  request: FastifyRequest<{ Params: SessionParams; Body: UpdateFocusSessionInput }>,
  reply: FastifyReply
) {
  try {
    const session = await FocusSessionService.updateFocusSession(request.params.id, request.body);
    return reply.send({ success: true, data: session });
  } catch (err) {
    return handleError('FocusSessionController', err, reply);
  }
}

/** POST /api/focus-sessions/:id/complete */
export async function completeFocusSession(
  request: FastifyRequest<{ Params: SessionParams; Body: CompleteFocusSessionInput }>,
  reply: FastifyReply
) {
  try {
    const session = await FocusSessionService.completeFocusSession(request.params.id, request.body);
    return reply.send({ success: true, data: session });
  } catch (err) {
    return handleError('FocusSessionController', err, reply);
  }
}

/** POST /api/focus-sessions/:id/abandon */
export async function abandonFocusSession(
  request: FastifyRequest<{ Params: SessionParams; Body: AbandonFocusSessionInput }>,
  reply: FastifyReply
) {
  try {
    const session = await FocusSessionService.abandonFocusSession(request.params.id, request.body);
    return reply.send({ success: true, data: session });
  } catch (err) {
    return handleError('FocusSessionController', err, reply);
  }
}

/** DELETE /api/focus-sessions/:id */
export async function deleteFocusSession(
  request: FastifyRequest<{ Params: SessionParams }>,
  reply: FastifyReply
) {
  try {
    await FocusSessionService.deleteFocusSession(request.params.id);
    return reply.send({ success: true, data: null });
  } catch (err) {
    return handleError('FocusSessionController', err, reply);
  }
}

/** GET /api/focus-sessions/stats/by-day?start=YYYY-MM-DD&end=YYYY-MM-DD */
export async function getFocusStatsByDay(
  request: FastifyRequest<{ Querystring: { start: string; end: string } }>,
  reply: FastifyReply
) {
  try {
    const { start, end } = request.query;
    const data = await FocusSessionService.getFocusMinutesByDay(start, end);
    return reply.send({ success: true, data });
  } catch (err) {
    return handleError('FocusSessionController', err, reply);
  }
}
