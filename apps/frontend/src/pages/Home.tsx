/**
 * @file pages/Home.tsx
 * @description Main hub page — assistant-first input + today's feed + quick stats.
 *   Replaces separate Dashboard and TodayView with a unified experience.
 *
 * @module @polaris/frontend/pages
 *
 * @dependencies
 * - components/activities/SmartInputBar
 * - hooks/useActivities (useTodayActivities)
 * - hooks/useMetrics (useMetrics)
 * - hooks/useGoals (useGoals)
 *
 * @relatedFiles
 * - src/components/activities/SmartInputBar.tsx
 * - src/App.tsx
 */

import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Flame, Target, TrendingUp, CheckCircle, Timer, Hash, Clock } from 'lucide-react';
import { SmartInputBar } from '../components/activities/SmartInputBar';
import { useTodayActivities, useUpdateActivity } from '../hooks/useActivities';
import { useMetrics, type MetricsPeriod } from '../hooks/useMetrics';
import { useGoals } from '../hooks/useGoals';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';
import { StreakHero } from '../components/widgets/StreakHero';
import { TrendChart } from '../components/widgets/TrendChart';
import { CategoryDonut } from '../components/widgets/CategoryDonut';
import { EnhancedHeatmap } from '../components/widgets/EnhancedHeatmap';
import { WeeklyInsights } from '../components/widgets/WeeklyInsights';
import type { ListedActivity } from '@polaris/shared';
import { useState } from 'react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayFormatted(): string {
  return format(new Date(), 'EEEE, MMMM d');
}

// ---------------------------------------------------------------------------
// Today's Activity Feed
// ---------------------------------------------------------------------------

const TYPE_ICONS: Record<string, typeof CheckCircle> = {
  quantity: Hash,
  duration: Timer,
  completion: CheckCircle,
};

