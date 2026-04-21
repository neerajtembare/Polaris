/**
 * @file components/FocusMode.tsx
 * @description Fullscreen Focus session component.
 *   Shows a countdown timer, goal selector, break tracking, and
 *   complete/abandon actions. Opens as a fixed overlay above the app.
 *   On complete: auto-logs an Activity. On abandon: logs partial time if > 2 min.
 * @module @polaris/frontend/components
 *
 * @dependencies
 * - hooks/useFocusTimer
 * - hooks/useFocusSessions
 * - hooks/useGoals
 * - motion/react
 *
 * @relatedFiles
 * - src/components/Hub.tsx
 * - src/hooks/useFocusTimer.ts
 * - src/hooks/useFocusSessions.ts
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Coffee,
  CheckCircle2,
  Clock,
  Flame,
  Loader2,
  Music,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFocusTimer, formatTime } from '@/hooks/useFocusTimer';
import {
  useStartFocusSession,
  useCompleteSession,
  useAbandonSession,
} from '@/hooks/useFocusSessions';
import { useGoals } from '@/hooks/useGoals';
import { useAudioPlayer, PRESET_STREAMS } from '@/stores/audioPlayer.store';
import type { Theme } from '@/types/navigation';
import type { FocusSession } from '@polaris/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FocusModeProps {
  theme:    Theme;
  /** Called when the user closes Focus Mode (after complete/abandon or X button) */
  onClose:  () => void;
  /** Pre-select a duration (minutes) when opened via TARS command */
  initialMins?:   number;
  /** Pre-select a goal ID when opened via TARS command */
  initialGoalId?: string;
}

// ---------------------------------------------------------------------------
// Preset durations
// ---------------------------------------------------------------------------

const DURATIONS = [15, 25, 45, 60] as const;

// ---------------------------------------------------------------------------
// Sub-component: Setup screen (before timer starts)
// ---------------------------------------------------------------------------

interface SetupProps {
  isDark:        boolean;
  selectedMins:  number;
  onSelectMins:  (m: number) => void;
  selectedGoalId: string;
  onSelectGoalId: (id: string) => void;
  goals:         Array<{ id: string; title: string }>;
  onStart:       () => void;
  isPending:     boolean;
  onClose:       () => void;
}

