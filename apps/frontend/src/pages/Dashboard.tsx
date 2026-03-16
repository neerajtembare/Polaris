/**
 * @file pages/Dashboard.tsx
 * @description Default landing page — live stats, activity heatmap, and
 *   goal progress overview powered by the /api/metrics/dashboard endpoint.
 * @module @polaris/frontend/pages
 *
 * @dependencies
 * - hooks/useMetrics (useMetrics, MetricsPeriod)
 * - components/layout/AppLayout
 * - components/ui/ProgressBar, Spinner
 *
 * @relatedFiles
 * - src/hooks/useMetrics.ts
 * - src/App.tsx
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ProgressBar } from '../components/ui/ProgressBar.tsx';
import { Spinner } from '../components/ui/Spinner.tsx';
import {
  useMetrics,
  type MetricsPeriod,
  type DashboardMetrics,
} from '../hooks/useMetrics.ts';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StatCardProps {
  label:     string;
  value:     string | number;
  sublabel?: string;
  accent?:   boolean;
}

function StatCard({ label, value, sublabel, accent = false }: StatCardProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p
        className={[
          'mt-1 text-3xl font-bold tabular-nums',
          accent ? 'text-indigo-400' : 'text-white',
        ].join(' ')}
      >
        {value}
      </p>
      {sublabel && <p className="mt-0.5 text-xs text-gray-500">{sublabel}</p>}
    </div>
  );
}

// ——— Heatmap ———

function Heatmap({ activityByDay }: { activityByDay: Record<string, number> }) {
  const entries = Object.entries(activityByDay);
  if (entries.length === 0) return null;

  const max = Math.max(...entries.map(([, v]) => v), 1);

  function cellColor(count: number) {
    if (count === 0) return 'bg-gray-800';
    const pct = count / max;
    if (pct <= 0.25) return 'bg-indigo-900';
    if (pct <= 0.5)  return 'bg-indigo-700';
    if (pct <= 0.75) return 'bg-indigo-500';
    return 'bg-indigo-400';
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
        Activity frequency
      </p>
      <div className="flex flex-wrap gap-1">
        {entries.map(([date, count]) => (
          <div
            key={date}
            title={`${date}: ${count} activit${count === 1 ? 'y' : 'ies'}`}
            className={`w-4 h-4 rounded-sm ${cellColor(count)} shrink-0`}
          />
        ))}
      </div>
    </div>
  );
}

// ——— Goal progress list ———

function GoalProgressList({ metrics }: { metrics: DashboardMetrics }) {
  const { goalProgress } = metrics;

  if (goalProgress.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-6 text-center">
        <p className="text-sm text-gray-500">No goal activity this period.</p>
        <Link to="/goals/new" className="mt-3 inline-block text-sm text-indigo-400 hover:underline">
          Create a goal →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 space-y-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Goal progress</p>
      {goalProgress.map((g) => (
        <div key={g.goalId}>
          <div className="flex items-center justify-between mb-1">
            <Link
              to={`/goals/${g.goalId}`}
              className="text-sm font-medium text-white hover:text-indigo-300 transition-colors truncate max-w-[70%]"
            >
              {g.goalTitle}
            </Link>
            <span className="text-xs text-gray-400 tabular-nums ml-2 shrink-0">
              {g.targetValue !== null
                ? `${g.currentValue} / ${g.targetValue}${g.unit ? ` ${g.unit}` : ''}`
                : `${g.currentValue}${g.unit ? ` ${g.unit}` : ''}`}
            </span>
          </div>
          <ProgressBar percentage={g.percentage ?? 0} heightClass="h-1.5" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

const PERIOD_TABS: { label: string; value: MetricsPeriod }[] = [
  { label: 'Week',  value: 'week'  },
  { label: 'Month', value: 'month' },
  { label: 'Year',  value: 'year'  },
];

/**
 * Dashboard page — activity stats, heatmap, and goal progress for the selected period.
 */
export function Dashboard() {
  const [period, setPeriod] = useState<MetricsPeriod>('week');
  const { data, isLoading, isError } = useMetrics(period);

  const completionRate =
    data && data.totalActivities > 0
      ? Math.round((data.completedActivities / data.totalActivities) * 100)
      : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-gray-400 mt-0.5">Overview of your tracking activity</p>
          </div>

          {/* Period picker */}
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
            {PERIOD_TABS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                className={[
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  period === value
                    ? 'bg-gray-700 text-white shadow'
                    : 'text-gray-400 hover:text-gray-200',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Spinner />
          </div>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <div className="rounded-xl bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">
            Failed to load dashboard metrics. Refresh to try again.
          </div>
        )}

        {/* Content */}
        {data && !isLoading && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Completed"
                value={data.completedActivities}
                sublabel={`of ${data.totalActivities} total`}
              />
              <StatCard
                label="Completion rate"
                value={`${completionRate}%`}
                accent
              />
              <StatCard
                label="Current streak"
                value={`${data.currentStreak}d`}
                sublabel={`Longest: ${data.longestStreak}d`}
              />
              <StatCard
                label="Goals active"
                value={data.goalsTouched}
                sublabel="this period"
              />
            </div>

            {/* Heatmap */}
            <Heatmap activityByDay={data.activityByDay} />

            {/* Goal progress */}
            <GoalProgressList metrics={data} />
          </>
        )}

      </div>
  );
}
