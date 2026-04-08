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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactiveCard from './ui/ReactiveCard';
import PulseWave from './3d/PulseWave';
import TopographicalHeatmap from './3d/TopographicalHeatmap';
import { useMetrics } from '@/hooks/useMetrics';
import { useWeeklyInsights } from '@/hooks/useWeeklyInsights';
import type { Theme, ScreenId } from '@/types/navigation';

interface InsightsProps {
  theme: Theme;
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
}

export default function Insights({ theme, onNavigate: _onNavigate }: InsightsProps) {
  const isDark = theme === 'dark';

  const { data: metrics, isLoading: metricsLoading } = useMetrics('week');
  const { data: monthMetrics } = useMetrics('month');
  const { data: insights, isFetching: insightsLoading, refetch: fetchInsights } = useWeeklyInsights();

  // Compute focus percentage from completed vs total
  const totalActivities = metrics?.totalActivities ?? 0;
  const completedActivities = metrics?.completedActivities ?? 0;
  const focusPct =
    totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;

  // Streak
  const currentStreak = metrics?.currentStreak ?? 0;
  const longestStreak = metrics?.longestStreak ?? 0;

  const monthCompleted = monthMetrics?.completedActivities ?? 0;

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
              Activity Volume
            </h4>
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'text-5xl md:text-6xl font-black tracking-tighter leading-none',
                  isDark ? 'text-dark-on-surface font-headline' : 'text-on-surface'
                )}
              >
                {completedActivities}
              </div>
              <div className="flex flex-col">
                <span
                  className={cn(
                    'font-black text-xs',
                    isDark ? 'text-dark-on-surface' : 'text-on-surface'
                  )}
                >
                  This Week
                </span>
                <span
                  className={cn(
                    'text-[10px] font-bold opacity-40',
                    isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
                  )}
                >
                  {totalActivities} total logged
                </span>
              </div>
            </div>
          </ReactiveCard>
        </div>
      </section>

      {/* 3D Activity Heatmap */}
      <section>
        <ReactiveCard isDark={isDark} className="overflow-hidden">
          <h3
            className={cn(
              'text-xl font-black tracking-tight uppercase mb-6',
              isDark ? 'text-dark-on-surface font-headline' : 'text-on-surface'
            )}
          >
            {isDark ? 'Cognitive Flow Spectrum' : 'Activity Heatmap'}
          </h3>
          <TopographicalHeatmap theme={theme} />
        </ReactiveCard>
      </section>
    </div>
  );
}
