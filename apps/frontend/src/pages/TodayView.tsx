/**
 * DEAD CODE — BrowserRouter is not mounted in App.tsx. This page is never rendered.
 * Do NOT delete yet — reserved for Phase 2+ when React Router is wired up.
 *
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
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ActivityCard } from '../components/activities/ActivityCard.tsx';
import { LogActivityForm } from '../components/activities/LogActivityForm.tsx';
// QuickLogBar removed (Phase 0B) — component deleted, page is dead code
import { Spinner } from '../components/ui/Spinner.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import {
  useTodayActivities,
  useUpdateActivity,
  useDeleteActivity,
  type ListedActivity,
} from '../hooks/useActivities.ts';
import { useGoals } from '../hooks/useGoals.ts';
import { useMetrics } from '../hooks/useMetrics.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format "Monday, 26 May 2025" */
function formatTodayHeading(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return format(d, 'EEEE, MMMM d');
}

// ---------------------------------------------------------------------------
// Sub-component: column
// ---------------------------------------------------------------------------

interface ColumnProps {
  heading:    string;
  badge?:     string | number;
  activities: ListedActivity[];
  onComplete: (id: string, value?: number) => void;
  onSkip:     (id: string) => void;
  onUndo:     (id: string) => void;
  onDelete:   (id: string) => void;
  onEdit:     (activity: ListedActivity) => void;
  pendingIds: Set<string>;
  emptyText:  string;
  accentClass?: string;
}

function Column({
  heading,
  badge,
  activities,
  onComplete,
  onSkip,
  onUndo,
  onDelete,
  onEdit,
  pendingIds,
  emptyText,
  accentClass = 'border-t-2 border-gray-700',
}: ColumnProps) {
  return (
    <div className={`flex flex-col gap-3 bg-gray-900/20 rounded-xl p-4 ${accentClass}`}>
      {/* Column heading */}
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          {heading}
        </h2>
        {badge !== undefined && (
          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-gray-800 text-xs font-medium text-gray-400">
            {badge}
          </span>
        )}
      </div>

      {activities.length === 0 ? (
        <p className="text-sm text-gray-600 italic pt-1">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {activities.map((activity) => (
            <li key={activity.id}>
              <ActivityCard
                activity={activity}
                onComplete={onComplete}
                onSkip={onSkip}
                onUndo={onUndo}
                onDelete={onDelete}
                onEdit={onEdit}
                isPending={pendingIds.has(activity.id)}
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
  const [showFullForm,  setShowFullForm]  = useState(false);
  const [editActivity,  setEditActivity]  = useState<ListedActivity | undefined>(undefined);
  const [pendingIds,    setPendingIds]    = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = useTodayActivities();
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();
  const { data: metrics } = useMetrics('week');

  const planned   = data?.planned   ?? [];
  const completed = data?.completed ?? [];
  const skipped   = data?.skipped   ?? [];
  const todayDate = data?.date ?? new Date().toISOString().split('T')[0] as string;

  function addPending(id: string) {
    setPendingIds((prev) => new Set(prev).add(id));
  }
  function removePending(id: string) {
    setPendingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
  }

  function handleComplete(id: string, value?: number) {
    addPending(id);
    updateActivity.mutate(
      { id, data: { status: 'completed', ...(value !== undefined && { value }) } },
      { onSettled: () => removePending(id) }
    );
  }
  function handleSkip(id: string) {
    addPending(id);
    updateActivity.mutate(
      { id, data: { status: 'skipped' } },
      { onSettled: () => removePending(id) }
    );
  }
  function handleUndo(id: string) {
    addPending(id);
    updateActivity.mutate(
      { id, data: { status: 'planned' } },
      { onSettled: () => removePending(id) }
    );
  }
  function handleDelete(id: string) {
    addPending(id);
    deleteActivity.mutate(id, { onSettled: () => removePending(id) });
  }
  function handleEdit(activity: ListedActivity) {
    setEditActivity(activity);
    setShowFullForm(true);
  }
  const totalToday = planned.length + completed.length + skipped.length;
  const { data: goals = [] } = useGoals({ status: 'active' });

  // ——— Render ———
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Page header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">Today</h1>
              {metrics && metrics.currentStreak > 0 && (
                <span
                  title={`${metrics.currentStreak}-day streak`}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-900/50 border border-orange-700/50 text-orange-300 text-xs font-semibold"
                >
                  🔥 {metrics.currentStreak}d streak
                </span>
              )}
            </div>
            {data && (
              <p className="text-sm text-gray-500 mt-0.5">{formatTodayHeading(todayDate)}</p>
            )}
          </div>
          {/* Primary log CTA */}
          <button
            onClick={() => setShowFullForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-indigo-900/30"
          >
            <Plus className="w-4 h-4" />
            Log activity
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
            description={
              goals.length === 0
                ? 'Create a goal first to link activities, then log your first activity.'
                : 'Log an activity to start tracking your day.'
            }
            action={
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {goals.length === 0 && (
                  <Link
                    to="/goals/new"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Create a goal
                  </Link>
                )}
                <button
                  onClick={() => setShowFullForm(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Log activity
                </button>
              </div>
            }
          />
        )}

        {/* Three-column kanban grid */}
        {!isLoading && !isError && totalToday > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Column
              heading="Planned"
              badge={planned.length}
              activities={planned}
              onComplete={handleComplete}
              onSkip={handleSkip}
              onUndo={handleUndo}
              onDelete={handleDelete}
              onEdit={handleEdit}
              pendingIds={pendingIds}
              emptyText="Nothing left to do today 🎉"
              accentClass="border-t-2 border-gray-600"
            />
            <Column
              heading="Completed"
              badge={completed.length}
              activities={completed}
              onComplete={handleComplete}
              onSkip={handleSkip}
              onUndo={handleUndo}
              onDelete={handleDelete}
              onEdit={handleEdit}
              pendingIds={pendingIds}
              emptyText="No completions yet — keep going!"
              accentClass="border-t-2 border-emerald-500/70"
            />
            <Column
              heading="Skipped"
              badge={skipped.length}
              activities={skipped}
              onComplete={handleComplete}
              onSkip={handleSkip}
              onUndo={handleUndo}
              onDelete={handleDelete}
              onEdit={handleEdit}
              pendingIds={pendingIds}
              emptyText="Nothing skipped"
              accentClass="border-t-2 border-orange-500/40"
            />
          </div>
        )}



      {/* Full-form modal (opened from edit icon or empty state) */}
      {showFullForm && (
        <LogActivityForm
          {...(editActivity && { editActivity })}
          onClose={() => { setShowFullForm(false); setEditActivity(undefined); }}
          onSuccess={() => { setShowFullForm(false); setEditActivity(undefined); }}
        />
      )}
    </div>
  );
}
