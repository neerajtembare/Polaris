/**
 * @file pages/TodayView.tsx
 * @description Today's activity view — three columns (Planned / Completed / Skipped)
 *   with inline complete / skip actions and a quick-log button.
 *   This is the hub for day-to-day activity tracking.
 * @module @polaris/frontend/pages
 *
 * @dependencies
 * - hooks/useActivities (useTodayActivities, useUpdateActivity, useDeleteActivity)
 * - components/activities/ActivityCard
 * - components/activities/LogActivityForm
 * - components/ui/Spinner, EmptyState
 *
 * @relatedFiles
 * - src/hooks/useActivities.ts
 * - src/components/activities/ActivityCard.tsx
 * - src/components/activities/LogActivityForm.tsx
 */

import { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout.tsx';
import { ActivityCard } from '../components/activities/ActivityCard.tsx';
import { LogActivityForm } from '../components/activities/LogActivityForm.tsx';
import { Spinner } from '../components/ui/Spinner.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import {
  useTodayActivities,
  useUpdateActivity,
  useDeleteActivity,
  type ListedActivity,
} from '../hooks/useActivities.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format "Monday 26 May 2025" */
function formatTodayHeading(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Sub-component: column
// ---------------------------------------------------------------------------

interface ColumnProps {
  heading:    string;
  badge?:     string | number;
  activities: ListedActivity[];
  onComplete: (id: string) => void;
  onSkip:     (id: string) => void;
  onDelete:   (id: string) => void;
  isPending:  boolean;
  emptyText:  string;
}

function Column({
  heading,
  badge,
  activities,
  onComplete,
  onSkip,
  onDelete,
  isPending,
  emptyText,
}: ColumnProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Column heading */}
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          {heading}
        </h2>
        {badge !== undefined && badge !== 0 && (
          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-gray-700 text-xs font-medium text-gray-300">
            {badge}
          </span>
        )}
      </div>

      {activities.length === 0 ? (
        <p className="text-sm text-gray-600 italic">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {activities.map((activity) => (
            <li key={activity.id}>
              <ActivityCard
                activity={activity}
                onComplete={onComplete}
                onSkip={onSkip}
                onDelete={onDelete}
                isPending={isPending}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

/**
 * Today view — grouped by status with quick-log CTA.
 */
export function TodayView() {
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isError } = useTodayActivities();
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();

  const planned   = data?.planned   ?? [];
  const completed = data?.completed ?? [];
  const skipped   = data?.skipped   ?? [];
  const todayDate = data?.date ?? new Date().toISOString().split('T')[0] as string;

  function handleComplete(id: string) {
    updateActivity.mutate({ id, data: { status: 'completed' } });
  }
  function handleSkip(id: string) {
    updateActivity.mutate({ id, data: { status: 'skipped' } });
  }
  function handleDelete(id: string) {
    deleteActivity.mutate(id);
  }

  const isPending = updateActivity.isPending || deleteActivity.isPending;
  const totalToday = planned.length + completed.length + skipped.length;

  // ——— Render ———
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Today</h1>
            {data && (
              <p className="text-sm text-gray-400 mt-0.5">{formatTodayHeading(todayDate)}</p>
            )}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <span className="text-base leading-none">+</span> Log activity
          </button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Spinner />
          </div>
        )}

        {/* Error state */}
        {isError && !isLoading && (
          <div className="rounded-xl bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">
            Failed to load today&apos;s activities. Refresh to try again.
          </div>
        )}

        {/* Empty state (nothing planned today) */}
        {!isLoading && !isError && totalToday === 0 && (
          <EmptyState
            icon="📅"
            title="Nothing planned for today"
            description="Log an activity to start tracking your day."
            action={
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Log activity
              </button>
            }
          />
        )}

        {/* Three-column grid */}
        {!isLoading && !isError && totalToday > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Column
              heading="Planned"
              badge={planned.length}
              activities={planned}
              onComplete={handleComplete}
              onSkip={handleSkip}
              onDelete={handleDelete}
              isPending={isPending}
              emptyText="Nothing left to do today 🎉"
            />
            <Column
              heading="Completed"
              badge={completed.length}
              activities={completed}
              onComplete={handleComplete}
              onSkip={handleSkip}
              onDelete={handleDelete}
              isPending={isPending}
              emptyText="No completions yet — keep going!"
            />
            <Column
              heading="Skipped"
              badge={skipped.length}
              activities={skipped}
              onComplete={handleComplete}
              onSkip={handleSkip}
              onDelete={handleDelete}
              isPending={isPending}
              emptyText="Nothing skipped"
            />
          </div>
        )}

      </div>

      {/* Quick-log modal */}
      {showForm && (
        <LogActivityForm
          onClose={() => setShowForm(false)}
          onSuccess={() => setShowForm(false)}
        />
      )}
    </AppLayout>
  );
}
