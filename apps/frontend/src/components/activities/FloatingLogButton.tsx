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
import { useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
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
  const { pathname } = useLocation();

  // TodayView already has QuickLogBar + a header log button — hide FAB there
  if (pathname === '/today') return null;

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
          'w-14 h-14 rounded-full shadow-xl',
          'bg-indigo-600 hover:bg-indigo-500 active:scale-95',
          'text-white',
          'flex items-center justify-center',
          'transition-all duration-150',
          'border border-indigo-500/50',
        ].join(' ')}
      >
        <Plus className="w-6 h-6" />
      </button>

      {open && (
        <QuickLogModal onClose={() => setOpen(false)} />
      )}
    </>
  );
}
