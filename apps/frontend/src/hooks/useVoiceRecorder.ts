/**
 * @file hooks/useVoiceRecorder.ts
 * @description React hook that wraps the browser MediaRecorder API.
 *   Handles microphone permission, recording lifecycle, and produces
 *   an audio Blob in the best format the browser supports.
 *
 * @module @polaris/frontend/hooks
 *
 * @relatedFiles
 *   - src/hooks/useVoiceActivity.ts (consumes the blob)
 *   - src/components/ui/VoiceButton.tsx
 */

import { useState, useRef, useCallback } from 'react';

/** Recording state machine */
export type RecorderState = 'idle' | 'requesting' | 'recording' | 'processing';

export interface UseVoiceRecorderReturn {
  state:          RecorderState;
  startRecording: () => Promise<void>;
  stopRecording:  () => void;
  cancelRecording: () => void;
  /** Duration of the last recording in seconds */
  duration:       number;
  /** Error message, if any */
  error:          string | null;
}

/**
 * Encapsulates the browser MediaRecorder API for voice input.
 *
 * @param onAudioReady - Called with the recorded audio Blob once recording stops.
 *                       The MIME type is embedded in blob.type.
 *
 * @example
 * const { state, startRecording, stopRecording } = useVoiceRecorder({
 *   onAudioReady: (blob) => { void transcribe(blob); }
 * });
 */
export function useVoiceRecorder({
  onAudioReady,
}: {
  onAudioReady: (blob: Blob) => void;
}): UseVoiceRecorderReturn {
  const [state,    setState]    = useState<RecorderState>('idle');
  const [duration, setDuration] = useState(0);
  const [error,    setError]    = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const streamRef        = useRef<MediaStream | null>(null);
  const startTimeRef     = useRef<number>(0);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Clean up the media stream and timer */
  const cleanup = useCallback(() => {
    timerRef.current && clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setState('requesting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Pick the best supported MIME type (webm preferred — browsers handle it well)
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']
        .find((m) => MediaRecorder.isTypeSupported(m)) ?? '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || 'audio/webm',
        });
        cleanup();
        setState('processing');
        onAudioReady(blob);
      };

      recorder.onerror = () => {
        setError('Recording failed. Please try again.');
        cleanup();
        setState('idle');
      };

      // Collect chunks every 250ms — avoids a single huge chunk at the end
      recorder.start(250);
      setState('recording');

      // Update elapsed duration every second for the UI
      timerRef.current = setInterval(() => {
        setDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone permission denied. Please allow access and try again.'
          : 'Could not access microphone. Check your browser settings.';
      setError(message);
      cleanup();
      setState('idle');
    }
  }, [cleanup, onAudioReady]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    // onstop handler fires asynchronously
  }, []);

  const cancelRecording = useCallback(() => {
    // Detach onstop so we don't process cancelled audio
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    cleanup();
    setState('idle');
    setDuration(0);
  }, [cleanup]);

  return { state, startRecording, stopRecording, cancelRecording, duration, error };
}
