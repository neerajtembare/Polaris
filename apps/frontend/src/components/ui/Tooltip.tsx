/**
 * @file Tooltip.tsx
 * @description Simple tooltip component with hover/focus support
 * @module components/ui/Tooltip
 */

import { useState, type ReactElement } from 'react';

interface TooltipProps {
  content: string;
  children: ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({ content, children, side = 'top', className = '' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const sideClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={`absolute ${sideClasses[side]} px-2 py-1 text-xs text-white bg-gray-800 border border-gray-700 rounded shadow-lg whitespace-nowrap z-50 pointer-events-none ${className}`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
