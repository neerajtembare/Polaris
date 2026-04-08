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

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Loader2,
  CheckCircle2,
  Flame,
  Target,
  Activity,
  ChevronRight,
  Plus,
  BarChart2,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import ReactiveCard from './ui/ReactiveCard';
import { useAiParse } from '@/hooks/useAiParse';
import { useCreateActivity, useTodayActivities } from '@/hooks/useActivities';
import { useMetrics } from '@/hooks/useMetrics';
import type { Theme, ScreenId } from '@/types/navigation';
import toast from 'react-hot-toast';

interface HubProps {
  theme: Theme;
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
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

export default function Hub({ theme, onNavigate }: HubProps) {
  const isDark = theme === 'dark';
  const { time, dateStr } = useClock();

  // Input state
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; provider: string } | null>(null);

  // Hooks
  const { aiParse, isLoading: isParsingAi } = useAiParse();
  const createActivity = useCreateActivity();
  const { data: todayData } = useTodayActivities();
  const { data: metrics } = useMetrics('week');

  const isLogging = isParsingAi || createActivity.isPending;

  const handleLog = async () => {
    const text = inputValue.trim();
    if (!text || isLogging) return;

    try {
      // AI parse (falls back silently on error)
      const aiResult = await aiParse(text);

      const title = aiResult?.title ?? text;
      const activityType = aiResult?.activityType ?? 'completion';
      const value = aiResult?.value ?? null;
      const unit = aiResult?.unit ?? null;
      const goalId = aiResult?.goalId ?? undefined;

      await createActivity.mutateAsync({
        title,
        activityType,
        ...(value != null ? { value } : {}),
        ...(unit != null ? { unit } : {}),
        ...(goalId ? { goalId } : {}),
        status: 'completed',
        activityDate: format(new Date(), 'yyyy-MM-dd'),
      });

      setFeedback({
        message: aiResult
          ? `Logged: "${title}"${aiResult.provider !== 'mock' ? ` via ${aiResult.provider}` : ''}`
          : `Logged: "${title}"`,
        provider: aiResult?.provider ?? 'local',
      });
      setInputValue('');
      setTimeout(() => setFeedback(null), 5_000);
    } catch {
      toast.error('Failed to log activity. Please try again.');
    }
  };

  // Derived metrics
  const streak = metrics?.currentStreak ?? 0;
  const completedToday = todayData?.completed?.length ?? 0;
  const plannedToday = todayData?.planned?.length ?? 0;
  const recentActivities = [
    ...(todayData?.completed ?? []).slice(0, 3),
    ...(todayData?.planned ?? []).slice(0, 2),
  ];

  // Weekly bar chart — activityByDay is a Record<YYYY-MM-DD, number>
  const weeklyBars: number[] = metrics?.activityByDay
    ? Object.values(metrics.activityByDay).slice(-7)
    : [0, 0, 0, 0, 0, 0, 0];
  const maxBar = Math.max(...weeklyBars, 1);

