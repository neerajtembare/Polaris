/**
 * @file BottomNav.tsx
 * @description Mobile bottom navigation bar with 3 tabs: Home, Goals, History
 * @module components/layout/BottomNav
 */

import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Target, Clock, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/history', icon: Clock, label: 'History' },
  { to: '/settings', icon: Settings, label: 'Settings' },
] as const;

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 md:hidden bg-gray-900/95 backdrop-blur-md border-t border-gray-800/50 z-30 safe-area-bottom"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[64px] rounded-lg transition-colors ${
                  isActive
                    ? 'text-indigo-400'
                    : 'text-gray-400 hover:text-gray-300 active:bg-gray-800/50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span className="text-xs font-medium">{item.label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-indigo-500" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
