/**
 * @file routes/activities.ts
 * @description Route definitions for the Activities API.
 *   Registers all /api/activities endpoints with JSON schema validation.
 *   Does not contain business logic — delegates to ActivityController.
 * @module @polaris/backend/routes
 *
 * @dependencies
 * - fastify
 * - controllers/activity.controller
 *
 * @relatedFiles
 * - src/routes/index.ts           (mounts this plugin)
 * - src/controllers/activity.controller.ts
 * - src/services/activity.service.ts
 */

import type { FastifyPluginAsync } from 'fastify';
import * as ActivityController from '../controllers/activity.controller.js';

// ---------------------------------------------------------------------------
// JSON Schema fragments
// ---------------------------------------------------------------------------

const activityProperties = {
  id:            { type: 'string' },
  title:         { type: 'string' },
  notes:         { type: ['string', 'null'] },
  activityType:  { type: 'string', enum: ['quantity', 'duration', 'completion'] },
  value:         { type: ['number', 'null'] },
  unit:          { type: ['string', 'null'] },
  rawInput:      { type: ['string', 'null'] },
  goalId:        { type: ['string', 'null'] },
  activityDate:  { type: 'string' },
  category:      { type: 'string', enum: ['growth', 'maintenance'] },
  status:        { type: 'string', enum: ['planned', 'completed', 'skipped'] },
  aiGenerated:   { type: 'boolean' },
  aiCategorized: { type: 'boolean' },
  isDeleted:     { type: 'boolean' },
  createdAt:     { type: 'string' },
  updatedAt:     { type: 'string' },
  completedAt:   { type: ['string', 'null'] },
} as const;

const activitySchema = { type: 'object', properties: activityProperties };

/** Schema for POST /activities request body */
const createActivityBodySchema = {
  type: 'object',
  required: ['title', 'activity_type', 'activity_date'],
  additionalProperties: false,
  properties: {
    title:         { type: 'string', minLength: 1, maxLength: 500 },
    activity_type: { type: 'string', enum: ['quantity', 'duration', 'completion'] },
    value:         { type: 'number' },
    unit:          { type: 'string', maxLength: 50 },
    goal_id:       { type: 'string' },
    activity_date: { type: 'string' },   // YYYY-MM-DD
    category:      { type: 'string', enum: ['growth', 'maintenance'] },
    status:        { type: 'string', enum: ['planned', 'completed', 'skipped'] },
    notes:         { type: 'string', maxLength: 2000 },
    raw_input:     { type: 'string', maxLength: 2000 },
  },
};

/** Schema for PATCH /activities/:id request body */
const updateActivityBodySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title:         { type: 'string', minLength: 1, maxLength: 500 },
    activity_type: { type: 'string', enum: ['quantity', 'duration', 'completion'] },
    value:         { type: ['number', 'null'] },
    unit:          { type: ['string', 'null'] },
    goal_id:       { type: ['string', 'null'] },
    activity_date: { type: 'string' },
    category:      { type: 'string', enum: ['growth', 'maintenance'] },
    status:        { type: 'string', enum: ['planned', 'completed', 'skipped'] },
    notes:         { type: ['string', 'null'] },
    completed_at:  { type: ['string', 'null'] },
  },
};

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

/**
 * Activities API routes — mounted at `/api/activities` in routes/index.ts.
 * IMPORTANT: /today must be registered before /:id to avoid path conflicts.
 */
export const activitiesRoutes: FastifyPluginAsync = async (app) => {
  /** GET /api/activities/today — must come before /:id */
  app.get('/today', {}, ActivityController.getTodayActivities);

  /** GET /api/activities */
  app.get(
    '/',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            date:          { type: 'string' },
            start_date:    { type: 'string' },
            end_date:      { type: 'string' },
            goal_id:       { type: 'string' },
            status:        { type: 'string' },
            activity_type: { type: 'string' },
            limit:         { type: 'integer', minimum: 1, maximum: 200 },
            offset:        { type: 'integer', minimum: 0 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array', items: activitySchema },
              meta: {
                type: 'object',
                properties: {
                  total:  { type: 'number' },
                  limit:  { type: 'number' },
                  offset: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    ActivityController.getActivities
  );

  /** POST /api/activities */
  app.post(
    '/',
    {
      schema: {
        body: createActivityBodySchema,
        response: {
          201: {
            type: 'object',
            properties: { success: { type: 'boolean' }, data: activitySchema },
          },
        },
      },
    },
    ActivityController.createActivity
  );

  /** GET /api/activities/:id */
  app.get(
    '/:id',
    {
      schema: {
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: {
          200: {
            type: 'object',
            properties: { success: { type: 'boolean' }, data: activitySchema },
          },
        },
      },
    },
    ActivityController.getActivity
  );

  /** PATCH /api/activities/:id */
  app.patch(
    '/:id',
    {
      schema: {
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: updateActivityBodySchema,
      },
    },
    ActivityController.updateActivity
  );

  /** DELETE /api/activities/:id */
  app.delete(
    '/:id',
    {
      schema: {
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      },
    },
    ActivityController.deleteActivity
  );
};
