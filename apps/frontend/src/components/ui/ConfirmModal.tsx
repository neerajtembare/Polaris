/**
 * @file components/ui/ConfirmModal.tsx
 * @description Reusable confirmation dialog — replaces all window.confirm() calls.
 *   Glassmorphism-styled modal with a destructive confirm button and a cancel button.
 * @module @polaris/frontend/components/ui
 */

import { useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConfirmModalProps {
  isOpen:    boolean;
  message:   string;
  /** Optional secondary detail text shown below the message */
  detail?:   string | undefined;
  /** Label for the confirm button (default: "Delete") */
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel:  () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Centered confirmation modal overlay.
 * - Trap focus: ESC key triggers onCancel.
 * - Click on backdrop triggers onCancel.
 */
export function ConfirmModal({
  isOpen,
  message,
  detail,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-message"
    >
      <div
        className="glass max-w-sm w-full mx-4 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon + message */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <TriangleAlert className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p id="confirm-modal-message" className="text-sm font-semibold text-gray-100">
              {message}
            </p>
            {detail && (
              <p className="mt-1 text-xs text-gray-400">{detail}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
