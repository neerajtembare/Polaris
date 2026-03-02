/**
 * @file components/ui/Spinner.tsx
 * @description Accessible loading spinner with configurable size.
 * @module @polaris/frontend/components/ui
 */

interface SpinnerProps {
  /** Tailwind size class — default 'h-5 w-5' */
  sizeClass?: string;
  className?: string;
}

/** Spinning SVG ring indicator */
export function Spinner({ sizeClass = 'h-5 w-5', className = '' }: SpinnerProps) {
  return (
    <svg
      className={['animate-spin text-indigo-400', sizeClass, className].join(' ')}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Loading"
      role="status"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

/** Full-area centered loading state */
export function LoadingScreen() {
  return (
    <div className="flex h-full items-center justify-center py-24">
      <Spinner sizeClass="h-8 w-8" />
    </div>
  );
}
