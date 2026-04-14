/**
 * @file components/WeeklyReview.tsx
 * @description Dedicated Weekly Review screen — the "ritual" screen for Phase 3.
 *   Shows week-at-a-glance metrics, dormant goals with "add to today" actions,
 *   and an AI-powered streaming analysis of the past week.
 * @module @polaris/frontend/components
 *
 * @dependencies
 * - hooks/useMetrics
 * - hooks/useDormantGoals
 * - hooks/useWeeklyAnalysisStream
 * - framer-motion
 * - lucide-react
 *
 * @relatedFiles
 * - src/App.tsx
 * - src/types/navigation.ts  (WeeklyReview ScreenId)
 * - apps/backend/src/services/dormancy.service.ts
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Brain,
  Flame,
  TrendingUp,
  AlertTriangle,
  Plus,
  Loader2,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  ChevronRight,
  Clock,
  Target,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMetrics } from '@/hooks/useMetrics';
import { useDormantGoals, useAddDormantToToday } from '@/hooks/useDormantGoals';
import { useWeeklyAnalysisStream } from '@/hooks/useWeeklyAnalysisStream';
import type { Theme, ScreenId } from '@/types/navigation';
import type { DormantGoal } from '@polaris/shared';

interface WeeklyReviewProps {
  theme:      Theme;
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
}

// ---------------------------------------------------------------------------
// Sub-component: Stat tile
// ---------------------------------------------------------------------------

interface StatTileProps {
  label:   string;
  value:   string | number;
  sub?:    string;
  icon:    React.ReactNode;
  isDark:  boolean;
  accent?: 'default' | 'good' | 'warn';
}

function StatTile({ label, value, sub, icon, isDark, accent = 'default' }: StatTileProps) {
  const accentClass =
    accent === 'good'
      ? isDark ? 'border-emerald-400/20 bg-emerald-400/5' : 'border-emerald-500/20 bg-emerald-50'
      : accent === 'warn'
      ? isDark ? 'border-amber-400/20 bg-amber-400/5' : 'border-amber-500/20 bg-amber-50'
      : isDark ? 'border-white/8 bg-white/3' : 'border-black/5 bg-black/2';

  return (
    <div className={cn('rounded-2xl border p-4 flex flex-col gap-2', accentClass)}>
      <div className="flex items-start justify-between">
        <span className={cn('text-[10px] font-black uppercase tracking-widest', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
          {label}
        </span>
        <span className={cn(
          accent === 'good' ? 'text-emerald-400' : accent === 'warn' ? 'text-amber-400' : isDark ? 'text-dark-primary' : 'text-primary'
        )}>
          {icon}
        </span>
      </div>
      <p className={cn('text-2xl font-black tracking-tight', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
        {value}
      </p>
      {sub && (
        <p className={cn('text-xs opacity-50', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Dormant goal card
// ---------------------------------------------------------------------------

function DormantGoalCard({ goal, isDark }: { goal: DormantGoal; isDark: boolean }) {
  const addToToday = useAddDormantToToday();
  const isAdding = addToToday.isPending;

  const dormancyLabel =
    goal.daysSinceLastActivity === null
      ? 'Never started'
      : goal.daysSinceLastActivity === 1
      ? '1 day ago'
      : `${goal.daysSinceLastActivity} days ago`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center gap-4 px-4 py-3 rounded-2xl border transition-all',
        isDark ? 'bg-white/3 border-white/8 hover:bg-white/5' : 'bg-black/2 border-black/5 hover:bg-black/4'
      )}
    >
      {/* Timeframe dot */}
      <div className={cn(
        'w-2 h-2 rounded-full shrink-0',
        goal.timeframe === 'long'   ? 'bg-violet-400' :
        goal.timeframe === 'medium' ? 'bg-blue-400'   : 'bg-emerald-400'
      )} />

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold truncate', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
          {goal.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <Clock className="w-3 h-3 opacity-40" />
          <span className={cn('text-xs opacity-50', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
            {dormancyLabel}
          </span>
          {goal.progress > 0 && (
            <>
              <span className="opacity-30">·</span>
              <span className={cn('text-xs opacity-50', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
                {goal.progress}%
              </span>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className={cn('w-16 h-1.5 rounded-full overflow-hidden shrink-0', isDark ? 'bg-white/10' : 'bg-black/10')}>
        <div
          className={cn('h-full rounded-full', isDark ? 'bg-dark-primary' : 'bg-primary')}
          style={{ width: `${goal.progress}%` }}
        />
      </div>

      <button
        onClick={() => addToToday.mutate(goal)}
        disabled={isAdding}
        title="Add to today"
        className={cn(
          'shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 border',
          isDark ? 'bg-dark-primary/15 border-dark-primary/30 text-dark-primary hover:bg-dark-primary/25' : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20',
          isAdding && 'opacity-60 cursor-wait'
        )}
      >
        {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
      </button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: AI Analysis panel
// ---------------------------------------------------------------------------

function AIAnalysisPanel({ isDark }: { isDark: boolean }) {
  const { state, start, reset } = useWeeklyAnalysisStream();

  return (
    <div className={cn('rounded-2xl border overflow-hidden', isDark ? 'border-white/8' : 'border-black/5')}>
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-5 py-4 border-b',
          isDark ? 'bg-white/3 border-white/5' : 'bg-black/2 border-black/5'
        )}
      >
        <div className="flex items-center gap-2.5">
          <Brain className={cn('w-4 h-4', isDark ? 'text-dark-primary' : 'text-primary')} />
          <span className="text-sm font-bold">AI Weekly Analysis</span>
        </div>
        <div className="flex items-center gap-2">
          {state.status === 'streaming' && (
            <span className={cn('text-xs opacity-60 flex items-center gap-1.5', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
              <Loader2 className="w-3 h-3 animate-spin" />
              Generating…
            </span>
          )}
          {(state.status === 'done' || state.status === 'error') && (
            <button
              onClick={reset}
              className={cn('w-7 h-7 rounded-xl flex items-center justify-center transition-all', isDark ? 'hover:bg-white/8 text-dark-on-surface-variant' : 'hover:bg-black/5 text-on-surface-variant')}
              title="Reset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {state.status === 'idle' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <Sparkles className={cn('w-8 h-8', isDark ? 'text-dark-primary/40' : 'text-primary/40')} />
            <div>
              <p className={cn('text-sm font-semibold mb-1', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
                Get your weekly insights
              </p>
              <p className={cn('text-xs opacity-50', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
                AI analyzes your past 7 days and surfaces patterns
              </p>
            </div>
            <button
              onClick={start}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95',
                isDark ? 'plasma-gradient text-dark-bg' : 'signature-gradient text-white'
              )}
            >
              <Brain className="w-4 h-4" />
              Generate Analysis
            </button>
          </div>
        )}

        {state.status === 'streaming' && !state.result && (
          <div className={cn('space-y-2 text-sm font-mono opacity-70 leading-relaxed whitespace-pre-wrap break-words', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
            {state.tokens || <span className="animate-pulse">Thinking…</span>}
          </div>
        )}

        {state.result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Summary */}
            <p className={cn('text-sm leading-relaxed', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
              {state.result.summary}
            </p>

            {/* Insights */}
            {state.result.insights.length > 0 && (
              <div>
                <p className={cn('text-[10px] font-black uppercase tracking-widest mb-2.5', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
                  Insights
                </p>
                <ul className="space-y-2">
                  {state.result.insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <ChevronRight className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', isDark ? 'text-dark-primary' : 'text-primary')} />
                      <span className={cn('text-sm', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
                        {insight}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggestions */}
            {state.result.suggestions.length > 0 && (
              <div>
                <p className={cn('text-[10px] font-black uppercase tracking-widest mb-2.5', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
                  Suggestions for next week
                </p>
                <ul className="space-y-2">
                  {state.result.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', isDark ? 'text-emerald-400' : 'text-emerald-600')} />
                      <span className={cn('text-sm', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
                        {s}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}

        {state.status === 'error' && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <p className={cn('text-sm', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
              {state.error ?? 'Analysis failed'}
            </p>
            <button
              onClick={start}
              className={cn('text-xs font-semibold transition-colors', isDark ? 'text-dark-primary hover:text-dark-primary/70' : 'text-primary hover:text-primary/70')}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main screen component
// ---------------------------------------------------------------------------

/**
 * Weekly Review screen — Phase 3's "ritual" screen.
 * Week-at-a-glance stats + dormant goals + AI streaming analysis.
 */
export function WeeklyReview({ theme, onNavigate }: WeeklyReviewProps) {
  const isDark = theme === 'dark';
  const { data: metrics } = useMetrics('week');
  const { data: dormant = [] } = useDormantGoals();

  const completionRate =
    metrics && metrics.totalActivities > 0
      ? Math.round((metrics.completedActivities / metrics.totalActivities) * 100)
      : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Back button + header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate('Insights', 'push')}
          className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 border',
            isDark ? 'bg-white/5 border-white/10 text-dark-on-surface-variant hover:bg-white/10' : 'bg-black/5 border-transparent text-on-surface-variant hover:bg-black/10'
          )}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className={cn('text-xl font-black tracking-tight', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
            Weekly Review
          </h1>
          <p className={cn('text-xs opacity-50', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile
          label="Completed"
          value={metrics?.completedActivities ?? '—'}
          sub={`of ${metrics?.totalActivities ?? '—'} planned`}
          icon={<CheckCircle2 className="w-4 h-4" />}
          isDark={isDark}
          accent={completionRate >= 70 ? 'good' : completionRate >= 40 ? 'default' : 'warn'}
        />
        <StatTile
          label="Completion"
          value={`${completionRate}%`}
          icon={<Target className="w-4 h-4" />}
          isDark={isDark}
          accent={completionRate >= 70 ? 'good' : completionRate >= 40 ? 'default' : 'warn'}
        />
        <StatTile
          label="Streak"
          value={`${metrics?.currentStreak ?? 0}d`}
          sub={`best: ${metrics?.longestStreak ?? 0}d`}
          icon={<Flame className="w-4 h-4" />}
          isDark={isDark}
          accent={(metrics?.currentStreak ?? 0) > 0 ? 'good' : 'default'}
        />
        <StatTile
          label="Goals Active"
          value={metrics?.goalsTouched ?? '—'}
          icon={<Activity className="w-4 h-4" />}
          isDark={isDark}
        />
      </div>

      {/* AI Analysis */}
      <AIAnalysisPanel isDark={isDark} />

      {/* Dormant goals */}
      <AnimatePresence>
        {dormant.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h2 className={cn('text-sm font-bold', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
                Goals going quiet
              </h2>
              <span className={cn('ml-auto text-xs font-semibold px-2 py-0.5 rounded-full', isDark ? 'bg-amber-400/10 text-amber-400' : 'bg-amber-50 text-amber-600')}>
                {dormant.length}
              </span>
            </div>
            <p className={cn('text-xs opacity-50', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
              These goals haven't had any activity in 7+ days. One tap to add them to today.
            </p>
            <div className="space-y-2">
              {dormant.map((goal, i) => (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <DormantGoalCard goal={goal} isDark={isDark} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {dormant.length === 0 && metrics && (
        <div className={cn('flex flex-col items-center gap-2 py-8 text-center rounded-2xl border', isDark ? 'border-white/5 bg-emerald-400/3' : 'border-emerald-100 bg-emerald-50/50')}>
          <TrendingUp className="w-6 h-6 text-emerald-400" />
          <p className={cn('text-sm font-semibold', isDark ? 'text-emerald-400' : 'text-emerald-700')}>
            All goals are active!
          </p>
          <p className={cn('text-xs opacity-60', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
            No dormant goals this week.
          </p>
        </div>
      )}
    </div>
  );
}
