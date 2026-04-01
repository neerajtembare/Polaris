/**
 * @file routes/goals.ts
 * @description Route definitions for the Goals API.
 *   Registers all /api/goals endpoints with Zod-powered JSON schema validation.
 *   Does not contain business logic — delegates everything to GoalController.
 * @module @polaris/backend/routes
 *
 * @dependencies
 * - fastify
 * - controllers/goal.controller
 *
 * @relatedFiles
 * - src/routes/index.ts          (mounts this plugin)
 * - src/controllers/goal.controller.ts
 * - src/services/goal.service.ts
 */

import type { FastifyPluginAsync } from 'fastify';
import * as GoalController from '../controllers/goal.controller.js';

// ---------------------------------------------------------------------------
// JSON Schema fragments (fastify uses these for validation + serialisation)
// ---------------------------------------------------------------------------

/** Fields present on every goal response object */
const goalProperties = {
  id:          { type: 'string' },
  title:       { type: 'string' },
  description: { type: ['string', 'null'] },
  timeframe:   { type: 'string', enum: ['long', 'medium', 'short'] },
  parentId:    { type: ['string', 'null'] },
  targetValue: { type: ['number', 'null'] },
  targetUnit:  { type: ['string', 'null'] },
  targetDate:  { type: ['string', 'null'] },
  status:      { type: 'string', enum: ['active', 'completed', 'paused', 'archived'] },
  isDeleted:   { type: 'boolean' },
  createdAt:   { type: 'string' },
  updatedAt:   { type: 'string' },
} as const;

/** Progress sub-object returned when include_progress=true */
const progressSchema = {
  type: 'object',
  properties: {
    goalId:           { type: 'string' },
    currentValue:     { type: 'number' },
    targetValue:      { type: ['number', 'null'] },
    unit:             { type: ['string', 'null'] },
    percentage:       { type: ['number', 'null'] },
    activityCount:    { type: 'number' },
    lastActivityDate: { type: ['string', 'null'] },
    daysActive:       { type: 'number' },
  },
};

const goalSchema = {
  type: 'object',
  properties: {
    ...goalProperties,
    /** Populated when include_progress=true */
    progress: { ...progressSchema, nullable: true },
    /** Populated when include_children=true */
    children: {
      type: 'array',
      items: { type: 'object', properties: goalProperties },
    },
  },
};

/** Schema for POST /goals request body */
const createGoalBodySchema = {
  type: 'object',
  required: ['title'],
  additionalProperties: false,
  properties: {
    title:       { type: 'string', minLength: 1, maxLength: 500 },
    description: { type: 'string', maxLength: 2000 },
    timeframe:   { type: 'string', enum: ['long', 'medium', 'short'] },
    targetValue: { type: 'number' },
    targetUnit:  { type: 'string', maxLength: 50 },
    targetDate:  { type: 'string' },
    parentId:    { type: 'string' },
  },
};

/** Schema for PATCH /goals/:id request body — at least one field is required */
const updateGoalBodySchema = {
  type: 'object',
  additionalProperties: false,
  minProperties: 1,
  properties: {
    title:       { type: 'string', minLength: 1, maxLength: 500 },
    description: { type: ['string', 'null'] },
    timeframe:   { type: 'string', enum: ['long', 'medium', 'short'] },
    targetValue: { type: ['number', 'null'] },
    targetUnit:  { type: ['string', 'null'] },
    targetDate:  { type: ['string', 'null'] },
    parentId:    { type: ['string', 'null'] },
    status:      { type: 'string', enum: ['active', 'completed', 'paused', 'archived'] },
  },
};

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

/**
 * Goals API routes — mounted at `/api/goals` in routes/index.ts
 */
export const goalsRoutes: FastifyPluginAsync = async (app) => {
  /** GET /api/goals */
  app.get(
    '/',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            status:          { type: 'string' },
            timeframe:       { type: 'string' },
            parentId:        { type: 'string' },
            includeProgress: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array', items: goalSchema },
            },
          },
        },
      },
    },
    GoalController.getGoals
  );

  /** POST /api/goals */
  app.post(
    '/',
    {
      schema: {
        body: createGoalBodySchema,
        response: {
          201: {
            type: 'object',
            properties: { success: { type: 'boolean' }, data: goalSchema },
          },
        },
      },
    },
    GoalController.createGoal
  );

  /** GET /api/goals/:id */
  app.get(
    '/:id',
    {
      schema: {
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        querystring: {
          type: 'object',
          properties: {
            includeProgress: { type: 'boolean' },
            includeChildren: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: { success: { type: 'boolean' }, data: goalSchema },
          },
        },
      },
    },
    GoalController.getGoal
  );

  /** PATCH /api/goals/:id */
  app.patch(
    '/:id',
    {
      schema: {
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: updateGoalBodySchema,
      },
    },
    GoalController.updateGoal
  );

  /** DELETE /api/goals/:id */
  app.delete(
    '/:id',
    {
      schema: {
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        querystring: {
          type: 'object',
          properties: {
            cascade: { type: 'boolean' },
          },
        },
      },
    },
    GoalController.deleteGoal
  );

  /** GET /api/goals/:id/progress */
  app.get(
    '/:id/progress',
    {
      schema: {
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  goalId:           { type: 'string' },
                  currentValue:     { type: 'number' },
                  targetValue:      { type: ['number', 'null'] },
                  unit:             { type: ['string', 'null'] },
                  percentage:       { type: ['number', 'null'] },
                  activityCount:    { type: 'number' },
                  lastActivityDate: { type: ['string', 'null'] },
                  daysActive:       { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    GoalController.getGoalProgress
  );
};
