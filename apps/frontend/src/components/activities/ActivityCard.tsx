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

import { useState } from 'react';
import { StatusBadge } from '../ui/Badge.tsx';
import type { ListedActivity } from '../../hooks/useActivities.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActivityCardProps {
  activity: ListedActivity;
  /** Called when user marks the activity complete. Optional value for quantity/duration. */
  onComplete: (id: string, value?: number) => void;
  /** Called when user marks the activity skipped */
  onSkip: (id: string) => void;
  /** Called when user undoes a completed activity (returns to planned) */
  onUndo: (id: string) => void;
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
 *   For quantity/duration activities "✓ Done" first asks "How many [unit]?" inline.
 * - Undo button (restores completed → planned)
 * - Delete button (always shown)
 */
export function ActivityCard({
  activity,
  onComplete,
  onSkip,
  onUndo,
  onDelete,
  isPending = false,
}: ActivityCardProps) {
  const isPlanned   = activity.status === 'planned';
  const isCompleted = activity.status === 'completed';

  // Inline value prompt state (only for quantity/duration when no value set yet)
  const needsValuePrompt =
    activity.activityType === 'quantity' || activity.activityType === 'duration';
  const [showValuePrompt, setShowValuePrompt] = useState(false);
  const [promptValue,     setPromptValue]     = useState('');

  function handleDoneClick() {
    if (needsValuePrompt && !activity.value) {
      setShowValuePrompt(true);
    } else {
      onComplete(activity.id);
    }
  }

  function handleConfirmValue() {
    const numVal = promptValue.trim() ? Number(promptValue) : undefined;
    onComplete(activity.id, numVal);
    setShowValuePrompt(false);
    setPromptValue('');
  }

  function handleCancelPrompt() {
    setShowValuePrompt(false);
    setPromptValue('');
  }

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

      {/* Inline value prompt */}
      {showValuePrompt && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2">
          <label className="text-xs text-gray-400 shrink-0">
            How many{activity.unit ? ` ${activity.unit}` : ''}?
          </label>
          <input
            type="number"
            min={0}
            step="any"
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            placeholder="0"
            autoFocus
            className="flex-1 min-w-0 bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={handleConfirmValue}
            disabled={isPending}
            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-40"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={handleCancelPrompt}
            className="px-2 py-1 text-gray-500 hover:text-gray-300 text-xs transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Bottom row: badge + actions */}
      <div className="mt-3 flex items-center justify-between">
        <StatusBadge status={activity.status} />

        {/* Actions only relevant for planned / completed */}
        {(isPlanned || isCompleted) && (
          <div className="flex gap-2">
            {isPlanned && !showValuePrompt && (
              <>
                <button
                  onClick={handleDoneClick}
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
                onClick={() => onUndo(activity.id)}
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
