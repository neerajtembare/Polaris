/**
 * @file components/ui/Badge.tsx
 * @description Small colored label for timeframes, statuses, and categories.
 * @module @polaris/frontend/components/ui
 */

import type { GoalTimeframe, GoalStatus, ActivityStatus } from '@polaris/shared';

// ---------------------------------------------------------------------------
// Variant maps
// ---------------------------------------------------------------------------

const TIMEFRAME_STYLES: Record<GoalTimeframe, string> = {
  long:   'bg-indigo-900/60 text-indigo-300 ring-indigo-700/40',
  medium: 'bg-amber-900/60  text-amber-300  ring-amber-700/40',
  short:  'bg-emerald-900/60 text-emerald-300 ring-emerald-700/40',
};

const TIMEFRAME_LABELS: Record<GoalTimeframe, string> = {
  long:   'Long-term',
  medium: 'Medium-term',
  short:  'Short-term',
};

const STATUS_STYLES: Record<GoalStatus | ActivityStatus, string> = {
  active:    'bg-green-900/60  text-green-300   ring-green-700/40',
  completed: 'bg-blue-900/60   text-blue-300    ring-blue-700/40',
  paused:    'bg-yellow-900/60 text-yellow-300  ring-yellow-700/40',
  archived:  'bg-gray-800      text-gray-400    ring-gray-700/40',
  planned:   'bg-gray-800      text-gray-300    ring-gray-700/40',
  skipped:   'bg-orange-900/60 text-orange-300  ring-orange-700/40',
};

// ---------------------------------------------------------------------------
// Badge component variants
// ---------------------------------------------------------------------------

interface TimeframeBadgeProps {
  timeframe: GoalTimeframe;
  className?: string;
}

/** Displays long-term / medium-term / short-term with a colored background */
export function TimeframeBadge({ timeframe, className = '' }: TimeframeBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ring-1 ring-inset',
        TIMEFRAME_STYLES[timeframe],
        className,
      ].join(' ')}
    >
      {TIMEFRAME_LABELS[timeframe]}
    </span>
  );
}

interface StatusBadgeProps {
  status: GoalStatus | ActivityStatus;
  className?: string;
}

/** Displays a goal or activity status with a colored background */
export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ring-1 ring-inset capitalize',
        STATUS_STYLES[status],
        className,
      ].join(' ')}
    >
      {status}
    </span>
  );
}
