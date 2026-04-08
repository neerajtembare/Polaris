/**
 * @file components/goals/GoalCard.tsx
 * @description Card representing a single Goal in the Goals list.
 *   Shows title, timeframe badge, optional progress bar, and action buttons.
 * @module @polaris/frontend/components/goals
 *
 * @dependencies
 * - react-router-dom (Link)
 * - hooks/useGoals (GoalWithProgress type)
 * - components/ui/Badge
 * - components/ui/ProgressBar
 *
 * @relatedFiles
 * - src/pages/GoalsList.tsx
 * - src/hooks/useGoals.ts
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TimeframeBadge, StatusBadge } from '../ui/Badge.tsx';
import { ProgressBar } from '../ui/ProgressBar.tsx';
import { ConfirmModal } from '../ui/ConfirmModal.tsx';
import type { Goal } from '@polaris/shared';
import type { GoalProgress } from '../../hooks/useGoals.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GoalWithOptionalProgress extends Goal {
  progress?: GoalProgress;
}

interface GoalCardProps {
  goal: GoalWithOptionalProgress;
  onDelete: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a goal as a card with:
 * - Title linked to the detail page
 * - Timeframe + status badges
 * - Progress bar if the goal has a target value
 * - Delete button
 */
export function GoalCard({ goal, onDelete }: GoalCardProps) {
  const progress  = goal.progress;
  const hasTarget = goal.targetValue !== null && goal.targetValue > 0;
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <ConfirmModal
        isOpen={showConfirm}
        message="Delete this goal?"
        detail={goal.title}
        onConfirm={() => { setShowConfirm(false); onDelete(goal.id); }}
        onCancel={() => setShowConfirm(false)}
      />

    <article className="glass hover:border-gray-700/60 transition-all duration-150 p-4">

      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Link
            to={`/goals/${goal.id}`}
            className="text-sm font-semibold text-gray-100 hover:text-indigo-300 transition-colors line-clamp-2"
          >
            {goal.title}
          </Link>
          {goal.description && (
            <p className="mt-1 text-xs text-gray-500 line-clamp-2">{goal.description}</p>
          )}
        </div>

        {/* Delete button */}
        <button
          onClick={() => setShowConfirm(true)}
          aria-label={`Delete goal: ${goal.title}`}
          className="text-gray-700 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10 flex-shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Badges */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <TimeframeBadge timeframe={goal.timeframe} />
        {goal.status !== 'active' && <StatusBadge status={goal.status} />}
      </div>

      {/* Progress */}
      {hasTarget && (
        <div className="mt-3">
          {progress ? (
            <>
              <ProgressBar
                percentage={progress.percentage ?? 0}
                label={`${progress.percentage ?? 0}%`}
                heightClass="h-1.5"
              />
              <p className="mt-1.5 text-xs text-gray-500">
                <span className="text-indigo-400 font-medium tabular-nums">{progress.currentValue}</span>
                {' / '}
                {goal.targetValue} {goal.targetUnit ?? ''}
                {' · '}
                <span className="text-gray-600">{progress.activityCount} activities</span>
              </p>
            </>
          ) : (
            <div className="h-1.5 bg-gray-800/80 rounded-full" aria-label="No progress data yet" />
          )}
        </div>
      )}

    </article>
    </>
  );
}
