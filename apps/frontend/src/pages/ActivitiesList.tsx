/**
 * @file pages/ActivitiesList.tsx
 * @description Full activities log page. Supports filtering by status (all /
 *   planned / completed / skipped) and by a specific date. Lets the user log
 *   a new activity via the LogActivityForm modal and inline-complete/skip/delete
 *   existing ones through ActivityCard.
 * @module @polaris/frontend/pages
 *
 * @dependencies
 * - hooks/useActivities (useActivities, useUpdateActivity, useDeleteActivity)
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
import { ActivityCard } from '../components/activities/ActivityCard.tsx';
import { LogActivityForm } from '../components/activities/LogActivityForm.tsx';
import { Spinner } from '../components/ui/Spinner.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import {
  useActivities,
  useUpdateActivity,
  useDeleteActivity,
  type ListedActivity,
} from '../hooks/useActivities.ts';
import type { ActivityStatus } from '@polaris/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterStatus = 'all' | ActivityStatus;

interface FilterTab {
  label:  string;
  value:  FilterStatus;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_TABS: FilterTab[] = [
  { label: 'All',       value: 'all' },
  { label: 'Planned',   value: 'planned' },
  { label: 'Completed', value: 'completed' },
  { label: 'Skipped',   value: 'skipped' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Activities list page — full activity log with filters and quick-log CTA.
 */
export function ActivitiesList() {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [dateFilter,   setDateFilter]   = useState('');
  const [showForm,     setShowForm]     = useState(false);

  const queryFilter = {
    ...(statusFilter !== 'all' && { status: statusFilter as ActivityStatus }),
    ...(dateFilter              && { date:   dateFilter }),
  };

  const { data: activitiesRes, isLoading, isError } = useActivities(queryFilter);
  const activities: ListedActivity[] = activitiesRes?.data ?? [];
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();

  function handleComplete(id: string, value?: number) {
    updateActivity.mutate({
      id,
      data: { status: 'completed', ...(value !== undefined && { value }) },
    });
  }

  function handleSkip(id: string) {
    updateActivity.mutate({ id, data: { status: 'skipped' } });
  }

  function handleUndo(id: string) {
    updateActivity.mutate({ id, data: { status: 'planned' } });
  }

  function handleDelete(id: string) {
    deleteActivity.mutate(id);
  }

  const isPending = updateActivity.isPending || deleteActivity.isPending;

  // ——— Render ———
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Activities</h1>
            <p className="text-sm text-gray-400 mt-0.5">Your full activity log</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <span className="text-base leading-none">+</span> Log activity
          </button>
        </div>

        {/* Filters row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">

          {/* Status tabs */}
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
            {STATUS_TABS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={[
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  statusFilter === value
                    ? 'bg-gray-700 text-white shadow'
                    : 'text-gray-400 hover:text-gray-200',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Date filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            title="Filter by date"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark]"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-xs text-gray-500 hover:text-gray-200 transition-colors"
            >
              Clear date
            </button>
          )}
        </div>

        {/* Content */}
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Spinner />
          </div>
        )}

        {isError && !isLoading && (
          <div className="rounded-xl bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">
            Failed to load activities. Refresh to try again.
          </div>
        )}

        {!isLoading && !isError && activities.length === 0 && (
          <EmptyState
            icon="📋"
            title="No activities found"
            description={
              statusFilter !== 'all'
                ? `No ${statusFilter} activities for the selected filters.`
                : 'Start by logging your first activity.'
            }
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

        {!isLoading && !isError && activities.length > 0 && (
          <ul className="space-y-3">
            {activities.map((activity) => (
              <li key={activity.id}>
                <ActivityCard
                  activity={activity}
                  onComplete={handleComplete}
                  onSkip={handleSkip}
                  onUndo={handleUndo}
                  onDelete={handleDelete}
                  isPending={isPending}
                />
              </li>
            ))}
          </ul>
        )}



      {/* Log-activity modal */}
      {showForm && (
        <LogActivityForm
          onClose={() => setShowForm(false)}
          onSuccess={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
