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
  long:   'bg-indigo-500/15 text-indigo-300 ring-indigo-500/30',
  medium: 'bg-amber-500/15  text-amber-300  ring-amber-500/30',
  short:  'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
};

const TIMEFRAME_LABELS: Record<GoalTimeframe, string> = {
  long:   'Long-term',
  medium: 'Medium-term',
  short:  'Short-term',
};

const STATUS_STYLES: Record<GoalStatus | ActivityStatus, string> = {
  active:    'bg-green-500/15   text-green-300   ring-green-500/30',
  completed: 'bg-blue-500/15    text-blue-300    ring-blue-500/30',
  paused:    'bg-yellow-500/15  text-yellow-300  ring-yellow-500/30',
  archived:  'bg-gray-500/15    text-gray-400    ring-gray-500/30',
  planned:   'bg-gray-500/10    text-gray-400    ring-gray-600/30',
  skipped:   'bg-orange-500/15  text-orange-300  ring-orange-500/30',
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
