/**
 * @file components/activities/GoalSuggestionCard.tsx
 * @description Shown when the AI detects the user's intent is to create a goal
 *   rather than log an activity. Offers a shortcut to the goal creation form
 *   with pre-filled title and unit, or lets the user log it as an activity instead.
 *
 * @module @polaris/frontend/components/activities
 *
 * @relatedFiles
 * - src/components/activities/SmartInputBar.tsx
 * - src/pages/Goals.tsx
 */

import { Target, ArrowRight, Pencil } from 'lucide-react';

interface GoalSuggestionCardProps {
  title: string;
  value: number | null;
  unit: string | null;
  onCreateGoal: () => void;
  onLogAsActivity: () => void;
  onDismiss: () => void;
}

/**
 * Card shown when intent === 'create_goal'.
 * Prompts the user to navigate to goal creation or fall back to activity logging.
 */
export function GoalSuggestionCard({
  title,
  value,
  unit,
  onCreateGoal,
  onLogAsActivity,
  onDismiss,
}: GoalSuggestionCardProps) {
  const subtitle =
    value !== null && unit ? `${value} ${unit}` : unit ?? null;

  return (
    <div className="rounded-xl border border-primary/30 dark:border-indigo-500/30 bg-primary/5 dark:bg-indigo-950/40 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 dark:bg-indigo-500/20">
          <Target className="h-4 w-4 text-primary dark:text-indigo-400" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-primary dark:text-indigo-300 uppercase tracking-wider mb-1">
            Looks like a goal
          </p>
          <p className="text-sm font-semibold text-on-surface dark:text-white leading-snug truncate">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-on-surface-variant dark:text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="ml-auto shrink-0 text-on-surface-variant dark:text-gray-500 hover:text-on-surface dark:hover:text-gray-300 transition-colors text-lg leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onCreateGoal}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary dark:bg-indigo-600 hover:bg-primary/90 dark:hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Create Goal
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={onLogAsActivity}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-surface-container dark:bg-gray-800 hover:bg-surface-container-high dark:hover:bg-gray-700 text-on-surface-variant dark:text-gray-300 text-sm rounded-lg transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
          Log as activity
        </button>
      </div>
    </div>
  );
}
