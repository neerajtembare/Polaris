/**
 * @file components/layout/TopBar.tsx
 * @description Minimal top navigation bar for desktop and tablet views
 * @module @polaris/frontend/components/layout
 *
 * @relatedFiles
 * - src/components/layout/AppLayout.tsx
 */

import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Target, Clock, Search, Settings } from 'lucide-react';

interface TopBarProps {
  onOpenSearch: () => void;
}

export function TopBar({ onOpenSearch }: TopBarProps) {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Home' },
    { to: '/goals', icon: Target, label: 'Goals' },
    { to: '/history', icon: Clock, label: 'History' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <header className="hidden md:flex items-center gap-6 px-6 py-3 bg-gray-900/60 backdrop-blur-md border-b border-gray-800/50">
      {/* Brand */}
      <NavLink to="/" className="flex items-center gap-2 shrink-0 mr-4">
        <span className="text-xl" aria-hidden="true">✦</span>
        <span className="text-sm font-bold tracking-tight text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]">
          Polaris
        </span>
      </NavLink>

      {/* Nav items */}
      <nav className="flex items-center gap-1" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-300'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search trigger */}
      <button
        onClick={onOpenSearch}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden lg:inline">Search...</span>
        <kbd className="hidden lg:inline px-1.5 py-0.5 bg-gray-800 rounded text-xs text-gray-600 ml-2">⌘K</kbd>
      </button>
    </header>
  );
}
