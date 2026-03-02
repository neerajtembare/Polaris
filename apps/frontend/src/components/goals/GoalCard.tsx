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

import { Link } from 'react-router-dom';
import { TimeframeBadge, StatusBadge } from '../ui/Badge.tsx';
import { ProgressBar } from '../ui/ProgressBar.tsx';
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
  const progress = goal.progress;
  const hasTarget = goal.targetValue !== null && goal.targetValue > 0;

  return (
    <article className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">

      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Link
            to={`/goals/${goal.id}`}
            className="text-sm font-semibold text-white hover:text-indigo-300 transition-colors line-clamp-2"
          >
            {goal.title}
          </Link>
          {goal.description && (
            <p className="mt-1 text-xs text-gray-500 line-clamp-2">{goal.description}</p>
          )}
        </div>

        {/* Delete button */}
        <button
          onClick={() => onDelete(goal.id)}
          aria-label={`Delete goal: ${goal.title}`}
          className="text-gray-600 hover:text-red-400 transition-colors p-1 -mr-1 flex-shrink-0"
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
                {progress.currentValue} / {goal.targetValue} {goal.targetUnit ?? ''}
                {' · '}
                <span className="text-gray-600">{progress.activityCount} activities</span>
              </p>
            </>
          ) : (
            <div className="h-1.5 bg-gray-800 rounded-full" aria-label="No progress data yet" />
          )}
        </div>
      )}

    </article>
  );
}
