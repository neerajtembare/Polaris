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

  /**
   * GET /api/ai/analyze-week/stream
   * Streams weekly analysis tokens as SSE.
   * Events: { type:'token', token:string } | { type:'result', data:AIWeeklyAnalysis } | [DONE]
   */
  app.get('/analyze-week/stream', {}, AIController.analyzeWeekStreamHandler);

  /**
   * GET /api/ai/config
   * Return the currently active AI provider name and Ollama model (if applicable).
   */
  app.get('/config', {}, AIController.getAiConfigHandler);

  /**
   * GET /api/ai/daily-coach
   * Returns a personalised daily coaching message + suggested activity.
   * The frontend caches this for the day using a localStorage date key.
   */
  app.get('/daily-coach', {}, AIController.dailyCoachHandler);

  /**
   * POST /api/ai/config
   * Update the active provider and/or model at runtime (no restart required).
   * Body: { provider?: string, model?: string } — at least one must be provided.
   */
  app.post(
    '/config',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            provider: { type: 'string', minLength: 1, maxLength: 50 },
            model:    { type: 'string', minLength: 1, maxLength: 200 },
          },
        },
      },
    },
    AIController.setAiConfigHandler
  );

  /**
   * POST /api/ai/config/key
   * Set a provider API key at runtime (stored in process.env only — not persisted to disk).
   * Intended for local-dev convenience — key is lost on server restart.
   * Body: { provider: 'gemini' | 'openai', apiKey: string }
   */
  app.post(
    '/config/key',
    {
      schema: {
        body: {
          type: 'object',
          required: ['provider', 'apiKey'],
          additionalProperties: false,
          properties: {
            provider: { type: 'string', enum: ['gemini', 'openai'] },
            apiKey:   { type: 'string', minLength: 1, maxLength: 500 },
          },
        },
      },
    },
    AIController.setApiKeyHandler
  );

  /**
   * GET /api/ai/ollama-models
   * Proxy to Ollama /api/tags — returns list of locally installed model names.
   * Returns empty array if Ollama is unreachable.
   */
  app.get('/ollama-models', {}, AIController.getOllamaModelsHandler);

  /**
   * POST /api/ai/chat
   * Conversational TARS endpoint.
   * - Classifies intent and injects PolarisContext into system prompt
   * - Calls provider.chat() with function-calling tools for write intents
   * - Returns response text + optional TARSAction + requiresConfirmation flag
   * Body: { message: string }
   */
  app.post(
    '/chat',
    {
      schema: {
        body: {
          type: 'object',
          required: ['message'],
          additionalProperties: false,
          properties: {
            message: { type: 'string', minLength: 1, maxLength: 2000 },
          },
        },
      },
    },
    AIController.chatHandler
  );

  /**
   * GET /api/ai/briefing
   * Streams the daily briefing as Server-Sent Events.
   * Events: { type:'token', token:string } | { type:'error', message:string } | [DONE]
   */
  app.get('/briefing', {}, AIController.briefingHandler);
};

export default aiRoutes;
