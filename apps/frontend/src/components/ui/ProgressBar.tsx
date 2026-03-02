/**
 * @file components/ui/ProgressBar.tsx
 * @description Animated progress bar for displaying goal completion percentage.
 * @module @polaris/frontend/components/ui
 */

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ProgressBarProps {
  /** 0–100 */
  percentage: number;
  /** Optional label displayed to the right of the bar */
  label?: string;
  /** Height class — defaults to 'h-1.5' */
  heightClass?: string;
  className?: string;
}

/**
 * Horizontal progress bar.
 * Clamps percentage to [0, 100] defensively.
 */
export function ProgressBar({
  percentage,
  label,
  heightClass = 'h-1.5',
  className = '',
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percentage));

  return (
    <div className={['flex items-center gap-2', className].join(' ')}>
      {/* Track */}
      <div className={['flex-1 bg-gray-800 rounded-full overflow-hidden', heightClass].join(' ')}>
        {/* Fill */}
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Optional label */}
      {label !== undefined && (
        <span className="text-xs text-gray-400 tabular-nums w-9 text-right shrink-0">
          {label}
        </span>
      )}
    </div>
  );
}
