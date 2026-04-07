/**
 * @file voice.service.ts
 * @description Proxy service that forwards raw audio from the frontend
 *              to the Whisper microservice and returns the transcribed text.
 *
 * @module @polaris/backend/services
 *
 * @dependencies
 * - node fetch (native in Node 18+)
 * - WHISPER_URL env var (default: http://localhost:8001)
 *
 * @relatedFiles
 * - src/controllers/voice.controller.ts
 * - src/routes/voice.ts
 * - services/whisper/main.py
 */

/** Shape of the successful response from the Whisper microservice */
export interface WhisperTranscribeResult {
  text: string;
  language: string;
  duration: number;
  elapsed: number;
}

// Read Whisper service URL from env (set by Docker Compose or local .env)
const WHISPER_URL = process.env['WHISPER_URL'] ?? 'http://localhost:8001';

/**
 * Check whether the Whisper service is reachable and ready.
 *
 * @returns true if the service is healthy, false otherwise
 */
export async function isWhisperAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${WHISPER_URL}/health`, {
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { status?: string };
    return body.status === 'ok';
  } catch {
    return false;
  }
}

/**
 * Forward audio bytes to the Whisper service and return the transcription.
 *
 * @param audioBuffer  - Raw audio bytes received from the browser (webm/ogg/wav)
 * @param mimeType     - MIME type reported by the browser (e.g. "audio/webm")
 * @param filename     - Optional filename hint (used for extension detection)
 * @returns WhisperTranscribeResult with text + metadata
 * @throws Error if the Whisper service is unavailable or returns an error
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string,
  filename = 'recording.webm',
): Promise<WhisperTranscribeResult> {
  // Build multipart/form-data body — mirrors what the browser sends
  const form = new FormData();
  const blob = new Blob([audioBuffer], { type: mimeType });
  form.append('audio', blob, filename);

  let res: Response;
  try {
    res = await fetch(`${WHISPER_URL}/transcribe`, {
      method: 'POST',
      body: form,
      // No explicit Content-Type — fetch sets multipart boundary automatically
      signal: AbortSignal.timeout(60_000), // 60 second timeout for long recordings
    });
  } catch (_err) {
    throw new Error(
      `Whisper service unreachable at ${WHISPER_URL}. ` +
        'Make sure it is running (Docker: whisper service | Local: uvicorn in services/whisper).',
    );
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Whisper service error ${res.status}: ${body}`);
  }

  return res.json() as Promise<WhisperTranscribeResult>;
}
