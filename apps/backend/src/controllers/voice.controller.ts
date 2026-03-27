/**
 * @file voice.controller.ts
 * @description HTTP handlers for voice transcription endpoints.
 *              Thin layer: validates input, calls voice service, returns
 *              standard API envelope.
 *
 * @module @polaris/backend/controllers
 *
 * @dependencies
 * - fastify
 * - src/services/voice.service.ts
 *
 * @relatedFiles
 * - src/routes/voice.ts
 * - src/services/voice.service.ts
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { transcribeAudio, isWhisperAvailable } from '../services/voice.service.js';

/**
 * GET /api/voice/status
 *
 * Returns whether the Whisper service is reachable and ready.
 * The frontend uses this to decide whether to show/enable the mic button.
 */
export async function statusHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const available = await isWhisperAvailable();
  await reply.send({
    success: true,
    data: {
      available,
      message: available
        ? 'Whisper service is ready'
        : 'Whisper service is not running. Start it with Docker or locally via start.sh.',
    },
  });
}

/**
 * POST /api/voice/transcribe
 *
 * Accepts a raw audio file upload (multipart/form-data, field: "audio")
 * and returns the transcribed text.
 *
 * The frontend records audio using the MediaRecorder API and POSTs the blob here.
 * This handler forwards the raw bytes to the Whisper microservice.
 *
 * @returns { success: true, data: { text, language, duration, elapsed } }
 * @throws 400 if no audio file is provided
 * @throws 503 if the Whisper service is unavailable
 * @throws 500 on transcription failure
 */
export async function transcribeHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Fastify multipart — we get the raw file from request.file()
  // (multipart plugin registered globally in app.ts)
  const data = await request.file();
  if (!data) {
    await reply.status(400).send({
      success: false,
      error: { code: 'NO_AUDIO', message: 'No audio file provided in request' },
    });
    return;
  }

  // Buffer the stream — we need bytes to forward to the Whisper service
  const chunks: Buffer[] = [];
  for await (const chunk of data.file) {
    chunks.push(chunk as Buffer);
  }
  const audioBuffer = Buffer.concat(chunks);

  if (audioBuffer.length === 0) {
    await reply.status(400).send({
      success: false,
      error: { code: 'EMPTY_AUDIO', message: 'Audio file is empty' },
    });
    return;
  }

  const mimeType = data.mimetype || 'audio/webm';
  const filename = data.filename || 'recording.webm';

  try {
    const result = await transcribeAudio(audioBuffer, mimeType, filename);
    await reply.send({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transcription failed';

    // Distinguish service-unavailable from actual errors
    if (message.includes('unreachable')) {
      await reply.status(503).send({
        success: false,
        error: { code: 'WHISPER_UNAVAILABLE', message },
      });
      return;
    }

    request.log.error({ err }, 'Voice transcription failed');
    await reply.status(500).send({
      success: false,
      error: { code: 'TRANSCRIPTION_FAILED', message: 'Audio transcription failed' },
    });
  }
}
