/**
 * @file components/activities/ActivityCard.tsx
 * @description Card for a single activity with status actions (complete / skip)
 *   and a delete button. Used in both TodayView and ActivitiesList.
 * @module @polaris/frontend/components/activities
 *
 * @dependencies
 * - hooks/useActivities (useUpdateActivity, useDeleteActivity)
 * - components/ui/Badge (StatusBadge)
 *
 * @relatedFiles
 * - src/pages/TodayView.tsx
 * - src/pages/ActivitiesList.tsx
 * - src/hooks/useActivities.ts
 */

import { StatusBadge } from '../ui/Badge.tsx';
import type { ListedActivity } from '../../hooks/useActivities.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActivityCardProps {
  activity: ListedActivity;
  /** Called when user marks the activity complete */
  onComplete: (id: string) => void;
  /** Called when user marks the activity skipped */
  onSkip: (id: string) => void;
  /** Called when user deletes the activity */
  onDelete: (id: string) => void;
  /** Whether mutation is in flight (disables buttons) */
  isPending?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Displays one activity row with:
 * - Title, optional value/unit, optional goal link
 * - Status badge
 * - Action buttons: Complete / Skip (only shown when status is 'planned')
 * - Delete button (always shown)
 */
export function ActivityCard({
  activity,
  onComplete,
  onSkip,
  onDelete,
  isPending = false,
}: ActivityCardProps) {
  const isPlanned   = activity.status === 'planned';
  const isCompleted = activity.status === 'completed';

  return (
    <article className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">

      {/* Top row: title + delete */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-snug">{activity.title}</p>

          {/* value / unit */}
          {activity.value !== null && (
            <p className="mt-0.5 text-xs text-indigo-400 font-medium tabular-nums">
              {activity.value} {activity.unit ?? ''}
            </p>
          )}

          {/* goal link */}
          {activity.goalTitle && (
            <p className="mt-0.5 text-xs text-gray-500">
              Goal: <span className="text-gray-400">{activity.goalTitle}</span>
            </p>
          )}

          {/* notes */}
          {activity.notes && (
            <p className="mt-1 text-xs text-gray-500 line-clamp-2">{activity.notes}</p>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={() => onDelete(activity.id)}
          disabled={isPending}
          aria-label={`Delete: ${activity.title}`}
          className="text-gray-600 hover:text-red-400 transition-colors p-1 -mr-1 flex-shrink-0 disabled:opacity-40"
        >
          ✕
        </button>
      </div>

      {/* Bottom row: badge + actions */}
      <div className="mt-3 flex items-center justify-between">
        <StatusBadge status={activity.status} />

        {/* Actions only relevant for planned / completed */}
        {(isPlanned || isCompleted) && (
          <div className="flex gap-2">
            {isPlanned && (
              <>
                <button
                  onClick={() => onComplete(activity.id)}
                  disabled={isPending}
                  className="px-2.5 py-1 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                >
                  ✓ Done
                </button>
                <button
                  onClick={() => onSkip(activity.id)}
                  disabled={isPending}
                  className="px-2.5 py-1 bg-orange-900/40 hover:bg-orange-900/70 text-orange-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                >
                  Skip
                </button>
              </>
            )}
            {isCompleted && (
              <button
                onClick={() => onSkip(activity.id)}
                disabled={isPending}
                className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
              >
                Undo
              </button>
            )}
          </div>
        )}
      </div>

    </article>
  );
}
