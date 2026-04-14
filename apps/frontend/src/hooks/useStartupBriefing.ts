/**
 * @file hooks/useStartupBriefing.ts
 * @description SSE consumer for the daily TARS startup briefing.
 *   Connects to GET /api/ai/briefing and streams tokens into state.
 *   Only fetches once per calendar day — checked via localStorage.
 *   The briefing fetch starts immediately on mount so text is ready
 *   by the time any boot animation finishes.
 * @module @polaris/frontend/hooks
 *
 * @dependencies
 * - React (useState, useRef, useCallback, useEffect)
 *
 * @relatedFiles
 * - apps/backend/src/controllers/ai.controller.ts (briefingHandler)
 * - components/assistant/StartupBriefing.tsx
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// ---------------------------------------------------------------------------
// localStorage key helpers
// ---------------------------------------------------------------------------

const BRIEFING_KEY_PREFIX = 'polaris:briefing:';

function todayKey(): string {
  return `${BRIEFING_KEY_PREFIX}${new Date().toISOString().split('T')[0] as string}`;
}

function wasBriefingShownToday(): boolean {
  try {
    return localStorage.getItem(todayKey()) === 'shown';
  } catch { return false; }
}

function markBriefingShownToday(): void {
  try {
    // Prune stale keys first
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(BRIEFING_KEY_PREFIX) && k !== todayKey()) {
        localStorage.removeItem(k);
      }
    }
    localStorage.setItem(todayKey(), 'shown');
  } catch { /* noop */ }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BriefingStatus = 'idle' | 'streaming' | 'done' | 'error' | 'skipped';

interface BriefingState {
  status:  BriefingStatus;
  text:    string;
  error:   string | null;
}

const BASE_URL = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '/api';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Provides the daily TARS startup briefing as a streaming text feed.
 *
 * - `start()` initiates the SSE connection (call once on mount).
 * - Already shown today? `status` will be `'skipped'` immediately.
 * - `markShown()` records that the briefing was displayed today.
 */
export function useStartupBriefing() {
  const [state, setState] = useState<BriefingState>({
    status: 'idle',
    text:   '',
    error:  null,
  });

  const esRef = useRef<EventSource | null>(null);

  const start = useCallback(() => {
    if (wasBriefingShownToday()) {
      setState({ status: 'skipped', text: '', error: null });
      return;
    }

    esRef.current?.close();
    setState({ status: 'streaming', text: '', error: null });

    const es = new EventSource(`${BASE_URL}/ai/briefing`);
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
          type:     'token' | 'error';
          token?:   string;
          message?: string;
        };

        if (msg.type === 'token' && msg.token) {
          setState((prev) => ({ ...prev, text: prev.text + msg.token }));
        } else if (msg.type === 'error') {
          es.close();
          setState((prev) => ({
            ...prev,
            status: 'error',
            error: msg.message ?? 'Briefing failed',
          }));
        }
      } catch {
        // Non-JSON line — ignore
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

  /** Call once the briefing is visible to the user */
  const markShown = useCallback(() => {
    markBriefingShownToday();
  }, []);

  const dismiss = useCallback(() => {
    esRef.current?.close();
    setState((prev) => ({ ...prev, status: 'done' }));
    markBriefingShownToday();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { esRef.current?.close(); };
  }, []);

  return { state, start, markShown, dismiss };
}
