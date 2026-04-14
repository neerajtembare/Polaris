/**
 * @file hooks/useFocusTimer.ts
 * @description Countdown timer logic for Focus Mode.
 *   Manages tick, pause/resume, breaks, elapsed time.
 *   Completely decoupled from UI — returns state + actions only.
 *   Auto-fires onComplete callback when countdown reaches zero.
 * @module @polaris/frontend/hooks
 *
 * @dependencies
 * - react (useEffect, useRef, useState, useCallback)
 *
 * @relatedFiles
 * - src/components/FocusMode.tsx
 * - src/hooks/useFocusSessions.ts
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TimerPhase = 'idle' | 'running' | 'paused' | 'break' | 'done';

export interface FocusTimerState {
  /** Current phase of the timer */
  phase:        TimerPhase;
  /** Seconds remaining in the current work interval */
  secondsLeft:  number;
  /** Total elapsed seconds (work only, excludes break time) */
  elapsedSecs:  number;
  /** Number of breaks taken */
  breaks:       number;
  /** Minutes actually worked (floor of elapsedSecs / 60) */
  minutesWorked: number;
}

export interface FocusTimerActions {
  start:       () => void;
  pause:       () => void;
  resume:      () => void;
  takeBreak:   () => void;
  endBreak:    () => void;
  /** Manually stop the timer — triggers onAbandon with elapsed minutes */
  stop:        () => void;
}

interface UseFocusTimerOptions {
  /** Planned duration in minutes */
  plannedMins:  number;
  /** Called when the timer reaches zero */
  onComplete:   (minutesWorked: number, breaks: number) => void;
  /** Called when stop() is triggered before timer reaches zero */
  onAbandon:    (minutesWorked: number, breaks: number) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Countdown timer with pause/resume, break tracking, and auto-complete.
 *
 * @example
 * const { state, actions } = useFocusTimer({ plannedMins: 25, onComplete, onAbandon });
 * actions.start(); // starts the countdown
 */
export function useFocusTimer({
  plannedMins,
  onComplete,
  onAbandon,
}: UseFocusTimerOptions): { state: FocusTimerState; actions: FocusTimerActions } {
  const totalSecs = plannedMins * 60;

  const [phase,       setPhase]       = useState<TimerPhase>('idle');
  const [secondsLeft, setSecondsLeft] = useState(totalSecs);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [breaks,      setBreaks]      = useState(0);

  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onAbandonRef  = useRef(onAbandon);

  // Keep callback refs up to date without re-registering the effect
  useEffect(() => { onCompleteRef.current = onComplete; });
  useEffect(() => { onAbandonRef.current  = onAbandon; });

  // Clear interval helper
  const clearTick = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Tick logic — runs once per second when phase === 'running'
  useEffect(() => {
    if (phase !== 'running') {
      clearTick();
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTick();
          setPhase('done');
          setElapsedSecs((e) => {
            const finalMins = Math.floor((e + 1) / 60);
            onCompleteRef.current(finalMins || plannedMins, breaks);
            return e + 1;
          });
          return 0;
        }
        return prev - 1;
      });
      setElapsedSecs((prev) => prev + 1);
    }, 1000);

    return clearTick;
  }, [phase, breaks, plannedMins, clearTick]);

  // Clean up on unmount
  useEffect(() => clearTick, [clearTick]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const start = useCallback(() => {
    if (phase !== 'idle') return;
    setPhase('running');
  }, [phase]);

  const pause = useCallback(() => {
    if (phase !== 'running') return;
    setPhase('paused');
  }, [phase]);

  const resume = useCallback(() => {
    if (phase !== 'paused') return;
    setPhase('running');
  }, [phase]);

  const takeBreak = useCallback(() => {
    if (phase !== 'running') return;
    setPhase('break');
    setBreaks((b) => b + 1);
  }, [phase]);

  const endBreak = useCallback(() => {
    if (phase !== 'break') return;
    setPhase('running');
  }, [phase]);

  const stop = useCallback(() => {
    if (phase === 'idle' || phase === 'done') return;
    clearTick();
    const minutesWorked = Math.floor(elapsedSecs / 60);
    setPhase('done');
    onAbandonRef.current(minutesWorked, breaks);
  }, [phase, elapsedSecs, breaks, clearTick]);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const minutesWorked = Math.floor(elapsedSecs / 60);

  return {
    state: {
      phase,
      secondsLeft,
      elapsedSecs,
      breaks,
      minutesWorked,
    },
    actions: {
      start,
      pause,
      resume,
      takeBreak,
      endBreak,
      stop,
    },
  };
}

// ---------------------------------------------------------------------------
// Helper: format seconds as MM:SS
// ---------------------------------------------------------------------------

/**
 * Formats a seconds value as "MM:SS" string for display.
 *
 * @example
 * formatTime(90) // "01:30"
 */
export function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
