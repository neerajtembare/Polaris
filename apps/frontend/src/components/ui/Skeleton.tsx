/**
 * @file Skeleton.tsx
 * @description Loading placeholder with shimmer animation
 * @module components/ui/Skeleton
 */

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | undefined;
  height?: string | undefined;
}

export function Skeleton({ 
  className = '', 
  variant = 'rectangular',
  width,
  height,
}: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style = {
    width,
    height,
  };

  return (
    <div
      className={`bg-gray-800/50 animate-shimmer ${variantClasses[variant]} ${className}`}
      style={style}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 ? '60%' : undefined} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 bg-gray-900/40 backdrop-blur-md border border-gray-800/50 rounded-xl ${className}`}>
      <Skeleton className="h-6 w-3/4 mb-3" />
      <SkeletonText lines={2} />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}
