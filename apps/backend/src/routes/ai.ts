/**
 * @file routes/ai.ts
 * @description Route definitions for the AI API.
 *   All endpoints are read-only (suggestions only — never mutate DB).
 *   Mounted at /api/ai in routes/index.ts.
 *
 * @module @polaris/backend/routes
 *
 * @relatedFiles
 *   - src/routes/index.ts
 *   - src/controllers/ai.controller.ts
 */

import type { FastifyPluginAsync } from 'fastify';
import * as AIController from '../controllers/ai.controller.js';

/**
 * AI routes — mounted at `/api/ai` in routes/index.ts
 * Rate limit: 10 requests/minute (stricter than global 100/min — protects LLM quota)
 */
const aiRoutes: FastifyPluginAsync = async (app) => {
  // Stricter rate limit for all AI endpoints
  await app.register((await import('@fastify/rate-limit')).default, {
    max: 10,
    timeWindow: '1 minute',
    errorResponseBuilder: (_request, context) => ({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `AI endpoint rate limit reached. Please wait before retrying (limit: ${context.max} per ${context.after}).`,
      },
    }),
  });
  /**
   * POST /api/ai/parse-activity
   * Parse a natural-language activity description into structured fields.
   * Body: { rawInput: string }
   * Returns: AIActivityParse (suggestion only — not saved)
   */
  app.post(
    '/parse-activity',
    {
      schema: {
        body: {
          type: 'object',
          required: ['rawInput'],
          additionalProperties: false,
          properties: {
            rawInput: { type: 'string', minLength: 1, maxLength: 1000 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  title:              { type: 'string' },
                  activityType:       { type: 'string', enum: ['quantity', 'duration', 'completion'] },
                  value:              { type: ['number', 'null'] },
                  unit:               { type: ['string', 'null'] },
                  suggestedGoalId:    { type: ['string', 'null'] },
                  suggestedGoalTitle: { type: ['string', 'null'] },
                  confidence:         { type: 'number' },
                  provider:           { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    AIController.parseActivityHandler
  );

  /**
   * POST /api/ai/breakdown
   * Decompose a goal into sub-goals and suggested activities.
   * Body: { goalId: string }
   */
  app.post(
    '/breakdown',
    {
      schema: {
        body: {
          type: 'object',
          required: ['goalId'],
          additionalProperties: false,
          properties: {
            goalId: { type: 'string' },
          },
        },
      },
    },
    AIController.breakdownHandler
  );

  /**
   * POST /api/ai/analyze-week
   * Generate behavioral insights from the past week's dashboard metrics.
   * No body required.
   */
  app.post(
    '/analyze-week',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  summary:    { type: 'string' },
                  insights:   { type: 'array', items: { type: 'string' } },
                  suggestions: { type: 'array', items: { type: 'string' } },
                  provider:   { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    AIController.analyzeWeekHandler
  );
};

export default aiRoutes;
