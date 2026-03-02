/**
 * @file components/layout/AppLayout.tsx
 * @description Application shell — sidebar nav + main content region.
 *   Every page is wrapped in this component to get consistent navigation.
 * @module @polaris/frontend/components/layout
 *
 * @dependencies
 * - react-router-dom (NavLink)
 *
 * @relatedFiles
 * - src/App.tsx
 * - src/pages/Dashboard.tsx
 */

import { NavLink } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Nav items — add future routes here
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard',  icon: '⚡' },
  { to: '/goals',     label: 'Goals',      icon: '🎯' },
  // Future: { to: '/today',  label: 'Today',    icon: '📅' },
  // Future: { to: '/log',    label: 'Log',      icon: '📝' },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Full-height two-column shell.
 * Left: fixed-width sidebar with branding + nav.
 * Right: scrollable main content area.
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">

      {/* ——— Sidebar ——— */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-gray-900 border-r border-gray-800">

        {/* Brand */}
        <div className="px-5 py-5 border-b border-gray-800">
          <p className="text-lg font-bold tracking-tight text-white">✦ Polaris</p>
          <p className="text-xs text-gray-500 mt-0.5">Activity tracker</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Main navigation">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                ].join(' ')
              }
            >
              <span aria-hidden="true">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer / version label */}
        <div className="px-5 py-4 border-t border-gray-800">
          <span className="text-xs text-gray-600">Phase 1 · MVP</span>
        </div>
      </aside>

      {/* ——— Main content ——— */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

    </div>
  );
}
