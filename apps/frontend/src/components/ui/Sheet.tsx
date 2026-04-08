/**
 * @file Sheet.tsx
 * @description Bottom sheet on mobile, side panel on desktop for modal content
 * @module components/ui/Sheet
 */

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  position?: 'bottom' | 'right';
  className?: string;
}

export function Sheet({ isOpen, onClose, children, title, position = 'bottom', className = '' }: SheetProps) {
  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const positionClasses = {
    bottom: 'bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl md:right-0 md:left-auto md:top-0 md:bottom-0 md:max-h-full md:w-[480px] md:max-w-[90vw] md:rounded-t-none md:rounded-l-2xl',
    right: 'right-0 top-0 bottom-0 w-[480px] max-w-[90vw] rounded-l-2xl',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={`fixed ${positionClasses[position]} bg-gray-900/95 backdrop-blur-md border border-gray-800/50 shadow-2xl z-50 flex flex-col ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'sheet-title' : undefined}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800/50 shrink-0">
          {title && (
            <h2 id="sheet-title" className="text-lg font-semibold text-white">
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="ml-auto p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </>
  );
}
