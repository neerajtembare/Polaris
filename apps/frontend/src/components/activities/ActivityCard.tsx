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
import { Hash, Timer, CheckCircle } from 'lucide-react';
import { StatusBadge } from '../ui/Badge.tsx';
import { ConfirmModal } from '../ui/ConfirmModal.tsx';
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
  /** Called when user wants to edit the activity — opens the edit form */
  onEdit?: (activity: ListedActivity) => void;
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
  onEdit,
  isPending = false,
}: ActivityCardProps) {
  const isPlanned   = activity.status === 'planned';
  const isCompleted = activity.status === 'completed';

  // Inline value prompt state (only for quantity/duration when no value set yet)
  const needsValuePrompt =
    activity.activityType === 'quantity' || activity.activityType === 'duration';
  const [showValuePrompt, setShowValuePrompt] = useState(false);
  const [promptValue,     setPromptValue]     = useState('');
  const [showConfirm,     setShowConfirm]     = useState(false);

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

  const TypeIcon =
    activity.activityType === 'quantity'   ? Hash :
    activity.activityType === 'duration'   ? Timer :
    CheckCircle;

  return (
    <>
      <ConfirmModal
        isOpen={showConfirm}
        message="Delete this activity?"
        detail={activity.title}
        confirmLabel="Delete"
        onConfirm={() => { setShowConfirm(false); onDelete(activity.id); }}
        onCancel={() => setShowConfirm(false)}
      />

    <article className="glass hover:border-gray-700/60 transition-all duration-150 p-4">

      {/* Top row: type icon + title + actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <TypeIcon className="w-3.5 h-3.5 text-gray-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-100 leading-snug">{activity.title}</p>

            {/* value / unit */}
            {activity.value !== null && (
              <p className="mt-0.5 text-xs text-indigo-400 font-semibold tabular-nums">
                {activity.value} {activity.unit ?? ''}
              </p>
            )}

            {/* goal link */}
            {activity.goalTitle && (
              <p className="mt-0.5 text-xs text-gray-600">
                <span className="text-gray-500">{activity.goalTitle}</span>
              </p>
            )}

            {/* notes */}
            {activity.notes && (
              <p className="mt-1 text-xs text-gray-500 line-clamp-2">{activity.notes}</p>
            )}
          </div>
        </div>

        {/* Actions: edit + delete */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {onEdit && (
            <button
              onClick={() => onEdit(activity)}
              disabled={isPending}
              aria-label={`Edit: ${activity.title}`}
              className="text-gray-700 hover:text-indigo-400 transition-colors p-1.5 rounded-lg hover:bg-indigo-500/10 disabled:opacity-40"
            >
              ✎
            </button>
          )}
          <button
            onClick={() => setShowConfirm(true)}
            disabled={isPending}
            aria-label={`Delete: ${activity.title}`}
            className="text-gray-700 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10 disabled:opacity-40"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Inline value prompt */}
      {showValuePrompt && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-800/80 border border-gray-700/60 px-3 py-2">
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

        {(isPlanned || isCompleted) && (
          <div className="flex gap-2">
            {isPlanned && !showValuePrompt && (
              <>
                <button
                  onClick={handleDoneClick}
                  disabled={isPending}
                  className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                >
                  ✓ Done
                </button>
                <button
                  onClick={() => onSkip(activity.id)}
                  disabled={isPending}
                  className="px-2.5 py-1 bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/30 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                >
                  Skip
                </button>
              </>
            )}
            {isCompleted && (
              <button
                onClick={() => onUndo(activity.id)}
                disabled={isPending}
                className="px-2.5 py-1 bg-gray-800/80 hover:bg-gray-700 text-gray-400 text-xs font-medium rounded-lg border border-gray-700/50 transition-colors disabled:opacity-40"
              >
                Undo
              </button>
            )}
          </div>
        )}
      </div>

    </article>
    </>
  );
}
