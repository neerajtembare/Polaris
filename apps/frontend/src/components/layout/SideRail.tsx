/**
 * @file SideRail.tsx
 * @description Collapsible icon-only sidebar for tablet view (expands on hover)
 * @module components/layout/SideRail
 */

import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Target, Activity, Plus } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface SideRailProps {
  onLogActivity: () => void;
}

export function SideRail({ onLogActivity }: SideRailProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const navItems = [
    {
      to: '/dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
    },
    {
      to: '/today',
      icon: CalendarDays,
      label: 'Today',
    },
    {
      to: '/goals',
      icon: Target,
      label: 'Goals',
    },
    {
      to: '/activities',
      icon: Activity,
      label: 'Activities',
    },
  ];

  return (
    <nav
      className="hidden md:flex lg:hidden fixed left-0 top-0 bottom-0 flex-col bg-gray-900/40 backdrop-blur-md border-r border-gray-800/50 z-30 transition-all duration-200"
      style={{ width: isExpanded ? '224px' : '72px' }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      aria-label="Sidebar navigation"
    >
      {/* Brand */}
      <div className="p-4 border-b border-gray-800/50">
        <div className="flex items-center gap-3 h-8">
          <span className="text-2xl shrink-0" aria-hidden="true">✦</span>
          {isExpanded && (
            <div className="overflow-hidden">
              <div className="font-bold text-white whitespace-nowrap">Polaris</div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation items */}
      <div className="flex-1 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Tooltip key={item.to} content={item.label} side="right">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-gray-800/50 text-indigo-400 border-l-2 border-indigo-500'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {isExpanded && (
                  <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                    {item.label}
                  </span>
                )}
              </NavLink>
            </Tooltip>
          );
        })}
      </div>

      {/* Log Activity button */}
      <div className="p-4 border-t border-gray-800/50">
        <Tooltip content="Log Activity" side="right">
          <button
            onClick={onLogActivity}
            className="flex items-center gap-3 w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
            aria-label="Log activity"
          >
            <Plus className="h-5 w-5 shrink-0" aria-hidden="true" />
            {isExpanded && (
              <span className="font-medium whitespace-nowrap">Log Activity</span>
            )}
          </button>
        </Tooltip>
      </div>

      {/* Footer */}
      {isExpanded && (
        <div className="p-4 text-xs text-gray-600 border-t border-gray-800/50">
          <div>v1.0 · MVP</div>
        </div>
      )}
    </nav>
  );
}
