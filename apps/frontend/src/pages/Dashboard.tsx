/**
 * DEAD CODE — BrowserRouter is not mounted in App.tsx. This page is never rendered.
 * Do NOT delete yet — reserved for Phase 2+ when React Router is wired up.
 *
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

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ProgressBar } from '../components/ui/ProgressBar.tsx';
import { Spinner } from '../components/ui/Spinner.tsx';
import {
  useMetrics,
  type MetricsPeriod,
  type DashboardMetrics,
} from '../hooks/useMetrics.ts';
import { api, ApiRequestError } from '../services/api.ts';
import type { ApiSuccess } from '@polaris/shared';
import type { AIWeeklyAnalysis } from '@polaris/shared';

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
    <div className="glass px-5 py-4 rounded-2xl hover:border-gray-700/60 transition-colors">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">{label}</p>
      <p
        className={[
          'mt-1.5 text-3xl font-bold tabular-nums',
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
  const entries = Object.entries(activityByDay).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return null;

  const max = Math.max(...entries.map(([, v]) => v), 1);

  function cellColor(count: number) {
    if (count === 0) return 'bg-gray-800/80';
    const pct = count / max;
    if (pct <= 0.25) return 'bg-indigo-950 border border-indigo-800/40';
    if (pct <= 0.5)  return 'bg-indigo-700';
    if (pct <= 0.75) return 'bg-indigo-500';
    return 'bg-indigo-400 shadow-[0_0_4px_rgba(99,102,241,0.5)]';
  }

  // Build week rows: group by ISO week so cells align to day-of-week columns
  type WeekMap = Map<string, (readonly [string, number])[]>;
  const weeks: WeekMap = new Map();
  for (const entry of entries) {
    const d    = new Date(entry[0] + 'T00:00:00');
    const day  = d.getDay(); // 0=Sun
    const diff = (day === 0 ? -6 : 1) - day; // shift to Monday-start
    const mon  = new Date(d);
    mon.setDate(d.getDate() + diff);
    const key = mon.toISOString().split('T')[0] as string;
    if (!weeks.has(key)) weeks.set(key, []);
    weeks.get(key)!.push(entry as readonly [string, number]);
  }

  const weekKeys = Array.from(weeks.keys()).sort();
  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="glass px-5 py-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-3">
        Activity frequency
      </p>
      <div className="overflow-x-auto">
        <div className="flex gap-1.5">
          {/* Day labels column */}
          <div className="flex flex-col gap-1 pt-0 mr-1">
            {DAY_LABELS.map((d, i) => (
              <div key={i} className="w-3.5 h-3.5 text-[9px] text-gray-600 flex items-center justify-center">
                {d}
              </div>
            ))}
          </div>
          {/* Week columns */}
          {weekKeys.map((wk) => {
            const dayEntries = weeks.get(wk)!;
            const dayMap: Record<number, readonly [string, number]> = {};
            for (const e of dayEntries) {
              const d   = new Date(e[0] + 'T00:00:00');
              const dow = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
              dayMap[dow] = e;
            }
            // Month label: show on first week where month changes
            const firstDate  = dayMap[0] ? new Date(dayMap[0][0] + 'T00:00:00') : null;
            const monthLabel = firstDate ? format(firstDate, 'MMM') : '';

            return (
              <div key={wk} className="flex flex-col gap-1">
                <div className="text-[9px] text-gray-600 h-3 leading-none">{monthLabel}</div>
                {Array.from({ length: 7 }, (_, i) => {
                  const entry = dayMap[i];
                  const [date, count] = entry ?? [null, 0];
                  return (
                    <div
                      key={i}
                      title={date ? `${date}: ${count} activit${count === 1 ? 'y' : 'ies'}` : ''}
                      className={`w-3.5 h-3.5 rounded-sm ${cellColor(count)} shrink-0 transition-colors`}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ——— Weekly analysis modal ———

interface WeeklyAnalysisModalProps {
  onClose: () => void;
  analysis: AIWeeklyAnalysis | null;
  isLoading: boolean;
  error: string | null;
}

function WeeklyAnalysisModal({ onClose, analysis, isLoading, error }: WeeklyAnalysisModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="weekly-analysis-title"
    >
      <div
        className="glass max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-800/60 flex items-center justify-between">
          <h2 id="weekly-analysis-title" className="text-base font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Weekly Analysis
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          )}
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          {analysis && !isLoading && (
            <>
              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-indigo-900/50 text-indigo-300 border border-indigo-700/50">
                {analysis.provider}
              </span>
              <p className="text-sm text-gray-300">{analysis.summary}</p>
              {analysis.insights.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Insights</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                    {analysis.insights.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.suggestions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Suggestions</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                    {analysis.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ——— Goal progress list ———

function GoalProgressList({ metrics }: { metrics: DashboardMetrics }) {
  const { goalProgress } = metrics;

  if (goalProgress.length === 0) {
    return (
      <div className="glass px-5 py-6 text-center">
        <p className="text-sm text-gray-500">No goal activity this period.</p>
        <Link to="/goals/new" className="mt-3 inline-block text-sm text-indigo-400 hover:underline">
          Create a goal →
        </Link>
      </div>
    );
  }

  return (
    <div className="glass px-5 py-4 space-y-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">Goal progress</p>
      {goalProgress.map((g) => (
        <div key={g.goalId}>
          <div className="flex items-center justify-between mb-1.5">
            <Link
              to={`/goals/${g.goalId}`}
              className="text-sm font-medium text-gray-200 hover:text-indigo-300 transition-colors truncate max-w-[70%]"
            >
              {g.goalTitle}
            </Link>
            <span className="text-xs text-indigo-400 tabular-nums ml-2 shrink-0 font-medium">
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

const STORAGE_KEY = 'polaris:dashboard:period';

/**
 * Dashboard page — activity stats, heatmap, and goal progress for the selected period.
 */
export function Dashboard() {
  const [period, setPeriod] = useState<MetricsPeriod>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored === 'week' || stored === 'month' || stored === 'year') ? stored : 'week';
  });
  const { data, isLoading, isError } = useMetrics(period);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIWeeklyAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Persist period selection
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, period);
  }, [period]);

  // Dynamic greeting
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();
  const todayLabel = format(new Date(), 'EEEE, MMMM d');

  async function handleAnalyzeWeek() {
    setShowAnalysis(true);
    setAnalysisLoading(true);
    setAnalysisResult(null);
    setAnalysisError(null);
    try {
      const res = await api.post<ApiSuccess<AIWeeklyAnalysis>>('/ai/analyze-week', {});
      setAnalysisResult(res.data);
    } catch (err) {
      setAnalysisError(
        err instanceof ApiRequestError ? err.message : 'AI analysis unavailable.'
      );
    } finally {
      setAnalysisLoading(false);
    }
  }

  const completionRate =
    data && data.totalActivities > 0
      ? Math.round((data.completedActivities / data.totalActivities) * 100)
      : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Page header — greeting */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{greeting}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{todayLabel}</p>
          </div>

          {/* Period picker + Analyze Week */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleAnalyzeWeek}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Analyze Week
            </button>
            <div className="flex gap-1 bg-gray-900/60 border border-gray-800/50 rounded-lg p-1">
            {PERIOD_TABS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                className={[
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  period === value
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-400 hover:text-gray-200',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
            </div>
          </div>
        </div>

        {/* Weekly analysis modal */}
        {showAnalysis && (
          <WeeklyAnalysisModal
            onClose={() => setShowAnalysis(false)}
            analysis={analysisResult}
            isLoading={analysisLoading}
            error={analysisError}
          />
        )}

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
