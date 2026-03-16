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
 */
const aiRoutes: FastifyPluginAsync = async (app) => {
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
};

export default aiRoutes;
