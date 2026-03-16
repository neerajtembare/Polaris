/**
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
import { GoalCard } from '../components/goals/GoalCard.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { LoadingScreen } from '../components/ui/Spinner.tsx';
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

  const { data: goals = [], isLoading, isError } = useGoals({
    status:          statusFilter,
    includeProgress: true,
  });

  const deleteGoal = useDeleteGoal();

  // Group goals by timeframe
  const grouped = TIMEFRAME_ORDER.reduce<Record<GoalTimeframe, typeof goals>>(
    (acc, tf) => {
      acc[tf] = goals.filter((g) => g.timeframe === tf);
      return acc;
    },
    { long: [], medium: [], short: [] }
  );

  const hasAnyGoal = goals.length > 0;

  // ——— Render ———
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Goals</h1>
            <p className="text-sm text-gray-400 mt-0.5">Track what you&apos;re working toward</p>
          </div>
          <Link
            to="/goals/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <span aria-hidden="true">+</span> New goal
          </Link>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1 mb-6 bg-gray-900 rounded-lg p-1 w-fit">
          {(['active', 'all', 'archived'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={[
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize',
                statusFilter === s
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white',
              ].join(' ')}
            >
              {s}
            </button>
          ))}
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
                        onDelete={(id) => {
                          if (window.confirm('Delete this goal? This cannot be undone.')) {
                            deleteGoal.mutate(id);
                          }
                        }}
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