function ActivityFeedItem({ activity }: { activity: ListedActivity }) {
  const Icon = TYPE_ICONS[activity.activityType] ?? CheckCircle;
  const updateActivity = useUpdateActivity();

  const handleComplete = () => {
    updateActivity.mutate({
      id: activity.id,
      data: { status: 'completed' },
    });
  };

  const handleSkip = () => {
    updateActivity.mutate({
      id: activity.id,
      data: { status: 'skipped' },
    });
  };

  const statusColors = {
    completed: 'border-l-emerald-500/60',
    skipped: 'border-l-gray-600/60',
    planned: 'border-l-indigo-500/60',
  };

  const statusBadge = {
    completed: 'bg-emerald-500/15 text-emerald-400',
    skipped: 'bg-gray-500/15 text-gray-400',
    planned: 'bg-indigo-500/15 text-indigo-400',
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 bg-gray-900/40 rounded-lg border-l-2 ${statusColors[activity.status]} hover:bg-gray-900/60 transition-colors group`}>
      <Icon className="h-4 w-4 text-gray-500 shrink-0" />

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${activity.status === 'skipped' ? 'text-gray-500 line-through' : 'text-white'}`}>
          {activity.title}
        </p>
        {(activity.value !== null || activity.goalTitle) && (
          <p className="text-xs text-gray-500 mt-0.5">
            {activity.value !== null && (
              <span className="text-indigo-400">{activity.value} {activity.unit}</span>
            )}
            {activity.value !== null && activity.goalTitle && <span className="mx-1">&middot;</span>}
            {activity.goalTitle && <span>{activity.goalTitle}</span>}
          </p>
        )}
      </div>

      <span className={`px-2 py-0.5 text-xs rounded-full ${statusBadge[activity.status]}`}>
        {activity.status}
      </span>

      {/* Quick actions for planned items */}
      {activity.status === 'planned' && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleComplete}
            className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
            aria-label="Mark complete"
          >
            <CheckCircle className="h-4 w-4" />
          </button>
          <button
            onClick={handleSkip}
            className="p-1.5 text-gray-400 hover:bg-gray-500/10 rounded-lg transition-colors"
            aria-label="Skip"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function Home() {
  const [period] = useState<MetricsPeriod>('week');
  const { data: todayData, isLoading: todayLoading } = useTodayActivities();
  const { data: metrics, isLoading: metricsLoading } = useMetrics(period);
  const { data: goals = [], isLoading: goalsLoading } = useGoals({ status: 'active', includeProgress: true });

  const today = todayData;
  const allTodayActivities = [
    ...(today?.planned ?? []),
    ...(today?.completed ?? []),
    ...(today?.skipped ?? []),
  ];

  const completedCount = today?.completed?.length ?? 0;
  const plannedCount = today?.planned?.length ?? 0;
  const totalToday = allTodayActivities.length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-8">

      {/* ── Greeting ── */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">{greeting()}</h1>
        <p className="text-sm text-gray-500 mt-1">{todayFormatted()}</p>
      </div>

      {/* ── Smart Input Bar (hero element) ── */}
      <SmartInputBar />

      {/* ── AI Weekly Insights ── */}
      <WeeklyInsights />

      {/* ── Quick Stats Row ── */}
      <div className="grid grid-cols-3 gap-3">
        {/* Streak */}
        <div className="glass px-4 py-3 rounded-xl text-center">
          {metricsLoading ? (
            <Skeleton className="h-8 w-12 mx-auto mb-1" />
          ) : (
            <>
              <div className="flex items-center justify-center gap-1.5">
                <Flame className={`h-5 w-5 ${(metrics?.currentStreak ?? 0) > 0 ? 'text-orange-400' : 'text-gray-600'}`} />
                <span className="text-2xl font-bold text-white tabular-nums">
                  {metrics?.currentStreak ?? 0}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">day streak</p>
            </>
          )}
        </div>

        {/* Today's count */}
        <div className="glass px-4 py-3 rounded-xl text-center">
          {todayLoading ? (
            <Skeleton className="h-8 w-12 mx-auto mb-1" />
          ) : (
            <>
              <div className="flex items-center justify-center gap-1.5">
                <TrendingUp className="h-5 w-5 text-indigo-400" />
                <span className="text-2xl font-bold text-white tabular-nums">
                  {completedCount}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                done today{plannedCount > 0 && ` · ${plannedCount} planned`}
              </p>
            </>
          )}
        </div>

        {/* Active goals */}
        <div className="glass px-4 py-3 rounded-xl text-center">
          {goalsLoading ? (
            <Skeleton className="h-8 w-12 mx-auto mb-1" />
          ) : (
            <>
              <div className="flex items-center justify-center gap-1.5">
                <Target className="h-5 w-5 text-emerald-400" />
                <span className="text-2xl font-bold text-white tabular-nums">
                  {goals.length}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">active goals</p>
            </>
          )}
        </div>
      </div>

      {/* ── Dashboard Widgets ── */}
      {metricsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <StreakHero
            currentStreak={metrics.currentStreak}
            longestStreak={metrics.longestStreak}
          />
          <CategoryDonut
            completedActivities={metrics.completedActivities}
            plannedActivities={metrics.plannedActivities}
            totalActivities={metrics.totalActivities}
          />
          <div className="md:col-span-2">
            <TrendChart activityByDay={metrics.activityByDay} period={period} />
          </div>
          <div className="md:col-span-2">
            <EnhancedHeatmap
              activityByDay={metrics.activityByDay}
              startDate={metrics.startDate}
              endDate={metrics.endDate}
            />
          </div>
        </div>
      ) : null}

      {/* ── Today's Activity Feed ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
            Today&apos;s Activity
          </h2>
          {totalToday > 0 && (
            <Link
              to="/history"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View all →
            </Link>
          )}
        </div>

        {todayLoading ? (
          <div className="space-y-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : totalToday === 0 ? (
          <div className="text-center py-12 glass rounded-xl">
            <Clock className="h-8 w-8 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Nothing logged yet today</p>
            <p className="text-xs text-gray-600 mt-1">
              Type above to log your first activity
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {allTodayActivities.map((activity) => (
              <ActivityFeedItem key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </section>

      {/* ── Goal Progress ── */}
      {goals.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
              Goal Progress
            </h2>
            <Link
              to="/goals"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              All goals →
            </Link>
          </div>

          <div className="space-y-3">
            {goalsLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              goals.slice(0, 5).map((goal) => {
                const progress = goal.progress;
                const percentage = progress?.percentage ?? 0;
                const current = progress?.currentValue ?? 0;

                return (
                  <Link
                    key={goal.id}
                    to={`/goals/${goal.id}`}
                    className="block glass px-4 py-3 rounded-xl hover:border-gray-700/60 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-white">{goal.title}</p>
                      {goal.targetValue && (
                        <span className="text-xs text-gray-500 tabular-nums">
                          {current} / {goal.targetValue} {goal.targetUnit ?? ''}
                        </span>
                      )}
                    </div>
                    {goal.targetValue && (
                      <ProgressBar percentage={percentage} heightClass="h-1.5" />
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </section>
      )}
    </div>
  );
}
