/**
 * @file Chip.tsx
 * @description Reusable chip/tag component for filters and selections
 * @module components/ui/Chip
 */

import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface ChipProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}

export function Chip({
  children,
  variant = 'default',
  selected = false,
  onClick,
  onRemove,
  className = '',
}: ChipProps) {
  const variantClasses = {
    default: selected
      ? 'bg-gray-700 text-white border-gray-600'
      : 'bg-gray-800/50 text-gray-300 border-gray-700/50 hover:bg-gray-700/50',
    primary: selected
      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
      : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/15',
    success: selected
      ? 'bg-green-500/20 text-green-300 border-green-500/40'
      : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/15',
    warning: selected
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
      : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/15',
    danger: selected
      ? 'bg-red-500/20 text-red-300 border-red-500/40'
      : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/15',
  };

  const isInteractive = onClick || onRemove;
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium border rounded-full transition-colors ${
        variantClasses[variant]
      } ${isInteractive ? 'cursor-pointer' : ''} ${className}`}
      type={onClick ? 'button' : undefined}
    >
      {children}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:bg-white/10 rounded-full p-0.5 transition-colors"
          aria-label="Remove"
          type="button"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Component>
  );
}

interface ChipGroupProps {
  children: ReactNode;
  className?: string;
}

export function ChipGroup({ children, className = '' }: ChipGroupProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {children}
    </div>
  );
}
