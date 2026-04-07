/**
 * @file components/activities/FloatingLogButton.tsx
 * @description Global floating action button (bottom-right) for logging an activity
 *   from any page. Opens QuickLogModal on click.
 *
 * @module @polaris/frontend/components/activities
 *
 * @relatedFiles
 *   - src/components/activities/QuickLogModal.tsx
 *   - src/components/layout/AppLayout.tsx
 */

import { useState } from 'react';
import { QuickLogModal } from './QuickLogModal.tsx';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Fixed bottom-right FAB that opens a compact quick-log modal.
 * Mounted in AppLayout so it's present on every page.
 */
export function FloatingLogButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* FAB */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Log an activity"
        title="Log activity"
        className={[
          'fixed bottom-6 right-6 z-40',
          'w-14 h-14 rounded-full shadow-lg',
          'bg-indigo-600 hover:bg-indigo-500 active:scale-95',
          'text-white text-2xl font-light',
          'flex items-center justify-center',
          'transition-all duration-150',
          // Hide on Today page — QuickLogBar already handles it inline
          // We can't conditionally hide per-route from this component easily,
          // so we keep it visible everywhere for consistency.
        ].join(' ')}
      >
        +
      </button>

      {open && (
        <QuickLogModal onClose={() => setOpen(false)} />
      )}
    </>
  );
}
