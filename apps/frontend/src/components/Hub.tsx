/**
 * @file components/Hub.tsx
 * @description Primary dashboard screen with clock display, AI activity input,
 *   live streak/metrics cards, and today's activity feed.
 *   All data fetched from backend via TanStack Query hooks.
 * @module @polaris/frontend/components
 *
 * @dependencies
 * - hooks/useActivities, useMetrics, useAiParse
 * - components/ui/ReactiveCard
 * - motion/react
 *
 * @relatedFiles
 * - components/Layout.tsx
 * - hooks/useAiParse.ts
 * - hooks/useActivities.ts
 * - hooks/useMetrics.ts
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Loader2,
  Flame,
  Target,
  Activity,
  ChevronRight,
  BarChart2,
  Dumbbell,
  BookOpen,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import ReactiveCard from './ui/ReactiveCard';
import { useMetrics } from '@/hooks/useMetrics';
import { useGoals } from '@/hooks/useGoals';
import { useTodayActivities } from '@/hooks/useActivities';
import { useActivityInput } from '@/hooks/use-activity-input';
import { ParsedActivityCard } from '@/components/activities/ParsedActivityCard';
import { GoalSuggestionCard } from '@/components/activities/GoalSuggestionCard';
import { TodayKanban } from '@/components/activities/TodayKanban';
import { IntentionsPanel } from '@/components/IntentionsPanel';
import type { Theme, ScreenId } from '@/types/navigation';
import toast from 'react-hot-toast';

// ── SpeechRecognition type shim (not in lib.dom.d.ts by default) ─────────────
interface ISpeechRecognition extends EventTarget {
  continuous:     boolean;
  interimResults: boolean;
  lang:           string;
  start():        void;
  stop():         void;
  abort():        void;
  onstart:        ((this: ISpeechRecognition, ev: Event) => void) | null;
  onend:          ((this: ISpeechRecognition, ev: Event) => void) | null;
  onerror:        ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult:       ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
}
interface SpeechRecognitionErrorEvent extends Event { error: string; }
interface SpeechRecognitionAlternative { transcript: string; }
interface SpeechRecognitionResult { readonly 0: SpeechRecognitionAlternative | undefined; }
interface SpeechRecognitionEvent extends Event { readonly results: ArrayLike<SpeechRecognitionResult>; }
declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  }
}



interface HubProps {
  theme: Theme;
  onNavigate:   (screen: ScreenId, transition?: 'none' | 'push') => void;
  onStartFocus: () => void;
}

/** Format the current time HH:MM */
function useClock() {
  const [time, setTime] = useState(() => format(new Date(), 'HH:mm'));
  const [dateStr] = useState(() => format(new Date(), 'EEEE, MMMM d'));

  useEffect(() => {
    const id = setInterval(() => setTime(format(new Date(), 'HH:mm')), 30_000);
    return () => clearInterval(id);
  }, []);

  return { time, dateStr };
}

