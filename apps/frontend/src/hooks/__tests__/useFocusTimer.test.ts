/**
 * @file hooks/__tests__/useFocusTimer.test.ts
 * @description Unit tests for useFocusTimer.
 *   Pure countdown logic — no external dependencies.
 *   Uses vitest fake timers to control the clock.
 * @module @polaris/frontend/hooks/test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFocusTimer } from '../useFocusTimer.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCallbacks() {
  return {
    onComplete: vi.fn(),
    onAbandon:  vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useFocusTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it('starts in idle phase with full time remaining', () => {
    const { result } = renderHook(() =>
      useFocusTimer({ plannedMins: 25, ...makeCallbacks() })
    );
    const { state } = result.current;
    expect(state.phase).toBe('idle');
    expect(state.secondsLeft).toBe(25 * 60);
    expect(state.elapsedSecs).toBe(0);
    expect(state.breaks).toBe(0);
    expect(state.minutesWorked).toBe(0);
  });

  // ── start ──────────────────────────────────────────────────────────────────

  it('transitions to running on start()', () => {
    const { result } = renderHook(() =>
      useFocusTimer({ plannedMins: 25, ...makeCallbacks() })
    );

    act(() => { result.current.actions.start(); });

    expect(result.current.state.phase).toBe('running');
  });

  it('does nothing when start() called while already running', () => {
    const { result } = renderHook(() =>
      useFocusTimer({ plannedMins: 1, ...makeCallbacks() })
    );

    act(() => { result.current.actions.start(); });
    act(() => { result.current.actions.start(); }); // second call no-op

    expect(result.current.state.phase).toBe('running');
  });

  // ── pause / resume ─────────────────────────────────────────────────────────

  it('transitions to paused on pause()', () => {
    const { result } = renderHook(() =>
      useFocusTimer({ plannedMins: 25, ...makeCallbacks() })
    );

    act(() => { result.current.actions.start(); });
    act(() => { result.current.actions.pause(); });

    expect(result.current.state.phase).toBe('paused');
  });

  it('resumes to running after pause', () => {
    const { result } = renderHook(() =>
      useFocusTimer({ plannedMins: 25, ...makeCallbacks() })
    );

    act(() => { result.current.actions.start(); });
    act(() => { result.current.actions.pause(); });
    act(() => { result.current.actions.resume(); });

    expect(result.current.state.phase).toBe('running');
  });

  it('does not tick while paused', () => {
    const { result } = renderHook(() =>
      useFocusTimer({ plannedMins: 25, ...makeCallbacks() })
    );

    act(() => { result.current.actions.start(); });
    act(() => { vi.advanceTimersByTime(3000); }); // 3 s elapsed
    const secsAfterRun = result.current.state.elapsedSecs;

    act(() => { result.current.actions.pause(); });
    act(() => { vi.advanceTimersByTime(5000); }); // 5 s paused — should not count

    expect(result.current.state.elapsedSecs).toBe(secsAfterRun);
  });

  // ── break ──────────────────────────────────────────────────────────────────

  it('increments break count and sets phase=break on takeBreak()', () => {
    const { result } = renderHook(() =>
      useFocusTimer({ plannedMins: 25, ...makeCallbacks() })
    );

    act(() => { result.current.actions.start(); });
    act(() => { result.current.actions.takeBreak(); });

    expect(result.current.state.phase).toBe('break');
    expect(result.current.state.breaks).toBe(1);
  });

  it('returns to running after endBreak()', () => {
    const { result } = renderHook(() =>
      useFocusTimer({ plannedMins: 25, ...makeCallbacks() })
    );

    act(() => { result.current.actions.start(); });
    act(() => { result.current.actions.takeBreak(); });
    act(() => { result.current.actions.endBreak(); });

    expect(result.current.state.phase).toBe('running');
  });

  // ── stop ───────────────────────────────────────────────────────────────────

  it('calls onAbandon with minutesWorked on stop()', () => {
    const cbs = makeCallbacks();
    const { result } = renderHook(() =>
      useFocusTimer({ plannedMins: 25, ...cbs })
    );

    act(() => { result.current.actions.start(); });
    act(() => { vi.advanceTimersByTime(10 * 1000); }); // 10 s = 0 full minutes
    act(() => { result.current.actions.stop(); });

    expect(result.current.state.phase).toBe('done');
    expect(cbs.onAbandon).toHaveBeenCalledOnce();
    // 10 seconds → 0 minutes worked
    expect(cbs.onAbandon).toHaveBeenCalledWith(0, 0);
  });

  it('passes correct minutes and breaks to onAbandon', () => {
    const cbs = makeCallbacks();
    const { result } = renderHook(() =>
      useFocusTimer({ plannedMins: 25, ...cbs })
    );

    act(() => { result.current.actions.start(); });
    // Work 2 minutes
    act(() => { vi.advanceTimersByTime(2 * 60 * 1000); });
    // Take a break then come back
    act(() => { result.current.actions.takeBreak(); });
    act(() => { result.current.actions.endBreak(); });
    act(() => { result.current.actions.stop(); });

    const [mins, breaks] = cbs.onAbandon.mock.calls[0] as [number, number];
    expect(mins).toBe(2);
    expect(breaks).toBe(1);
  });

  // ── auto-complete ──────────────────────────────────────────────────────────

  it('fires onComplete when countdown reaches zero', () => {
    const cbs = makeCallbacks();
    const { result } = renderHook(() =>
      useFocusTimer({ plannedMins: 1, ...cbs }) // 1 minute = 60 s
    );

    act(() => { result.current.actions.start(); });
    act(() => { vi.advanceTimersByTime(60 * 1000); }); // advance full duration

    expect(result.current.state.phase).toBe('done');
    expect(cbs.onComplete).toHaveBeenCalledOnce();
  });

  it('passes minutesWorked and breaks to onComplete', () => {
    const cbs = makeCallbacks();
    const { result } = renderHook(() =>
      useFocusTimer({ plannedMins: 1, ...cbs })
    );

    act(() => { result.current.actions.start(); });
    act(() => { result.current.actions.takeBreak(); });
    act(() => { result.current.actions.endBreak(); });
    act(() => { vi.advanceTimersByTime(60 * 1000); });

    const [, breaks] = cbs.onComplete.mock.calls[0] as [number, number];
    expect(breaks).toBe(1);
  });

  it('seconds decrease over time while running', () => {
    const { result } = renderHook(() =>
      useFocusTimer({ plannedMins: 25, ...makeCallbacks() })
    );

    act(() => { result.current.actions.start(); });
    act(() => { vi.advanceTimersByTime(5000); }); // 5 seconds

    expect(result.current.state.secondsLeft).toBe(25 * 60 - 5);
  });

  it('minutesWorked reflects floor of elapsed seconds', () => {
    const { result } = renderHook(() =>
      useFocusTimer({ plannedMins: 25, ...makeCallbacks() })
    );

    act(() => { result.current.actions.start(); });
    act(() => { vi.advanceTimersByTime(90 * 1000); }); // 1.5 minutes

    expect(result.current.state.minutesWorked).toBe(1);
  });
});
