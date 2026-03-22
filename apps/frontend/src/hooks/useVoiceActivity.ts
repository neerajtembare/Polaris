/**
 * @file hooks/useVoiceActivity.ts
 * @description Orchestrates the full voice-to-parsed-activity pipeline:
 *   1. Sends audio Blob to POST /api/voice/transcribe
 *   2. Feeds the transcribed text to POST /api/ai/parse-activity
 *   3. Returns the parsed result for the form to display
 *
 *   Also exposes useVoiceStatus() for checking whether the Whisper
 *   service is available (used to conditionally show the mic button).
 *
 * @module @polaris/frontend/hooks
 *
 * @relatedFiles
 *   - src/hooks/useVoiceRecorder.ts
 *   - src/components/ui/VoiceButton.tsx
 *   - src/components/activities/LogActivityForm.tsx
 *   - src/services/api.ts
 */

import { useCallback, useState } from 'react';
import { useQuery }              from '@tanstack/react-query';
import { api, ApiRequestError }  from '../services/api.ts';
import type { ApiSuccess, AIActivityParse } from '@polaris/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VoiceTranscribeResult {
  text:     string;
  language: string;
  duration: number;
  elapsed:  number;
}

export interface VoiceActivityResult {
  /** Raw text returned by Whisper */
  transcript: string;
  /** Parsed structured activity from the AI layer */
  parsed:     AIActivityParse;
}

// ---------------------------------------------------------------------------
// Voice status query (is Whisper available?)
// ---------------------------------------------------------------------------

interface VoiceStatus { available: boolean; message: string; }

/**
 * Polls /api/voice/status every 30 seconds to tell the UI whether
 * the Whisper service is running.
 * The mic button is hidden/disabled when available === false.
 */
export function useVoiceStatus() {
  return useQuery({
    queryKey:  ['voice', 'status'],
    queryFn:   () => api.get<ApiSuccess<VoiceStatus>>('/voice/status').then((r) => r.data),
    staleTime: 30_000,
    retry:     false, // Don't retry — unavailable is an expected state
  });
}

// ---------------------------------------------------------------------------
// Voice activity pipeline hook
// ---------------------------------------------------------------------------

/**
 * Manages the two-step pipeline: transcribe → parse.
 *
 * @example
 * const { transcribeAndParse, result, isProcessing, error, reset } = useVoiceActivity();
 *
 * // In recorder onAudioReady:
 * void transcribeAndParse(audioBlob);
 *
 * // In component:
 * if (result) applyToForm(result.parsed, result.transcript);
 */
export function useVoiceActivity() {
  const [result,      setResult]      = useState<VoiceActivityResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const transcribeAndParse = useCallback(async (audioBlob: Blob): Promise<VoiceActivityResult | null> => {
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      // ── Step 1: Transcribe audio ─────────────────────────────────────────
      // POST /api/voice/transcribe with multipart/form-data
      // We use fetch directly here — api.ts helper always sets JSON content-type
      const form = new FormData();
      form.append('audio', audioBlob, 'recording.webm');

      const transcribeRes = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: form,
        // Do NOT set Content-Type — browser sets multipart boundary automatically
      });

      if (!transcribeRes.ok) {
        const body = (await transcribeRes.json()) as { error?: { message?: string } };
        const msg = body.error?.message ?? 'Transcription failed';
        if (transcribeRes.status === 503) {
          throw new Error('Voice service is not running. Start it via Docker or start.sh.');
        }
        throw new Error(msg);
      }

      const transcribeData = (await transcribeRes.json()) as ApiSuccess<VoiceTranscribeResult>;
      const transcript = transcribeData.data.text.trim();

      if (!transcript) {
        throw new Error('No speech detected. Please try again.');
      }

      // ── Step 2: Parse transcript with AI ─────────────────────────────────
      const parseRes = await api.post<ApiSuccess<AIActivityParse>>(
        '/ai/parse-activity',
        { rawInput: transcript },
      );

      const finalResult: VoiceActivityResult = { transcript, parsed: parseRes.data };
      setResult(finalResult);
      return finalResult;

    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Voice processing failed.',
      );
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsProcessing(false);
  }, []);

  return { transcribeAndParse, result, isProcessing, error, reset };
}