function FocusSetup({
  isDark,
  selectedMins,
  onSelectMins,
  selectedGoalId,
  onSelectGoalId,
  goals,
  onStart,
  isPending,
  onClose,
}: SetupProps) {
  return (
    <motion.div
      key="setup"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      className="flex flex-col items-center gap-8 w-full max-w-md mx-auto"
    >
      {/* Close */}
      <button
        onClick={onClose}
        className={cn(
          'absolute top-6 right-6 p-2 rounded-xl transition-all',
          isDark ? 'text-dark-on-surface-variant hover:bg-white/5' : 'text-on-surface-variant hover:bg-black/5'
        )}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Title */}
      <div className="text-center mt-8">
        <p className={cn('text-[10px] font-black uppercase tracking-[0.3em] mb-2', isDark ? 'text-dark-primary' : 'text-primary')}>
          Deep Work Protocol
        </p>
        <h2 className={cn('text-3xl font-black tracking-tight', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
          Focus Mode
        </h2>
      </div>

      {/* Duration selector */}
      <div className="w-full space-y-3">
        <p className={cn('text-[10px] font-black uppercase tracking-widest', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
          Duration
        </p>
        <div className="grid grid-cols-4 gap-2">
          {DURATIONS.map((mins) => (
            <button
              key={mins}
              onClick={() => onSelectMins(mins)}
              className={cn(
                'py-3 rounded-xl text-sm font-bold transition-all border',
                selectedMins === mins
                  ? isDark
                    ? 'bg-dark-primary/20 text-dark-primary border-dark-primary/40'
                    : 'bg-primary/10 text-primary border-primary/30'
                  : isDark
                  ? 'bg-white/3 text-dark-on-surface-variant border-white/10 hover:bg-white/8'
                  : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'
              )}
            >
              {mins}m
            </button>
          ))}
        </div>
        {/* Custom duration slider */}
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={5}
            max={120}
            step={5}
            value={selectedMins}
            onChange={(e) => onSelectMins(Number(e.target.value))}
            className="flex-1 accent-current"
          />
          <span className={cn('text-sm font-black w-12 text-right', isDark ? 'text-dark-primary' : 'text-primary')}>
            {selectedMins}m
          </span>
        </div>
      </div>

      {/* Goal selector */}
      <div className="w-full space-y-3">
        <p className={cn('text-[10px] font-black uppercase tracking-widest', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
          Linked Goal (optional)
        </p>
        <select
          value={selectedGoalId}
          onChange={(e) => onSelectGoalId(e.target.value)}
          className={cn(
            'w-full rounded-xl px-4 py-3 text-sm font-medium border transition-all focus:outline-none focus:ring-2',
            isDark
              ? 'bg-white/5 border-white/10 text-dark-on-surface focus:ring-dark-primary/30'
              : 'bg-surface-container-low border-outline-variant/20 text-on-surface focus:ring-primary/20'
          )}
        >
          <option value="">— No goal —</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>{g.title}</option>
          ))}
        </select>
      </div>

      {/* Start button */}
      <button
        onClick={onStart}
        disabled={isPending}
        className={cn(
          'w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 shadow-xl active:scale-98 transition-all',
          isDark ? 'plasma-gradient text-dark-bg' : 'signature-gradient text-white',
          isPending && 'opacity-60 cursor-not-allowed'
        )}
      >
        {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
        Start Session
      </button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Timer screen (during session)
// ---------------------------------------------------------------------------

interface TimerProps {
  isDark:       boolean;
  session:      FocusSession;
  plannedMins:  number;
  onComplete:   () => void;
  onAbandon:    () => void;
}

function FocusTimer({ isDark, session, plannedMins, onComplete, onAbandon }: TimerProps) {
  const completeSession = useCompleteSession();
  const abandonSession  = useAbandonSession();

  const handleComplete = useCallback((minutesWorked: number, breaks: number) => {
    completeSession.mutate(
      { id: session.id, input: { actualMins: minutesWorked, breaks, autoLogActivity: true } },
      { onSuccess: onComplete }
    );
  }, [session.id, completeSession, onComplete]);

  const handleAbandon = useCallback((minutesWorked: number, breaks: number) => {
    abandonSession.mutate(
      { id: session.id, input: { actualMins: minutesWorked } },
      { onSuccess: onAbandon }
    );
    void breaks; // breaks are tracked server-side by the PATCH on break events
  }, [session.id, abandonSession, onAbandon]);

  const { state, actions } = useFocusTimer({
    plannedMins,
    onComplete: handleComplete,
    onAbandon:  handleAbandon,
  });

  const progressPct = Math.max(0, Math.min(100, ((plannedMins * 60 - state.secondsLeft) / (plannedMins * 60)) * 100));
  const circumference = 2 * Math.PI * 120; // r = 120

  return (
    <motion.div
      key="timer"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col items-center gap-8 w-full max-w-md mx-auto"
    >
      {/* Abandon button */}
      <button
        onClick={actions.stop}
        disabled={abandonSession.isPending}
        className={cn(
          'absolute top-6 right-6 p-2 rounded-xl transition-all',
          isDark ? 'text-dark-on-surface-variant hover:bg-white/5' : 'text-on-surface-variant hover:bg-black/5'
        )}
        title="Abandon session"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Phase indicator */}
      <div className="mt-8 text-center">
        <span className={cn(
          'inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full border',
          state.phase === 'break'
            ? isDark ? 'bg-amber-400/10 border-amber-400/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'
            : state.phase === 'done'
            ? isDark ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
            : isDark ? 'bg-dark-primary/10 border-dark-primary/30 text-dark-primary' : 'bg-primary/10 border-primary/20 text-primary'
        )}>
          {state.phase === 'break'   && <><Coffee className="w-3 h-3" /> Break</>}
          {state.phase === 'done'    && <><CheckCircle2 className="w-3 h-3" /> Complete</>}
          {state.phase === 'running' && <><Flame className="w-3 h-3" /> In Focus</>}
          {state.phase === 'paused'  && <><Pause className="w-3 h-3" /> Paused</>}
          {state.phase === 'idle'    && <><Clock className="w-3 h-3" /> Ready</>}
        </span>
      </div>

      {/* Circular progress ring + time */}
      <div className="relative flex items-center justify-center w-full max-w-[280px]">
        <svg viewBox="0 0 280 280" className="w-full h-auto -rotate-90">
          {/* Background ring */}
          <circle
            cx="140" cy="140" r="120"
            fill="none"
            stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
            strokeWidth="8"
          />
          {/* Progress ring */}
          <motion.circle
            cx="140" cy="140" r="120"
            fill="none"
            stroke={isDark ? '#81ecff' : '#0058be'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progressPct / 100)}
            style={{ filter: isDark ? 'drop-shadow(0 0 8px rgba(129,236,255,0.6))' : undefined }}
            transition={{ duration: 0.5, ease: 'linear' }}
          />
        </svg>
        {/* Time display */}
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <span className={cn(
            'text-5xl font-black tracking-tighter tabular-nums',
            isDark ? 'text-dark-on-surface' : 'text-on-surface'
          )}>
            {formatTime(state.secondsLeft)}
          </span>
          <p className={cn('text-xs font-medium mt-1 opacity-50', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
            {plannedMins}m session
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-8">
        <div className="text-center">
          <p className={cn('text-2xl font-black tracking-tight', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
            {state.minutesWorked}
          </p>
          <p className={cn('text-[10px] font-bold uppercase tracking-widest opacity-50', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
            min worked
          </p>
        </div>
        <div className="text-center">
          <p className={cn('text-2xl font-black tracking-tight', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
            {state.breaks}
          </p>
          <p className={cn('text-[10px] font-bold uppercase tracking-widest opacity-50', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
            breaks
          </p>
        </div>
      </div>

      {/* Controls */}
      {state.phase !== 'done' && (
        <div className="flex items-center gap-4">
          {/* Start (idle) */}
          {state.phase === 'idle' && (
            <button
              onClick={actions.start}
              className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95',
                isDark ? 'plasma-gradient text-dark-bg' : 'signature-gradient text-white'
              )}
            >
              <Play className="w-7 h-7 ml-0.5" />
            </button>
          )}

          {/* Pause / Resume */}
          {(state.phase === 'running' || state.phase === 'paused') && (
            <button
              onClick={state.phase === 'running' ? actions.pause : actions.resume}
              className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95',
                isDark ? 'plasma-gradient text-dark-bg' : 'signature-gradient text-white'
              )}
            >
              {state.phase === 'running'
                ? <Pause className="w-7 h-7" />
                : <Play  className="w-7 h-7 ml-0.5" />}
            </button>
          )}

          {/* Break toggle */}
          {state.phase === 'running' && (
            <button
              onClick={actions.takeBreak}
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 border',
                isDark ? 'bg-white/5 border-white/10 text-dark-on-surface-variant hover:bg-white/10' : 'bg-surface-container-low border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high'
              )}
              title="Take a break"
            >
              <Coffee className="w-5 h-5" />
            </button>
          )}

          {/* End break */}
          {state.phase === 'break' && (
            <button
              onClick={actions.endBreak}
              className={cn(
                'px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all',
                isDark ? 'bg-dark-primary/20 text-dark-primary hover:bg-dark-primary/30' : 'bg-primary/10 text-primary hover:bg-primary/20'
              )}
            >
              <RotateCcw className="w-4 h-4" /> Back to work
            </button>
          )}
        </div>
      )}

      {/* Done state */}
      {state.phase === 'done' && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <p className={cn('text-lg font-black', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
            {completeSession.isPending || abandonSession.isPending ? 'Logging...' : 'Session logged ✓'}
          </p>
          {(completeSession.isPending || abandonSession.isPending) && (
            <Loader2 className={cn('w-6 h-6 animate-spin mx-auto', isDark ? 'text-dark-primary' : 'text-primary')} />
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Audio strip at the bottom of FocusMode
// ---------------------------------------------------------------------------

function FocusAudioStrip({ isDark }: { isDark: boolean }) {
  const {
    currentStream,
    isPlaying,
    togglePlay,
    selectStream,
  } = useAudioPlayer();

  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10 pointer-events-none">
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 rounded-2xl border backdrop-blur-xl shadow-xl pointer-events-auto',
          isDark
            ? 'bg-dark-surface/80 border-white/10'
            : 'bg-white/80 border-black/5'
        )}
      >
        {/* Stream name or picker prompt */}
        <button
          onClick={() => setShowPicker((v) => !v)}
          className={cn(
            'flex items-center gap-2 text-xs font-medium transition-colors',
            isDark ? 'text-dark-on-surface-variant hover:text-dark-primary' : 'text-on-surface-variant hover:text-primary'
          )}
        >
          <Music className="w-3.5 h-3.5 shrink-0" />
          <span className="max-w-[120px] truncate">
            {currentStream ? `${currentStream.emoji} ${currentStream.label}` : 'No audio'}
          </span>
        </button>

        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          disabled={!currentStream}
          className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90',
            !currentStream && 'opacity-40 cursor-not-allowed',
            isDark
              ? 'bg-dark-primary/20 text-dark-primary hover:bg-dark-primary/30'
              : 'bg-primary/10 text-primary hover:bg-primary/20'
          )}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        {/* Inline stream picker */}
        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute bottom-14 left-1/2 -translate-x-1/2 w-52 rounded-2xl border shadow-2xl overflow-hidden',
                isDark ? 'bg-dark-surface/95 backdrop-blur-xl border-white/10' : 'bg-white/95 backdrop-blur-xl border-black/5'
              )}
            >
              <div className="p-1.5 space-y-0.5">
                <button
                  onClick={() => { selectStream(null); setShowPicker(false); }}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition-all',
                    !currentStream
                      ? isDark ? 'bg-dark-primary/15 text-dark-primary' : 'bg-primary/10 text-primary'
                      : isDark ? 'hover:bg-white/5 text-dark-on-surface-variant' : 'hover:bg-black/5 text-on-surface-variant'
                  )}
                >
                  🔇 Silence / Off
                </button>
                {PRESET_STREAMS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { selectStream(s); setShowPicker(false); }}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition-all',
                      currentStream?.id === s.id
                        ? isDark ? 'bg-dark-primary/15 text-dark-primary' : 'bg-primary/10 text-primary'
                        : isDark ? 'hover:bg-white/5 text-dark-on-surface-variant' : 'hover:bg-black/5 text-on-surface-variant'
                    )}
                  >
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main overlay component
// ---------------------------------------------------------------------------

/**
 * Fullscreen Focus Mode overlay. Renders:
 * 1. Setup screen — pick duration + goal
 * 2. Timer screen — countdown, break button, progress ring
 * 3. Post-session — auto-closes after logging
 */
export function FocusMode({ theme, onClose, initialMins, initialGoalId }: FocusModeProps) {
  const isDark = theme === 'dark';

  const [selectedMins,   setSelectedMins]   = useState<number>(initialMins ?? 25);
  const [selectedGoalId, setSelectedGoalId] = useState(initialGoalId ?? '');
  const [activeSession,  setActiveSession]  = useState<FocusSession | null>(null);

  // Apply TARS-provided initial values when the overlay opens
  useEffect(() => {
    if (initialMins !== undefined) setSelectedMins(initialMins);
    if (initialGoalId !== undefined) setSelectedGoalId(initialGoalId);
  }, [initialMins, initialGoalId]);

  const startSession = useStartFocusSession();
  const { data: goals = [] } = useGoals({ status: 'active' });

  const handleStart = () => {
    startSession.mutate(
      {
        plannedMins:  selectedMins,
        ...(selectedGoalId ? { goalId: selectedGoalId } : {}),
      },
      { onSuccess: (session) => setActiveSession(session) }
    );
  };

  const handleComplete = useCallback(() => {
    setTimeout(onClose, 1500);
  }, [onClose]);

  const handleAbandon = useCallback(() => {
    setTimeout(onClose, 1500);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'fixed inset-0 z-[200] flex items-center justify-center overflow-hidden',
        isDark ? 'bg-gray-950' : 'bg-white'
      )}
    >
      {/* Ambient background glow */}
      {isDark && (
        <>
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-dark-primary/5 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-dark-secondary/5 blur-[120px] pointer-events-none" />
        </>
      )}

      {/* Audio strip ─ bottom of overlay */}
      <FocusAudioStrip isDark={isDark} />

      <div className="relative w-full h-full flex items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {activeSession === null ? (
            <FocusSetup
              key="setup"
              isDark={isDark}
              selectedMins={selectedMins}
              onSelectMins={setSelectedMins}
              selectedGoalId={selectedGoalId}
              onSelectGoalId={setSelectedGoalId}
              goals={goals}
              onStart={handleStart}
              isPending={startSession.isPending}
              onClose={onClose}
            />
          ) : (
            <FocusTimer
              key="timer"
              isDark={isDark}
              session={activeSession}
              plannedMins={selectedMins}
              onComplete={handleComplete}
              onAbandon={handleAbandon}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
