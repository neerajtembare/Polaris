/**
 * @file hooks/useWeeklyAnalysisStream.ts
 * @description Hook for consuming the SSE weekly analysis stream.
 *   Connects to GET /api/ai/analyze-week/stream and progressively
 *   builds the analysis result as tokens arrive.
 * @module @polaris/frontend/hooks
 *
 * @dependencies
 * - React (useState, useCallback, useRef)
 * - @polaris/shared (AIWeeklyAnalysis)
 *
 * @relatedFiles
 * - apps/backend/src/controllers/ai.controller.ts  (analyzeWeekStreamHandler)
 * - components/WeeklyReview.tsx
 */

import { useState, useRef, useCallback } from 'react';
import type { AIWeeklyAnalysis } from '@polaris/shared';

type StreamStatus = 'idle' | 'streaming' | 'done' | 'error';

interface StreamState {
  status:   StreamStatus;
  tokens:   string;       // raw accumulated text while streaming
  result:   AIWeeklyAnalysis | null;
  error:    string | null;
}

const BASE_URL = import.meta.env['VITE_API_URL'] as string | undefined ?? '/api';

export function useWeeklyAnalysisStream() {
  const [state, setState] = useState<StreamState>({
    status:  'idle',
    tokens:  '',
    result:  null,
    error:   null,
  });

  const esRef = useRef<EventSource | null>(null);

  const start = useCallback(() => {
    // Close any previous stream
    esRef.current?.close();

    setState({ status: 'streaming', tokens: '', result: null, error: null });

    // EventSource doesn't support POST — we use GET SSE endpoint
    const url = `${BASE_URL}/ai/analyze-week/stream`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event: MessageEvent<string>) => {
      const raw = event.data;

      if (raw === '[DONE]') {
        es.close();
        setState((prev) => ({ ...prev, status: 'done' }));
        return;
      }

      try {
        const msg = JSON.parse(raw) as {
          type:    'token' | 'result' | 'error';
          token?:  string;
          data?:   AIWeeklyAnalysis;
          message?: string;
        };

        if (msg.type === 'token' && msg.token) {
          setState((prev) => ({ ...prev, tokens: prev.tokens + msg.token }));
        } else if (msg.type === 'result' && msg.data) {
          setState((prev) => ({ ...prev, result: msg.data ?? null }));
        } else if (msg.type === 'error') {
          es.close();
          setState((prev) => ({ ...prev, status: 'error', error: msg.message ?? 'Unknown error' }));
        }
      } catch {
        // Non-JSON message — ignore
      }
    };

    es.onerror = () => {
      es.close();
      setState((prev) =>
        prev.status !== 'done'
          ? { ...prev, status: 'error', error: 'Connection lost' }
          : prev
      );
    };
  }, []);

  const reset = useCallback(() => {
    esRef.current?.close();
    setState({ status: 'idle', tokens: '', result: null, error: null });
  }, []);

  return { state, start, reset };
}
