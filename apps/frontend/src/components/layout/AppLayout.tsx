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

import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Target, Activity, type LucideIcon } from 'lucide-react';
import { FloatingLogButton } from '../activities/FloatingLogButton.tsx';

// ---------------------------------------------------------------------------
// Nav items — add future routes here
// ---------------------------------------------------------------------------

interface NavItem {
  to:    string;
  label: string;
  Icon:  LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard',  label: 'Dashboard',  Icon: LayoutDashboard },
  { to: '/today',      label: 'Today',      Icon: CalendarDays },
  { to: '/goals',      label: 'Goals',      Icon: Target },
  { to: '/activities', label: 'Activities', Icon: Activity },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AppLayoutProps {
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Shared sidebar content (used in both desktop and mobile drawer)
// ---------------------------------------------------------------------------

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  return (
    <>
      {/* Brand */}
      <div className="px-5 py-5 border-b border-gray-800/60">
        <p className="text-lg font-bold tracking-tight text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]">
          ✦ Polaris
        </p>
        <p className="text-xs text-gray-600 mt-0.5">Activity tracker</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Main navigation">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavClick}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'border-l-2 border-indigo-500 bg-indigo-500/10 text-indigo-300 pl-[10px]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5',
              ].join(' ')
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer / version label */}
      <div className="px-5 py-4 border-t border-gray-800/60">
        <span className="text-xs text-gray-700">v1.0 · MVP</span>
      </div>
    </>
  );
}

/**
 * Full-height two-column shell.
 * Desktop (md+): fixed-width sidebar on the left.
 * Mobile: hamburger button in top bar opens a slide-out drawer.
 */
export function AppLayout({ children }: AppLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen text-white overflow-hidden" style={{ background: '#0e0e13' }}>

      {/* ——— Desktop sidebar (hidden on small screens) ——— */}
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col bg-gray-900/60 backdrop-blur-xl border-r border-gray-800/50">
        <SidebarContent />
      </aside>

      {/* ——— Mobile drawer overlay ——— */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ——— Mobile drawer panel ——— */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-gray-900/95 backdrop-blur-xl border-r border-gray-800/50',
          'transform transition-transform duration-200 ease-in-out md:hidden',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        aria-label="Mobile navigation"
      >
        {/* Close button inside drawer */}
        <button
          onClick={() => setDrawerOpen(false)}
          aria-label="Close navigation"
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          ✕
        </button>
        <SidebarContent onNavClick={() => setDrawerOpen(false)} />
      </aside>

      {/* ——— Main content ——— */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Mobile top bar (visible only on small screens) */}
        <header className="flex items-center gap-3 px-4 py-3 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50 md:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="text-gray-400 hover:text-white transition-colors"
          >
            {/* Hamburger icon */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <p className="text-sm font-bold tracking-tight text-white">✦ Polaris</p>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Global floating log button — visible on all pages */}
      <FloatingLogButton />

    </div>
  );
}
