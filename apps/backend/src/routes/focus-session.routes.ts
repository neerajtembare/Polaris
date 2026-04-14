/**
 * @file routes/focus-sessions.ts
 * @description Route definitions for the Focus Sessions API.
 *   Registers all /api/focus-sessions endpoints with Fastify schema validation.
 * @module @polaris/backend/routes
 *
 * @dependencies
 * - fastify
 * - controllers/focus-session.controller
 *
 * @relatedFiles
 * - src/routes/index.ts
 * - src/controllers/focus-session.controller.ts
 * - src/services/focus-session.service.ts
 */

import type { FastifyPluginAsync } from 'fastify';
import * as FocusSessionController from '../controllers/focus-session.controller.js';

// ---------------------------------------------------------------------------
// Shared schema fragment (base session object)
// ---------------------------------------------------------------------------

const sessionProperties = {
  id:          { type: 'string' },
  goalId:      { type: ['string', 'null'] },
  activityId:  { type: ['string', 'null'] },
  plannedMins: { type: 'number' },
  actualMins:  { type: ['number', 'null'] },
  breaks:      { type: 'number' },
  status:      { type: 'string', enum: ['active', 'completed', 'abandoned'] },
  startedAt:   { type: 'string' },
  endedAt:     { type: ['string', 'null'] },
  notes:       { type: ['string', 'null'] },
  userId:      { type: ['string', 'null'] },
  isDeleted:   { type: 'boolean' },
  createdAt:   { type: 'string' },
  updatedAt:   { type: 'string' },
} as const;

const sessionSchema = {
  type: 'object',
  properties: sessionProperties,
} as const;

const sessionResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data:    sessionSchema,
  },
} as const;

const sessionListResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data:    { type: 'array', items: sessionSchema },
  },
} as const;

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

const focusSessionsRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/focus-sessions
  app.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'completed', 'abandoned'] },
          goalId: { type: 'string' },
          limit:  { type: 'integer', default: 50 },
          offset: { type: 'integer', default: 0 },
        },
      },
      response: { 200: sessionListResponse },
    },
    handler: FocusSessionController.listFocusSessions,
  });

  // GET /api/focus-sessions/stats/by-day
  app.get('/stats/by-day', {
    schema: {
      querystring: {
        type: 'object',
        required: ['start', 'end'],
        properties: {
          start: { type: 'string' },
          end:   { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data:    { type: 'object', additionalProperties: { type: 'number' } },
          },
        },
      },
    },
    handler: FocusSessionController.getFocusStatsByDay,
  });

  // GET /api/focus-sessions/:id
  app.get('/:id', {
    schema: {
      params:   { type: 'object', properties: { id: { type: 'string' } } },
      response: { 200: sessionResponse },
    },
    handler: FocusSessionController.getFocusSession,
  });

  // POST /api/focus-sessions
  app.post('/', {
    schema: {
      body: {
        type: 'object',
        required: ['plannedMins'],
        properties: {
          goalId:      { type: 'string' },
          plannedMins: { type: 'integer', minimum: 1, maximum: 480 },
          notes:       { type: 'string' },
        },
      },
      response: { 201: sessionResponse },
    },
    handler: FocusSessionController.createFocusSession,
  });

  // PATCH /api/focus-sessions/:id
  app.patch('/:id', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          status:      { type: 'string', enum: ['active', 'completed', 'abandoned'] },
          actualMins:  { type: 'integer', minimum: 0 },
          breaks:      { type: 'integer', minimum: 0 },
          endedAt:     { type: 'string' },
          notes:       { type: 'string' },
          activityId:  { type: 'string' },
        },
      },
      response: { 200: sessionResponse },
    },
    handler: FocusSessionController.updateFocusSession,
  });

  // POST /api/focus-sessions/:id/complete
  app.post('/:id/complete', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        required: ['actualMins'],
        properties: {
          actualMins:       { type: 'integer', minimum: 0 },
          breaks:           { type: 'integer', minimum: 0 },
          notes:            { type: 'string' },
          autoLogActivity:  { type: 'boolean', default: true },
        },
      },
      response: { 200: sessionResponse },
    },
    handler: FocusSessionController.completeFocusSession,
  });

  // POST /api/focus-sessions/:id/abandon
  app.post('/:id/abandon', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        required: ['actualMins'],
        properties: {
          actualMins: { type: 'integer', minimum: 0 },
          notes:      { type: 'string' },
        },
      },
      response: { 200: sessionResponse },
    },
    handler: FocusSessionController.abandonFocusSession,
  });

  // DELETE /api/focus-sessions/:id
  app.delete('/:id', {
    schema: {
      params:   { type: 'object', properties: { id: { type: 'string' } } },
      response: { 200: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'null' } } } },
    },
    handler: FocusSessionController.deleteFocusSession,
  });
};

export default focusSessionsRoutes;
