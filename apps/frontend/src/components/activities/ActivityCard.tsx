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
import { cn } from '../../lib/utils';
import { StatusBadge } from '../ui/Badge.tsx';
import { ConfirmModal } from '../ui/ConfirmModal.tsx';
import type { ListedActivity } from '../../hooks/useActivities.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActivityCardProps {
  activity: ListedActivity;
  /** Theme — drives all conditional styling */
  isDark?: boolean;
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
  isDark = true,
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
    if (promptValue.trim() && isNaN(Number(promptValue.trim()))) return;
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

    <article className={cn(
      'rounded-2xl border transition-all duration-150 p-4',
      isDark
        ? 'bg-white/3 border-white/10 hover:border-white/20'
        : 'bg-surface-container-low border-outline-variant/15 hover:border-outline-variant/30'
    )}>

      {/* Top row: type icon + title + actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <TypeIcon className={cn('w-3.5 h-3.5 mt-0.5 flex-shrink-0', isDark ? 'text-dark-on-surface-variant/50' : 'text-on-surface-variant/50')} aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-semibold leading-snug', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>{activity.title}</p>

            {/* value / unit */}
            {activity.value !== null && (
              <p className={cn('mt-0.5 text-xs font-semibold tabular-nums', isDark ? 'text-dark-primary' : 'text-primary')}>
                {activity.value} {activity.unit ?? ''}
              </p>
            )}

            {/* goal link */}
            {activity.goalTitle && (
              <p className={cn('mt-0.5 text-xs', isDark ? 'text-dark-on-surface-variant/60' : 'text-on-surface-variant/60')}>
                <span>{activity.goalTitle}</span>
              </p>
            )}

            {/* notes */}
            {activity.notes && (
              <p className={cn('mt-1 text-xs line-clamp-2', isDark ? 'text-dark-on-surface-variant/60' : 'text-on-surface-variant/60')}>{activity.notes}</p>
            )}

            {/* tags */}
            {activity.tags && activity.tags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {activity.tags.map((tag) => (
                  <span
                    key={tag}
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-medium',
                      isDark
                        ? 'bg-dark-primary/10 text-dark-primary/70'
                        : 'bg-primary/8 text-primary/70'
                    )}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
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
              className={cn('transition-colors p-1.5 rounded-lg disabled:opacity-40',
                isDark ? 'text-dark-on-surface-variant/40 hover:text-dark-primary hover:bg-dark-primary/10' : 'text-on-surface-variant/40 hover:text-primary hover:bg-primary/10')}
            >
              ✎
            </button>
          )}
          <button
            onClick={() => setShowConfirm(true)}
            disabled={isPending}
            aria-label={`Delete: ${activity.title}`}
            className={cn('transition-colors p-1.5 rounded-lg disabled:opacity-40',
              isDark ? 'text-dark-on-surface-variant/40 hover:text-red-400 hover:bg-red-500/10' : 'text-on-surface-variant/40 hover:text-red-500 hover:bg-red-50')}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Inline value prompt */}
      {showValuePrompt && (
        <div className={cn('mt-3 flex items-center gap-2 rounded-lg px-3 py-2 border',
          isDark ? 'bg-white/5 border-white/10' : 'bg-surface-container-low border-outline-variant/20')}>
          <label className={cn('text-xs shrink-0', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
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
            className={cn('flex-1 min-w-0 rounded-md px-2 py-1 text-xs border focus:outline-none focus:ring-1',
              isDark
                ? 'bg-white/10 border-white/15 text-dark-on-surface placeholder-white/30 focus:ring-dark-primary/40'
                : 'bg-surface-container border-outline-variant/20 text-on-surface placeholder-on-surface-variant/40 focus:ring-primary/30')}
          />
          <button
            type="button"
            onClick={handleConfirmValue}
            disabled={isPending}
            className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-medium rounded-md transition-colors disabled:opacity-40"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={handleCancelPrompt}
            className={cn('px-2 py-1 text-xs transition-colors', isDark ? 'text-dark-on-surface-variant/50 hover:text-dark-on-surface' : 'text-on-surface-variant/50 hover:text-on-surface')}
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
                  Can&#39;t do
                </button>
              </>
            )}
            {isCompleted && (
              <button
                onClick={() => onUndo(activity.id)}
                disabled={isPending}
                className={cn('px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors disabled:opacity-40',
                  isDark ? 'bg-white/5 hover:bg-white/10 text-dark-on-surface-variant border-white/10' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border-outline-variant/20')}
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