export default function Hub({ theme, onNavigate, onStartFocus }: HubProps) {
  const isDark = theme === 'dark';
  const { time, dateStr } = useClock();

  // Input state
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  // Stop recognition on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.abort(); };
  }, []);

  // Central parse → confirm → save logic (same hook as SmartInputBar)
  const {
    parsedResult,
    isAiParsing,
    isSaving,
    goals,
    handleSubmitInput,
    handleSave,
    handleCreateGoal,
    handleLogAsActivity,
    handleDismiss,
  } = useActivityInput({
    onNavigateToGoalCreate: (params) => {
      onNavigate('Goals', 'push');
      toast(`Goal suggestion: ${params.get('title') ?? ''}`, { icon: '🎯' });
    },
  });

  const isLogging = isAiParsing || isSaving;

  // Speech-to-text: transcribes into input field — user reviews, then submits
  const handleMicClick = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) {
      toast.error('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;
    recognition.onstart  = () => setIsListening(true);
    recognition.onend    = () => setIsListening(false);
    recognition.onerror  = (e: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      if (e.error !== 'aborted') toast.error(`Voice error: ${e.error}`);
    };
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0]?.[0]?.transcript ?? '';
      if (transcript) setInputValue((prev) => prev ? `${prev} ${transcript}` : transcript);
    };
    recognition.start();
  }, [isListening]);

  const handleLog = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isLogging) return;
    void handleSubmitInput(text);
    setInputValue('');
  }, [inputValue, isLogging, handleSubmitInput]);

  const { data: todayData } = useTodayActivities();
  const { data: metrics } = useMetrics('week');
  const { data: goalsData } = useGoals({ status: 'active', includeProgress: true });

  // Derived metrics
  const streak = metrics?.currentStreak ?? 0;
  const longestStreak = metrics?.longestStreak ?? 0;
  const completedToday = todayData?.completed?.length ?? 0;
  const plannedToday = todayData?.planned?.length ?? 0;
  const streakAtRisk = streak > 0 && completedToday === 0;

  // Weekly bar chart — activityByDay is a Record<YYYY-MM-DD, number>
  const rawBars: number[] = metrics?.activityByDay
    ? Object.values(metrics.activityByDay).slice(-7)
    : [];
  const weeklyBars: number[] = rawBars.length > 0
    ? rawBars
    : [60, 80, 40, 95, 70, 85, 100]; // sample bars when no data
  const maxBar = Math.max(...weeklyBars, 1);

  // Sample goals fallback (show when no real goals available)
  const sampleGoals = [
    { id: 's1', title: isDark ? 'Neural Network Training' : 'Product Launch Phase 1', progress: 72, color: isDark ? 'plasma-gradient' : 'signature-gradient', Icon: Target },
    { id: 's2', title: isDark ? 'Cognitive Flow Optimization' : 'Marathon Training',   progress: 45, color: isDark ? 'bg-gradient-to-r from-dark-secondary to-purple-400' : 'bg-gradient-to-r from-purple-500 to-indigo-500', Icon: Dumbbell },
    { id: 's3', title: isDark ? 'System Latency Reduction'   : 'Read 24 Books',        progress: 50, color: isDark ? 'bg-gradient-to-r from-dark-tertiary to-blue-400'   : 'bg-gradient-to-r from-blue-500 to-cyan-500', Icon: BookOpen },
  ] as const;

  const displayGoals = (goalsData && goalsData.length > 0)
    ? goalsData.slice(0, 3).map((g, i) => ({
        id: g.id,
        title: g.title,
        progress: g.progress ? Math.round((g.progress.currentValue / (g.progress.targetValue || 1)) * 100) : 0,
        color: sampleGoals[i % 3]?.color ?? 'signature-gradient',
        Icon: sampleGoals[i % 3]?.Icon ?? Target,
      }))
    : sampleGoals;

  return (
    <div className="px-4 md:px-12 max-w-7xl mx-auto relative">
      {/* ── Hero: Clock + AI Input ──────────────────────────────────── */}
      <section className="flex flex-col items-center mb-12 md:mb-16 text-center relative py-8 md:py-12">
        {/* Live Clock */}
        <div className="mb-4 relative z-10">
          <h1
            className={cn(
              'text-[4rem] sm:text-[6rem] md:text-[8rem] font-black tracking-tighter leading-none drop-shadow-2xl',
              isDark ? 'text-dark-on-surface' : 'text-on-surface'
            )}
          >
            {time}
          </h1>
          <p
            className={cn(
              'font-medium tracking-[0.2em] uppercase text-xs md:text-sm mt-2',
              isDark ? 'text-dark-primary' : 'text-primary'
            )}
          >
            {dateStr}
          </p>
        </div>

        {/* AI Input */}
        <div className="w-full max-w-2xl mt-8 md:mt-12 relative z-10">
          <div
            className={cn(
              'relative rounded-xl p-1 flex items-center border transition-all focus-within:ring-2 backdrop-blur-md',
              isDark
                ? 'bg-dark-surface-container-lowest/80 border-white/10 focus-within:ring-dark-primary/20'
                : 'bg-surface-container-lowest/80 border-outline-variant/10 focus-within:ring-primary/20'
            )}
          >
            <button
              type="button"
              onClick={handleMicClick}
              aria-label={isListening ? 'Stop listening' : 'Start voice input'}
              className={cn(
                'px-3 md:px-4 py-1 rounded-lg transition-all active:scale-90 shrink-0',
                isListening && 'animate-pulse'
              )}
            >
              {isListening
                ? <MicOff className={cn('w-5 h-5 md:w-6 md:h-6', isDark ? 'text-dark-primary' : 'text-primary')} />
                : <Mic    className={cn('w-5 h-5 md:w-6 md:h-6 opacity-60 hover:opacity-100', isDark ? 'text-dark-primary' : 'text-primary')} />}
            </button>
            <input
              className={cn(
                'w-full bg-transparent border-none focus:ring-0 text-base md:text-lg py-3 md:py-4 placeholder:opacity-40 font-medium',
                isDark ? 'text-dark-on-surface' : 'text-on-surface'
              )}
              placeholder={isDark ? 'Initialize command or log vitals...' : 'What did you achieve today?'}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLog()}
              disabled={isLogging}
            />
            <button
              onClick={handleLog}
              disabled={isLogging || !inputValue.trim()}
              className={cn(
                'px-4 md:px-6 py-2 md:py-3 rounded-lg font-bold text-xs md:text-sm mr-1 shadow-sm active:scale-95 transition-all flex items-center gap-2 min-w-[72px] justify-center',
                isDark ? 'plasma-gradient text-dark-bg' : 'signature-gradient text-white',
                (isLogging || !inputValue.trim()) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isLogging ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log'}
            </button>
          </div>

          {/* Parsed result / confirm card — shown after user submits text */}
          <AnimatePresence mode="wait">
            {parsedResult && parsedResult.intent === 'create_goal' ? (
              <motion.div
                key="goal-suggestion"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4"
              >
                <GoalSuggestionCard
                  title={parsedResult.title}
                  value={parsedResult.value}
                  unit={parsedResult.unit}
                  onCreateGoal={handleCreateGoal}
                  onLogAsActivity={handleLogAsActivity}
                  onDismiss={handleDismiss}
                />
              </motion.div>
            ) : parsedResult ? (
              <motion.div
                key="parsed-card"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4"
              >
                {isAiParsing && (
                  <p className={cn('text-xs mb-2 text-center', isDark ? 'text-dark-primary/70' : 'text-primary/70')}>
                    ✨ AI refining…
                  </p>
                )}
                <ParsedActivityCard
                  parsed={parsedResult}
                  goals={goals}
                  onSave={(fields) => void handleSave(fields)}
                  onDismiss={handleDismiss}
                  isSaving={isSaving}
                />
              </motion.div>
            ) : (
              <motion.p
                key="hint"
                className={cn(
                  'text-xs mt-4 font-medium transition-colors text-center',
                  isDark ? 'text-dark-on-surface-variant/60' : 'text-on-surface-variant/60'
                )}
              >
                Try: "Ran 5km in 26 mins" or "Read 30 pages of Deep Work"
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── Focus Mode CTA ──────────────────────────────────────────── */}
      <div className="flex justify-center mb-4 relative z-10">
        <button
          onClick={onStartFocus}
          className={cn(
            'flex items-center gap-3 px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all border',
            isDark
              ? 'bg-dark-primary/10 border-dark-primary/20 text-dark-primary hover:bg-dark-primary/20'
              : 'bg-primary/5 border-primary/20 text-primary hover:bg-primary/10'
          )}
        >
          <Activity className={cn('w-4 h-4', isDark ? 'text-dark-primary' : 'text-primary')} />
          {isDark ? 'Enter Focus Mode' : 'Start Focus Session'}
        </button>
      </div>

      {/* ── Bento Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 relative z-10">

        {/* ── Streak / Self-Mastery Card (col 4) ───────────────────── */}
        <ReactiveCard isDark={isDark} className="md:col-span-4 flex flex-col justify-between">
          {/* Ambient glow when streak is active */}
          {streak > 0 && isDark && (
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-orange-500/10 blur-[80px] pointer-events-none" />
          )}
          <div className="relative z-10">
            <h3
              className={cn(
                'text-[10px] font-bold tracking-[0.3em] uppercase mb-6 md:mb-8',
                isDark ? 'text-dark-primary' : 'text-primary'
              )}
            >
              {isDark ? 'Self-Mastery Index' : 'Activity Streak'}
            </h3>
            {/* Main streak number */}
            <div className="flex items-end gap-3">
              <Flame
                className={cn(
                  'w-10 h-10 md:w-12 md:h-12 mb-1 transition-all',
                  streak > 0
                    ? streakAtRisk
                      ? 'text-amber-400 opacity-60'
                      : 'text-orange-400 drop-shadow-[0_0_12px_rgba(251,146,60,0.7)]'
                    : 'opacity-15',
                  !isDark && streak > 0 && !streakAtRisk && 'text-orange-500'
                )}
              />
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    'text-6xl md:text-7xl font-black tracking-tighter',
                    streak > 0
                      ? isDark
                        ? 'text-dark-on-surface drop-shadow-[0_0_15px_rgba(129,236,255,0.3)]'
                        : 'text-on-surface'
                      : isDark ? 'text-dark-on-surface-variant/30' : 'text-on-surface-variant/30'
                  )}
                >
                  {streak}
                </span>
                <span
                  className={cn('text-lg md:text-xl font-bold', isDark ? 'text-dark-primary' : 'text-on-surface-variant')}
                >
                  {isDark ? 'Cycles' : 'days'}
                </span>
              </div>
            </div>

            {/* Streak-at-risk warning */}
            {streakAtRisk && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'mt-3 flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl border',
                  isDark
                    ? 'bg-amber-400/10 border-amber-400/30 text-amber-400'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                )}
              >
                <Flame className="w-3.5 h-3.5 animate-pulse" />
                Log today to keep your streak alive!
              </motion.div>
            )}

            {/* Today's progress + longest streak */}
            <div className="mt-4 flex items-center justify-between">
              <p
                className={cn(
                  'text-sm leading-relaxed opacity-70',
                  isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
                )}
              >
                {completedToday > 0
                  ? `${completedToday} done today`
                  : streak > 0
                    ? 'Nothing logged yet today'
                    : 'Start your streak today'}
              </p>
              {longestStreak > 0 && (
                <span
                  className={cn(
                    'text-[10px] font-black uppercase tracking-widest opacity-40',
                    isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
                  )}
                >
                  Best: {longestStreak}d
                </span>
              )}
            </div>
          </div>
          {/* Weekly bar chart */}
          <div className="mt-8 flex gap-2 overflow-hidden h-20 md:h-24">
            {weeklyBars.map((count, i) => (
              <div
                key={i}
                className={cn('flex-1 rounded-xl flex items-end p-1', isDark ? 'bg-white/5' : 'bg-primary/5')}
              >
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(count / maxBar) * 100}%` }}
                  transition={{ duration: 1, delay: i * 0.1 }}
                  className={cn(
                    'w-full rounded-lg',
                    isDark ? 'plasma-gradient shadow-[0_0_10px_rgba(129,236,255,0.4)]' : 'signature-gradient'
                  )}
                />
              </div>
            ))}
          </div>
        </ReactiveCard>

        {/* ── Momentum Spline (col 8) ───────────────────────────────── */}
        <ReactiveCard isDark={isDark} className="md:col-span-8 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h3
              className={cn(
                'text-[10px] font-bold tracking-[0.3em] uppercase',
                isDark ? 'text-dark-primary' : 'text-primary'
              )}
            >
              {isDark ? 'Activity Momentum' : 'Momentum Spline'}
            </h3>
            <span className={cn('text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded', isDark ? 'bg-dark-primary/20 text-dark-primary' : 'bg-primary/10 text-primary')}>
              Live
            </span>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-center">
            {/* Option A: Velocity Spline */}
            <div className="w-full relative">
              <p className={cn('text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 text-center', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
                Option A: Velocity Spline
              </p>
              <div className="h-32 w-full relative">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 100">
                  <defs>
                    <linearGradient id="splineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={isDark ? '#81ecff' : '#0058be'} stopOpacity="0.1" />
                      <stop offset="50%" stopColor={isDark ? '#81ecff' : '#0058be'} stopOpacity="1" />
                      <stop offset="100%" stopColor={isDark ? '#c280ff' : '#2170e4'} stopOpacity="1" />
                    </linearGradient>
                  </defs>
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: 'easeInOut' }}
                    d="M0,80 C100,80 150,20 250,40 C350,60 400,10 500,30"
                    fill="none"
                    stroke="url(#splineGrad)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    style={{ filter: isDark ? 'drop-shadow(0px 0px 8px rgba(129,236,255,0.5))' : 'none' }}
                  />
                  <circle cx="250" cy="40" r="4" fill={isDark ? '#81ecff' : '#0058be'} className="animate-pulse" />
                  <circle cx="500" cy="30" r="4" fill={isDark ? '#c280ff' : '#2170e4'} className="animate-pulse" />
                </svg>
              </div>
            </div>

            {/* Option B: Orbital Radar */}
            <div className="w-full relative flex flex-col items-center">
              <p className={cn('text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 text-center', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
                Option B: Orbital Radar
              </p>
              <div className="h-32 w-32 relative flex items-center justify-center">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="20" fill="none" stroke={isDark ? '#81ecff' : '#0058be'} strokeWidth="1" strokeOpacity="0.2" />
                  <circle cx="50" cy="50" r="35" fill="none" stroke={isDark ? '#81ecff' : '#0058be'} strokeWidth="1" strokeOpacity="0.4" strokeDasharray="4 4" />
                  <circle cx="50" cy="50" r="50" fill="none" stroke={isDark ? '#81ecff' : '#0058be'} strokeWidth="1" strokeOpacity="0.1" />
                  <motion.circle
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    style={{ transformOrigin: '50px 50px' }}
                    cx="50" cy="15" r="3" fill={isDark ? '#81ecff' : '#0058be'}
                  />
                  <motion.circle
                    animate={{ rotate: -360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                    style={{ transformOrigin: '50px 50px' }}
                    cx="85" cy="50" r="2" fill={isDark ? '#c280ff' : '#2170e4'}
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="mt-6 md:mt-8 pt-6 border-t border-current opacity-10 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <BarChart2 className={cn('w-4 h-4', isDark ? 'text-dark-primary' : 'text-primary')} />
              <div>
                <p className={cn('text-xs font-bold', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>Deep Work Focus</p>
                <p className={cn('text-[10px] opacity-60', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
                  {metrics?.completedActivities ? `${metrics.completedActivities} completed this week` : 'Average 4.2h / day'}
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('Insights', 'push')}
              className={cn(
                'font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all',
                isDark ? 'bg-white/5 text-dark-primary hover:bg-white/10' : 'bg-primary/5 text-primary hover:bg-primary/10'
              )}
            >
              Telemetry
            </button>
          </div>
        </ReactiveCard>

        {/* ── Today's Mission Log / Kanban (col 8) ─────────────────── */}
        <ReactiveCard isDark={isDark} className="md:col-span-8">
          <TodayKanban isDark={isDark} />
        </ReactiveCard>

        {/* ── Daily Intentions (col 4) ──────────────────────────────── */}
        <ReactiveCard isDark={isDark} className="md:col-span-4">
          <IntentionsPanel isDark={isDark} theme={theme} />
        </ReactiveCard>

        {/* ── Active Goal Progress (col 12) ────────────────────────── */}
        <ReactiveCard isDark={isDark} className="md:col-span-12">
          <div className="flex justify-between items-center mb-8 md:mb-10">
            <h3
              className={cn(
                'text-[10px] font-bold tracking-[0.3em] uppercase',
                isDark ? 'text-dark-primary' : 'text-primary'
              )}
            >
              {isDark ? 'Strategic Alignment' : 'Active Goal Progress'}
            </h3>
            <button
              onClick={() => onNavigate('Goals', 'push')}
              className={cn(
                'text-[10px] font-bold uppercase tracking-widest flex items-center hover:opacity-80 transition-all',
                isDark ? 'text-dark-primary' : 'text-primary'
              )}
            >
              Matrix <ChevronRight className="ml-1 w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-10">
            {displayGoals.map((goal, i) => (
              <div key={goal.id} className="space-y-3 md:space-y-4 group cursor-pointer">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className={cn(
                      'p-1.5 rounded-lg transition-all group-hover:scale-110',
                      isDark ? 'bg-white/5 text-dark-primary' : 'bg-primary/5 text-primary'
                    )}>
                      <goal.Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </div>
                    <span className={cn('font-bold text-xs md:text-sm', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
                      {goal.title}
                    </span>
                  </div>
                  <span className={cn('text-[10px] md:text-xs font-black', isDark ? 'text-dark-primary' : 'text-primary')}>
                    {goal.progress}%
                  </span>
                </div>
                <div className={cn('w-full h-1.5 md:h-2 rounded-full overflow-hidden', isDark ? 'bg-white/5' : 'bg-surface-container-high')}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${goal.progress}%` }}
                    transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 + i * 0.2 }}
                    className={cn('h-full rounded-full', goal.color)}
                  />
                </div>
              </div>
            ))}
          </div>
        </ReactiveCard>

      </div>
    </div>
  );
}
