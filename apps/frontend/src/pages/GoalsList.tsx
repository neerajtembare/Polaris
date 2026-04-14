/**
 * DEAD CODE — BrowserRouter is not mounted in App.tsx. This page is never rendered.
 * Do NOT delete yet — reserved for Phase 2+ when React Router is wired up.
 *
 * @file pages/GoalsList.tsx
 * @description Goals list page — displays all goals grouped by timeframe.
 *   Supports filter by status (active/archived/all).
 *   Entry point for navigating to goal details or creating a new goal.
 * @module @polaris/frontend/pages
 *
 * @dependencies
 * - react-router-dom (Link)
 * - hooks/useGoals (useGoals, useDeleteGoal)
 * - components/layout/AppLayout
 * - components/goals/GoalCard
 * - components/ui/EmptyState
 * - components/ui/Spinner
 *
 * @relatedFiles
 * - src/hooks/useGoals.ts
 * - src/components/goals/GoalCard.tsx
 * - src/App.tsx
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { GoalCard } from '../components/goals/GoalCard.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { LoadingScreen } from '../components/ui/Spinner.tsx';
import { ConfirmModal } from '../components/ui/ConfirmModal.tsx';
import { useGoals, useDeleteGoal } from '../hooks/useGoals.ts';
import type { GoalTimeframe, GoalStatus } from '@polaris/shared';

// ---------------------------------------------------------------------------
// Grouping helpers
// ---------------------------------------------------------------------------

const TIMEFRAME_ORDER: GoalTimeframe[] = ['long', 'medium', 'short'];
const TIMEFRAME_TITLES: Record<GoalTimeframe, string> = {
  long:   'Long-term goals',
  medium: 'Medium-term goals',
  short:  'Short-term goals',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type StatusFilter = GoalStatus | 'all';

export function GoalsList() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [search, setSearch] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: goals = [], isLoading, isError } = useGoals({
    status:          statusFilter,
    includeProgress: true,
  });

  const deleteGoal = useDeleteGoal();

  // Client-side search filter
  const filteredGoals = search.trim()
    ? goals.filter((g) => g.title.toLowerCase().includes(search.toLowerCase()))
    : goals;

  // Group goals by timeframe
  const grouped = TIMEFRAME_ORDER.reduce<Record<GoalTimeframe, typeof filteredGoals>>(
    (acc, tf) => {
      acc[tf] = filteredGoals.filter((g) => g.timeframe === tf);
      return acc;
    },
    { long: [], medium: [], short: [] }
  );

  const hasAnyGoal = filteredGoals.length > 0;
  const pendingDeleteGoal = pendingDeleteId ? goals.find((g) => g.id === pendingDeleteId) : null;

  // ——— Render ———
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">

      <ConfirmModal
        isOpen={!!pendingDeleteId}
        message="Delete this goal?"
        detail={pendingDeleteGoal?.title}
        onConfirm={() => { if (pendingDeleteId) deleteGoal.mutate(pendingDeleteId); setPendingDeleteId(null); }}
        onCancel={() => setPendingDeleteId(null)}
      />

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Goals</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track what you&apos;re working toward</p>
          </div>
          <Link
            to="/goals/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <span aria-hidden="true">+</span> New goal
          </Link>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1 mb-4 bg-gray-900/60 border border-gray-800/50 rounded-lg p-1 w-fit">
          {(['active', 'all', 'archived'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={[
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize',
                statusFilter === s
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-gray-400 hover:text-white',
              ].join(' ')}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search goals…"
            className="w-full bg-gray-900/60 border border-gray-800/50 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Loading */}
        {isLoading && <LoadingScreen />}

        {/* Error */}
        {isError && (
          <div className="rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">
            Failed to load goals. Please refresh the page.
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && !hasAnyGoal && (
          <EmptyState
            icon="🎯"
            title={statusFilter === 'archived' ? 'No archived goals' : 'No goals yet'}
            {...(statusFilter === 'active' && {
              description: 'Create your first goal to start tracking your progress.',
              action: (
                <Link
                  to="/goals/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Create a goal
                </Link>
              ),
            })}
          />
        )}

        {/* Goals grouped by timeframe */}
        {!isLoading && !isError && hasAnyGoal && (
          <div className="space-y-8">
            {TIMEFRAME_ORDER.map((tf) => {
              const tfGoals = grouped[tf];
              if (tfGoals.length === 0) return null;
              return (
                <section key={tf}>
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                    {TIMEFRAME_TITLES[tf]}
                  </h2>
                  <div className="grid gap-3">
                    {tfGoals.map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        onDelete={(id) => setPendingDeleteId(id)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

      </div>
  );
}