  return (
    <div className="px-4 md:px-12 max-w-7xl mx-auto relative">
      {/* ── Hero: Clock + AI Input ──────────────────────────────────── */}
      <section className="flex flex-col items-center mb-12 md:mb-16 text-center relative py-12">
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
            <div className="px-3 md:px-4">
              <Mic
                className={cn('w-5 h-5 md:w-6 md:h-6', isDark ? 'text-dark-primary' : 'text-primary')}
              />
            </div>
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

          {/* Feedback / hint */}
          <AnimatePresence mode="wait">
            {feedback ? (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  'mt-4 p-4 rounded-2xl flex items-start gap-3 text-left border backdrop-blur-xl',
                  isDark
                    ? 'bg-dark-primary/10 border-dark-primary/30'
                    : 'bg-primary/5 border-primary/20'
                )}
              >
                <CheckCircle2
                  className={cn('w-5 h-5 shrink-0 mt-0.5', isDark ? 'text-dark-primary' : 'text-primary')}
                />
                <p
                  className={cn(
                    'text-sm font-semibold',
                    isDark ? 'text-dark-on-surface' : 'text-on-surface'
                  )}
                >
                  {feedback.message}
                </p>
              </motion.div>
            ) : (
              <motion.p
                key="hint"
                className={cn(
                  'text-xs mt-4 font-medium transition-colors',
                  isDark ? 'text-dark-on-surface-variant/60' : 'text-on-surface-variant/60'
                )}
              >
                Try: "Ran 5km in 26 mins" or "Read 30 pages of Deep Work"
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── Bento Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 relative z-10">

        {/* Streak Card */}
        <ReactiveCard isDark={isDark} className="md:col-span-4 flex flex-col justify-between">
          <div>
            <h3
              className={cn(
                'text-[10px] font-bold tracking-[0.3em] uppercase mb-6 md:mb-8',
                isDark ? 'text-dark-primary' : 'text-primary'
              )}
            >
              Activity Streak
            </h3>
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  'text-6xl md:text-7xl font-black tracking-tighter',
                  isDark ? 'text-dark-on-surface drop-shadow-[0_0_15px_rgba(129,236,255,0.3)]' : 'text-on-surface'
                )}
              >
                {streak}
              </span>
              <span
                className={cn('text-lg md:text-xl font-bold', isDark ? 'text-dark-primary' : 'text-on-surface-variant')}
              >
                days
              </span>
            </div>
            <p
              className={cn(
                'mt-4 text-sm leading-relaxed opacity-70',
                isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
              )}
            >
              Keep going — consistency compounds.
            </p>
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
                  transition={{ duration: 0.8, delay: i * 0.08 }}
                  className={cn(
                    'w-full rounded-lg',
                    isDark ? 'plasma-gradient shadow-[0_0_10px_rgba(129,236,255,0.4)]' : 'signature-gradient'
                  )}
                />
              </div>
            ))}
          </div>
        </ReactiveCard>

        {/* Today Overview */}
        <ReactiveCard isDark={isDark} className="md:col-span-8 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3
              className={cn(
                'text-[10px] font-bold tracking-[0.3em] uppercase',
                isDark ? 'text-dark-primary' : 'text-primary'
              )}
            >
              Today
            </h3>
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn('text-2xl font-black', isDark ? 'text-dark-primary' : 'text-primary')}
                >
                  {completedToday}
                </span>
                <span className="text-[9px] uppercase tracking-widest opacity-50 font-bold">Done</span>
              </div>
              <div className={cn('w-px', isDark ? 'bg-white/10' : 'bg-black/10')} />
              <div className="flex flex-col items-center">
                <span
                  className={cn('text-2xl font-black', isDark ? 'text-dark-on-surface' : 'text-on-surface')}
                >
                  {plannedToday}
                </span>
                <span className="text-[9px] uppercase tracking-widest opacity-50 font-bold">Planned</span>
              </div>
            </div>
          </div>

          {/* Recent activities */}
          <div className="flex-1 space-y-3">
            {recentActivities.length === 0 ? (
              <div
                className={cn(
                  'flex flex-col items-center justify-center py-10 text-center',
                  isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
                )}
              >
                <Activity className="w-8 h-8 mb-3 opacity-30" />
                <p className="text-sm font-medium opacity-60">No activities yet today</p>
                <p className="text-xs opacity-40 mt-1">Log something above to get started</p>
              </div>
            ) : (
              recentActivities.map((act) => (
                <div
                  key={act.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl',
                    isDark ? 'bg-white/5' : 'bg-surface-container-low'
                  )}
                >
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      act.status === 'completed'
                        ? isDark
                          ? 'bg-dark-primary'
                          : 'bg-primary'
                        : isDark
                        ? 'bg-dark-on-surface-variant/30'
                        : 'bg-on-surface-variant/30'
                    )}
                  />
                  <span
                    className={cn(
                      'text-sm font-medium flex-1 truncate',
                      isDark ? 'text-dark-on-surface' : 'text-on-surface'
                    )}
                  >
                    {act.title}
                  </span>
                  {act.value != null && act.unit && (
                    <span
                      className={cn(
                        'text-xs font-bold opacity-60 shrink-0',
                        isDark ? 'text-dark-primary' : 'text-primary'
                      )}
                    >
                      {act.value} {act.unit}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => onNavigate('History', 'push')}
            className={cn(
              'mt-6 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest py-2.5 rounded-xl transition-all',
              isDark
                ? 'text-dark-primary hover:bg-dark-primary/10'
                : 'text-primary hover:bg-primary/5'
            )}
          >
            View All History <ChevronRight className="w-4 h-4" />
          </button>
        </ReactiveCard>

        {/* Quick Stats Row */}
        {[
          {
            label: 'This Week',
            value: metrics?.completedActivities ?? 0,
            sub: 'Completed',
            Icon: CheckCircle2,
          },
          {
            label: 'Goals Touched',
            value: metrics?.goalsTouched ?? 0,
            sub: 'This Period',
            Icon: Target,
          },
          {
            label: 'Best Streak',
            value: metrics?.longestStreak ?? 0,
            sub: 'Days',
            Icon: Flame,
          },
        ].map(({ label, value, sub, Icon }) => (
          <ReactiveCard key={label} isDark={isDark} className="md:col-span-4">
            <div className="flex justify-between items-start mb-4">
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  isDark ? 'bg-dark-primary/15 text-dark-primary' : 'bg-primary/10 text-primary'
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={cn(
                  'text-[9px] font-black tracking-widest uppercase opacity-40',
                  isDark ? 'text-dark-on-surface' : 'text-on-surface'
                )}
              >
                {label}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className={cn(
                  'text-4xl font-black tracking-tighter',
                  isDark ? 'text-dark-on-surface' : 'text-on-surface'
                )}
              >
                {value}
              </span>
              <span
                className={cn('text-sm font-bold opacity-50', isDark ? 'text-dark-on-surface' : 'text-on-surface')}
              >
                {sub}
              </span>
            </div>
          </ReactiveCard>
        ))}
      </div>
    </div>
  );
}
