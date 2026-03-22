/**
 * @file routes/voice.ts
 * @description Route definitions for the voice transcription API.
 *              Mounted at /api/voice in routes/index.ts.
 *
 *              Endpoints:
 *                GET  /api/voice/status     — Whisper service availability check
 *                POST /api/voice/transcribe — Audio → text transcription
 *
 * @module @polaris/backend/routes
 *
 * @dependencies
 * - fastify
 * - @fastify/multipart
 *
 * @relatedFiles
 * - src/routes/index.ts
 * - src/controllers/voice.controller.ts
 * - services/whisper/main.py
 */

import type { FastifyPluginAsync } from 'fastify';
import { statusHandler, transcribeHandler } from '../controllers/voice.controller.js';

/**
 * Voice routes — mounted at `/api/voice` in routes/index.ts
 *
 * All endpoints are read-only from the Polaris data perspective:
 * transcription never writes to the database — it returns a suggestion
 * for the user to confirm before any activity is logged.
 */
const voiceRoutes: FastifyPluginAsync = async (app): Promise<void> => {
  /**
   * GET /api/voice/status
   * Lightweight health check for the Whisper service.
   * Used by the frontend to decide whether to enable the mic button.
   */
  app.get(
    '/status',
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
                  available: { type: 'boolean' },
                  message:   { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    statusHandler,
  );

  /**
   * POST /api/voice/transcribe
   * Accepts a multipart audio file and returns the transcribed text.
   * Request: multipart/form-data with field "audio" (webm / ogg / wav)
   * Response: { success: true, data: { text, language, duration, elapsed } }
   */
  app.post(
    '/transcribe',
    {
      schema: {
        // No body schema — multipart is handled by @fastify/multipart, not JSON
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  text:     { type: 'string' },
                  language: { type: 'string' },
                  duration: { type: 'number' },
                  elapsed:  { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    transcribeHandler,
  );
};

export default voiceRoutes;
