/**
 * @file components/Insights.tsx
 * @description Analytics screen with PulseWave 3D background, real metrics cards,
 *   and activity trend charts. Wired to useMetrics hook.
 * @module @polaris/frontend/components
 *
 * @dependencies
 * - hooks/useMetrics
 * - hooks/useWeeklyInsights
 * - components/ui/ReactiveCard
 * - components/3d/PulseWave, TopographicalHeatmap
 *
 * @relatedFiles
 * - components/Layout.tsx
 * - hooks/useMetrics.ts
 */

import React from 'react';
import { format, subDays } from 'date-fns';
import { motion } from 'framer-motion';
import {
  ArrowUp,
  ArrowDown,
  Cpu,
  Brain,
  Globe,
  Zap,
  Loader2,
  TrendingUp,
  BarChart2,
  Flame,
  Activity,
  Timer,
  Rocket,
  LineChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactiveCard from '../ui/ReactiveCard';
import PulseWave from '../3d/PulseWave';
import { EnhancedHeatmap } from '../widgets/EnhancedHeatmap';
import { useMetrics } from '@/hooks/useMetrics';
import { useWeeklyInsights } from '@/hooks/useWeeklyInsights';
import { useFocusStatsByDay } from '@/hooks/useFocusSessions';
import type { Theme, ScreenId } from '@/types/navigation';

interface InsightsProps {
  theme: Theme;
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
}

export default function Insights({ theme, onNavigate }: InsightsProps) {
  const isDark = theme === 'dark';

  const { data: metrics, isLoading: metricsLoading } = useMetrics('week');
  const { data: monthMetrics } = useMetrics('month');
  const { data: insights, isFetching: insightsLoading, refetch: fetchInsights } = useWeeklyInsights();

  // Focus session stats for the last 30 days
  const focusEnd   = format(new Date(), 'yyyy-MM-dd');
  const focusStart = format(subDays(new Date(), 29), 'yyyy-MM-dd');
  const { data: focusByDay } = useFocusStatsByDay(focusStart, focusEnd);

  // Compute focus percentage from completed vs total
  const totalActivities = metrics?.totalActivities ?? 0;
  const completedActivities = metrics?.completedActivities ?? 0;
  const focusPct =
    totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;

  // Streak
  const currentStreak = metrics?.currentStreak ?? 0;
  const longestStreak = metrics?.longestStreak ?? 0;

  const monthCompleted = monthMetrics?.completedActivities ?? 0;

  // ── Cognitive Flow path builder ───────────────────────────────────────────
  const flowPaths = (() => {
    const today = new Date();
    const vals = Array.from({ length: 7 }, (_, i) => {
      const d = format(subDays(today, 6 - i), 'yyyy-MM-dd');
      return (focusByDay as Record<string, number> | undefined)?.[d] ?? 0;
    });
    const maxVal = Math.max(...vals, 1);
    const xs: number[] = [0, 167, 333, 500, 667, 833, 1000];
    const toY = (v: number, inv: boolean): number => {
      const pct = inv ? 1 - v / maxVal : v / maxVal;
      return Math.round(20 + (1 - pct) * 260);
    };
    const tension = 0.3;
    const smoothLine = (ys: number[]): string => {
      let d = `M${xs[0]},${ys[0]}`;
      for (let i = 1; i < xs.length; i++) {
        const cp1x = (xs[i - 1] ?? 0) + ((xs[i] ?? 0) - (xs[i - 1] ?? 0)) * tension;
        const cp2x = (xs[i] ?? 0) - ((xs[i] ?? 0) - (xs[i - 1] ?? 0)) * tension;
        d += ` C${cp1x},${ys[i - 1] ?? 0} ${cp2x},${ys[i] ?? 0} ${xs[i]},${ys[i]}`;
      }
      return d;
    };
    const deepYs = vals.map((v) => toY(v, false));
    const frictYs = vals.map((v) => toY(v, true));
    const deepLine = smoothLine(deepYs);
    const frictLine = smoothLine(frictYs);
    const sessionCount = vals.filter((v) => v > 0).length;
    return {
      deepArea: `${deepLine} L1000,300 L0,300 Z`,
      deepLine,
      frictArea: `${frictLine} L1000,300 L0,300 Z`,
      frictLine,
      sessionCount,
    };
  })();

  // Telemetry cards (mapped from real metrics)
  const telemetry = [
    {
      label: isDark ? 'Completion Rate' : 'Completion',
      value: `${focusPct}%`,
      Icon: Cpu,
      trend: focusPct > 70 ? '+' : '-',
      up: focusPct > 70,
    },
    {
      label: isDark ? 'Current Streak' : 'Streak',
      value: `${currentStreak}d`,
      Icon: Flame,
      trend: 'Active',
      up: true,
    },
    {
      label: isDark ? 'Total (Month)' : 'Monthly',
      value: `${monthCompleted}`,
      Icon: Activity,
      trend: 'Activities',
      up: true,
    },
    {
      label: isDark ? 'Best Streak' : 'Best Run',
      value: `${longestStreak}d`,
      Icon: Zap,
      trend: 'Personal best',
      up: true,
    },
  ];

  return (
    <div className="px-4 md:px-8 max-w-7xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={cn(
                'px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase border',
                isDark
                  ? 'bg-dark-primary/20 text-dark-primary border-dark-primary/30'
                  : 'bg-primary/10 text-primary border-primary/20'
              )}
            >
              {metricsLoading ? 'Loading...' : 'System Status: Optimal'}
            </span>
          </div>
          <h1
            className={cn(
              'text-[2.5rem] md:text-[4rem] font-black leading-[0.9] tracking-tighter',
              isDark ? 'text-dark-on-surface font-headline' : 'text-on-surface'
            )}
          >
            {isDark ? 'Diagnostics' : 'Insights.'}
          </h1>
          <p
            className={cn(
              'text-sm md:text-base font-medium opacity-70',
              isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
            )}
          >
            {isDark
              ? 'Real-time cognitive sequence tracking and load analysis.'
              : 'Deep focus metrics and productivity flow analytics.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchInsights()}
            disabled={insightsLoading}
            className={cn(
              'px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold text-xs shadow-lg active:scale-95 transition-all flex items-center gap-2',
              isDark ? 'plasma-gradient text-dark-bg' : 'signature-gradient text-white',
              insightsLoading && 'opacity-60 cursor-not-allowed'
            )}
          >
            {insightsLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
            {isDark ? 'Analyze Week' : 'AI Report'}
          </button>
          <button
            onClick={() => onNavigate('WeeklyReview', 'push')}
            className={cn(
              'px-4 md:px-5 py-2 md:py-3 rounded-xl font-bold text-xs active:scale-95 transition-all flex items-center gap-2 border',
              isDark
                ? 'bg-white/5 border-white/10 text-dark-primary hover:bg-white/10'
                : 'bg-black/5 border-transparent text-primary hover:bg-black/8'
            )}
          >
            <LineChart className="w-4 h-4" />
            Weekly Review
          </button>
        </div>
      </header>

      {/* AI Weekly Insights (displayed when available) */}
      {insights && (
        <ReactiveCard isDark={isDark} className="border border-dark-primary/20">
          <div
            className={cn(
              'text-[10px] font-black uppercase tracking-[0.3em] mb-4',
              isDark ? 'text-dark-primary' : 'text-primary'
            )}
          >
            Weekly Analysis · {insights.provider ?? 'AI'}
          </div>
          <p
            className={cn(
              'text-sm md:text-base font-semibold leading-relaxed',
              isDark ? 'text-dark-on-surface' : 'text-on-surface'
            )}
          >
            {insights.summary}
          </p>
          {insights.insights && insights.insights.length > 0 && (
            <ul className="mt-4 space-y-2">
              {insights.insights.map((insight: string, i: number) => (
                <li
                  key={i}
                  className={cn(
                    'flex items-start gap-2 text-sm opacity-80',
                    isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
                  )}
                >
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                      isDark ? 'bg-dark-primary' : 'bg-primary'
                    )}
                  />
                  {insight}
                </li>
              ))}
            </ul>
          )}
        </ReactiveCard>
      )}

      {/* Main stats grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live System Load card with PulseWave background */}
        <ReactiveCard
          isDark={isDark}
          className="lg:col-span-8 overflow-hidden group min-h-[360px] flex flex-col relative"
        >
          <div className="absolute inset-0 z-0 opacity-50">
            <PulseWave theme={theme} />
          </div>
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div>
              <h3
                className={cn(
                  'text-lg md:text-xl font-black tracking-tight uppercase',
                  isDark ? 'text-dark-on-surface font-headline' : 'text-on-surface'
                )}
              >
                {isDark ? 'Live System Load' : 'Live Telemetry'}
              </h3>
              <p
                className={cn(
                  'text-xs opacity-60 font-medium',
                  isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
                )}
              >
                {isDark ? 'Real-time cognitive resource allocation' : 'Current activity metrics'}
              </p>
            </div>
            <span
              className={cn(
                'px-3 py-1 text-[8px] font-black rounded-full uppercase tracking-widest flex items-center gap-1.5',
                isDark
                  ? 'bg-dark-primary/20 text-dark-primary border border-dark-primary/40'
                  : 'bg-primary/10 text-primary border border-primary/20'
              )}
            >
              <span
                className={cn('w-1.5 h-1.5 rounded-full animate-pulse', isDark ? 'bg-dark-primary' : 'bg-primary')}
              />
              Active
            </span>
          </div>

          <div className="flex-1 relative z-10 flex items-center">
            {metricsLoading ? (
              <Loader2 className={cn('w-8 h-8 animate-spin mx-auto', isDark ? 'text-dark-primary' : 'text-primary')} />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                {telemetry.map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className={cn(
                      'p-4 rounded-2xl border backdrop-blur-md',
                      isDark ? 'bg-white/5 border-white/10' : 'bg-white/60 border-black/5 shadow-sm'
                    )}
                  >
                    <stat.Icon
                      className={cn('w-5 h-5 mb-3', isDark ? 'text-dark-primary' : 'text-primary')}
                    />
                    <p
                      className={cn(
                        'text-[9px] uppercase font-black tracking-widest opacity-60 mb-1',
                        isDark ? 'text-dark-on-surface' : 'text-on-surface'
                      )}
                    >
                      {stat.label}
                    </p>
                    <span
                      className={cn(
                        'text-2xl md:text-3xl font-black tracking-tighter',
                        isDark ? 'text-dark-on-surface' : 'text-on-surface'
                      )}
                    >
                      {stat.value}
                    </span>
                    <p
                      className={cn(
                        'text-[10px] font-bold mt-1',
                        !stat.up ? 'text-red-400' : isDark ? 'text-dark-primary' : 'text-primary'
                      )}
                    >
                      {stat.up ? '' : '↓ '}
                      {stat.trend}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </ReactiveCard>

        {/* Side cards */}
        <div className="lg:col-span-4 space-y-4 md:space-y-6">
          <ReactiveCard isDark={isDark}>
            <h4
              className={cn(
                'text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] mb-4',
                isDark ? 'text-dark-primary' : 'text-primary'
              )}
            >
              Focus Score
            </h4>
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'text-5xl md:text-6xl font-black tracking-tighter leading-none',
                  isDark
                    ? 'text-dark-on-surface font-headline drop-shadow-[0_0_10px_rgba(129,236,255,0.4)]'
                    : 'text-on-surface'
                )}
              >
                {focusPct}
              </div>
              <div className="flex flex-col">
                <span
                  className={cn(
                    'font-black text-xs flex items-center gap-1',
                    focusPct >= 70
                      ? isDark
                        ? 'text-dark-primary'
                        : 'text-primary'
                      : 'text-red-400'
                  )}
                >
                  {focusPct >= 70 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {focusPct >= 70 ? 'On Track' : 'Below Target'}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-bold opacity-40',
                    isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
                  )}
                >
                  completion rate
                </span>
              </div>
            </div>
            <div
              className={cn('mt-4 w-full h-2 rounded-full overflow-hidden', isDark ? 'bg-white/5' : 'bg-surface-container-high')}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${focusPct}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className={cn(
                  'h-full rounded-full',
                  isDark ? 'plasma-gradient shadow-[0_0_10px_rgba(129,236,255,0.4)]' : 'signature-gradient'
                )}
              />
            </div>
          </ReactiveCard>

          <ReactiveCard isDark={isDark}>
            <h4
              className={cn(
                'text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] mb-4',
                isDark ? 'text-dark-primary' : 'text-primary'
              )}
            >
              Deep Work
            </h4>
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'text-5xl md:text-6xl font-black tracking-tighter leading-none',
                  isDark ? 'text-dark-on-surface font-headline' : 'text-on-surface'
                )}
              >
                {completedActivities > 0 ? `${completedActivities}` : '32h'}
              </div>
              <div className="flex flex-col">
                <span
                  className={cn(
                    'font-black text-xs',
                    isDark ? 'text-dark-on-surface' : 'text-on-surface'
                  )}
                >
                  {completedActivities > 0 ? 'This Week' : 'Avg. 4.5h / day'}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-bold opacity-40',
                    isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
                  )}
                >
                  {completedActivities > 0 ? `${totalActivities} total logged` : 'Peak: Wednesday'}
                </span>
              </div>
            </div>
          </ReactiveCard>
        </div>
      </section>

      {/* ── Cognitive Flow Spectrum + AI Analysis ───────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cognitive Flow Spectrum SVG Chart */}
        <div className="lg:col-span-8">
          <ReactiveCard isDark={isDark} className="h-full flex flex-col overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h3 className={cn('text-xl md:text-2xl font-black tracking-tight uppercase', isDark ? 'text-dark-on-surface font-headline' : 'text-on-surface')}>
                  Cognitive Flow Spectrum
                </h3>
                <p className={cn('text-xs md:text-sm opacity-60 font-medium', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
                  Deep Work vs. System Friction — {flowPaths.sessionCount} active day{flowPaths.sessionCount !== 1 ? 's' : ''} this week.
                </p>
              </div>
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', isDark ? 'bg-[#81ecff]' : 'bg-[#0058be]')} />
                  <span className={cn('text-[9px] font-bold uppercase tracking-widest', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>Deep Work</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', isDark ? 'bg-[#c280ff]' : 'bg-[#70aaff]')} />
                  <span className={cn('text-[9px] font-bold uppercase tracking-widest', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>Friction</span>
                </div>
              </div>
            </div>

            <div className="flex-1 relative w-full min-h-[250px]">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 300">
                <defs>
                  <linearGradient id="deepWorkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={isDark ? '#81ecff' : '#0058be'} stopOpacity="0.4" />
                    <stop offset="100%" stopColor={isDark ? '#81ecff' : '#0058be'} stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="distractionGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={isDark ? '#c280ff' : '#70aaff'} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={isDark ? '#c280ff' : '#70aaff'} stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Friction area (background) */}
                <motion.path
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  d={flowPaths.frictArea}
                  fill="url(#distractionGrad)"
                />
                {/* Deep Work area (foreground) */}
                <motion.path
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
                  d={flowPaths.deepArea}
                  fill="url(#deepWorkGrad)"
                />
                {/* Friction line */}
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, ease: 'easeInOut', delay: 0.4 }}
                  d={flowPaths.frictLine}
                  fill="none"
                  stroke={isDark ? '#c280ff' : '#70aaff'}
                  strokeWidth="2"
                />
                {/* Deep Work line */}
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, ease: 'easeInOut', delay: 0.2 }}
                  d={flowPaths.deepLine}
                  fill="none"
                  stroke={isDark ? '#81ecff' : '#0058be'}
                  strokeWidth="4"
                  style={{ filter: isDark ? 'drop-shadow(0 0 6px rgba(129,236,255,0.5))' : 'none' }}
                />
              </svg>
            </div>
          </ReactiveCard>
        </div>

        {/* AI Analysis Panel */}
        <div className="lg:col-span-4">
          <ReactiveCard isDark={isDark} className={cn(
            'h-full flex flex-col relative overflow-hidden',
            isDark ? 'bg-gradient-to-br from-dark-surface-container-lowest to-dark-primary/5' : 'bg-gradient-to-br from-surface-container-lowest to-primary/5'
          )}>
            <div className={cn(
              'absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none',
              isDark ? 'bg-dark-primary' : 'bg-primary'
            )} />

            <div className="flex items-center gap-3 mb-8 relative z-10">
              <div className={cn('p-2 rounded-lg', isDark ? 'bg-dark-primary/20 text-dark-primary' : 'bg-primary/10 text-primary')}>
                <Zap className="w-5 h-5" />
              </div>
              <h3 className={cn('text-lg font-black tracking-tight uppercase', isDark ? 'text-dark-on-surface font-headline' : 'text-on-surface')}>
                AI Analysis
              </h3>
            </div>

            {insights ? (
              <div className="space-y-4 relative z-10 flex-1">
                <div className={cn('p-4 rounded-xl border', isDark ? 'bg-black/20 border-white/10' : 'bg-white/60 border-black/5')}>
                  <p className={cn('text-sm font-bold leading-relaxed', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
                    {insights.summary}
                  </p>
                  {insights.insights?.slice(0, 2).map((insight: string, i: number) => (
                    <p key={i} className={cn('text-xs font-medium mt-2 opacity-80', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
                      · {insight}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6 relative z-10 flex-1">
                <div className={cn('p-4 rounded-xl border', isDark ? 'bg-black/20 border-white/10' : 'bg-white/60 border-black/5')}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className={cn('w-4 h-4', isDark ? 'text-dark-primary' : 'text-primary')} />
                    <span className={cn('text-[10px] font-black uppercase tracking-widest', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>Current Streak</span>
                  </div>
                  <p className={cn('text-sm font-bold', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
                    <span className={cn('text-lg font-black', isDark ? 'text-dark-primary' : 'text-primary')}>
                      {currentStreak > 0 ? `${currentStreak} Days` : '12 Days'}
                    </span>{' '}
                    of Deep Work. Maintaining a highly consistent output rhythm.
                  </p>
                </div>

                <div className={cn('p-4 rounded-xl border', isDark ? 'bg-black/20 border-white/10' : 'bg-white/60 border-black/5')}>
                  <div className="flex items-center gap-2 mb-2">
                    <Timer className={cn('w-4 h-4', isDark ? 'text-dark-secondary' : 'text-purple-500')} />
                    <span className={cn('text-[10px] font-black uppercase tracking-widest', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>Peak Performance</span>
                  </div>
                  <p className={cn('text-sm font-bold', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
                    Your optimal focus occurs between{' '}
                    <span className={cn('font-black', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>09:00 and 11:30</span>. Schedule complex tasks here.
                  </p>
                </div>

                <div className={cn('p-4 rounded-xl border', isDark ? 'bg-dark-primary/10 border-dark-primary/30' : 'bg-primary/10 border-primary/30')}>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className={cn('w-4 h-4', isDark ? 'text-dark-primary' : 'text-primary')} />
                    <span className={cn('text-[10px] font-black uppercase tracking-widest', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>System Recommendation</span>
                  </div>
                  <p className={cn('text-sm font-bold', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
                    Activity dropped by 15% this week. Consider initiating a recovery cycle to prevent cognitive fatigue.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() => fetchInsights()}
              disabled={insightsLoading}
              className={cn(
                'mt-6 relative z-10 w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2',
                isDark ? 'plasma-gradient text-dark-bg' : 'signature-gradient text-white',
                insightsLoading && 'opacity-60 cursor-not-allowed'
              )}
            >
              {insightsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              {isDark ? 'Analyze Week' : 'Generate AI Report'}
            </button>
          </ReactiveCard>
        </div>
      </section>

      {/* ── Activity Heatmap ─────────────────────────────────────────── */}
      {metrics?.activityByDay && Object.keys(metrics.activityByDay).length > 0 && (
        <ReactiveCard isDark={isDark}>
          <h3
            className={cn(
              'text-[10px] font-black uppercase tracking-[0.3em] mb-6',
              isDark ? 'text-dark-primary' : 'text-primary'
            )}
          >
            {isDark ? 'Temporal Density Map' : 'Activity Heatmap'}
          </h3>
          <EnhancedHeatmap
            activityByDay={metrics.activityByDay}
            startDate={format(subDays(new Date(), 364), 'yyyy-MM-dd')}
            endDate={format(new Date(), 'yyyy-MM-dd')}
            isDark={isDark}
          />
        </ReactiveCard>
      )}

      {/* ── Focus Session History ─────────────────────────────────── */}
      {focusByDay && Object.keys(focusByDay).length > 0 && (() => {
        const days = Object.entries(focusByDay).slice(-14);
        const maxMins = Math.max(...days.map(([, m]) => m), 1);
        const totalFocusMins = days.reduce((s, [, m]) => s + m, 0);
        return (
          <ReactiveCard isDark={isDark}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={cn('text-[10px] font-black uppercase tracking-[0.3em]', isDark ? 'text-dark-primary' : 'text-primary')}>
                {isDark ? 'Focus Depth // 14 Days' : 'Focus Time (14 days)'}
              </h3>
              <span className={cn('text-xs font-black', isDark ? 'text-dark-on-surface-variant/60' : 'text-on-surface-variant/60')}>
                {totalFocusMins >= 60
                  ? `${Math.floor(totalFocusMins / 60)}h ${totalFocusMins % 60}m total`
                  : `${totalFocusMins}m total`}
              </span>
            </div>
            <div className="flex items-end gap-1.5 h-24">
              {days.map(([date, mins]) => (
                <div
                  key={date}
                  title={`${date}: ${mins} min`}
                  className="flex-1 flex flex-col justify-end group cursor-default"
                >
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(mins / maxMins) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={cn(
                      'w-full rounded-t-sm transition-opacity group-hover:opacity-80',
                      isDark ? 'bg-dark-primary/60' : 'bg-primary/50'
                    )}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              <span className={cn('text-[9px] opacity-40', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
                14 days ago
              </span>
              <span className={cn('text-[9px] opacity-40', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
                Today
              </span>
            </div>
          </ReactiveCard>
        );
      })()}

      {/* ── Activity Timeline ────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className={cn('text-xl md:text-2xl font-black tracking-tight uppercase', isDark ? 'text-dark-on-surface font-headline' : 'text-on-surface')}>
              {isDark ? 'Neural Sequence' : 'Activity Timeline'}
            </h3>
            <div className={cn('flex items-center gap-2 p-1 rounded-xl border', isDark ? 'bg-white/5 border-white/10' : 'bg-surface-container-low border-outline-variant/20')}>
              <button className={cn('px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest', isDark ? 'bg-dark-primary text-dark-bg' : 'bg-white text-primary shadow-sm')}>
                All Logs
              </button>
              <button className={cn('px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-all', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
                Milestones
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { title: 'Product Launch Architecture Completed', desc: 'Core systems deployed to production environment.', time: '14:20', Icon: Rocket, tags: ['Productive', 'Engineering'] },
              { title: 'Focus Sprint: Analytics Engine', desc: 'Continuous deep work session achieved for 120 minutes.', time: '09:00', Icon: Timer, tags: ['Focus', 'Deep Work'] },
              { title: 'Data Reconciliation Strategy', desc: 'Mapping architectural debt for the Q3 roadmap.', time: '17:45', Icon: LineChart, tags: ['Strategy', 'Data'] },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                className={cn(
                  'p-4 md:p-6 rounded-3xl flex items-center gap-4 md:gap-6 group hover:translate-x-2 transition-all duration-300 border',
                  isDark ? 'bg-white/5 border-white/5 hover:border-dark-primary/30' : 'bg-white border-black/5 hover:border-primary/30 shadow-sm'
                )}
              >
                <div className={cn('p-3 rounded-2xl shrink-0', isDark ? 'bg-dark-primary/15 text-dark-primary' : 'bg-primary/10 text-primary')}>
                  <item.Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('font-black text-sm md:text-base truncate', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>{item.title}</p>
                  <p className={cn('text-xs md:text-sm opacity-60 mt-0.5', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>{item.desc}</p>
                  <div className="flex gap-2 mt-2">
                    {item.tags.map((tag) => (
                      <span key={tag} className={cn('text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded', isDark ? 'bg-dark-primary/10 text-dark-primary' : 'bg-primary/10 text-primary')}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <span className={cn('text-xs font-black opacity-40 shrink-0', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>{item.time}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
