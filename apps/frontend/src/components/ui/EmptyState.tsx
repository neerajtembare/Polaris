/**
 * @file components/ui/EmptyState.tsx
 * @description Centered empty-state block shown when a list has no items.
 * @module @polaris/frontend/components/ui
 */

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Vertically centred empty-state with optional icon, text, and CTA.
 *
 * @example
 * <EmptyState
 *   icon="🎯"
 *   title="No goals yet"
 *   description="Create your first goal to start tracking progress."
 *   action={<Button onClick={...}>Add goal</Button>}
 * />
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center py-20 px-6 text-center',
        className,
      ].join(' ')}
    >
      {icon && (
        <span className="text-4xl mb-4" aria-hidden="true">
          {icon}
        </span>
      )}
      <p className="text-base font-semibold text-white">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-gray-400 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
