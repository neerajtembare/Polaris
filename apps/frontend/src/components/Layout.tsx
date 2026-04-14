/**
 * @file components/Layout.tsx
 * @description App shell with glass-morphism top nav, 3D particle background,
 *   screen transition animations, and a mobile bottom nav.
 * @module @polaris/frontend/components
 *
 * @dependencies
 * - motion/react
 * - lucide-react
 * - @/components/Background
 * - @/types/navigation
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  BarChart2,
  Flag,
  Settings,
  History,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Background from './Background';
import { AudioPlayer } from './AudioPlayer';
import type { ScreenId, Theme, NavigationState } from '@/types/navigation';

interface LayoutProps {
  state: NavigationState;
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
  onToggleTheme: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { screen: ScreenId; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { screen: 'Hub',      label: 'Hub',      Icon: Home     },
  { screen: 'Goals',    label: 'Goals',    Icon: Flag     },
  { screen: 'Insights', label: 'Insights', Icon: BarChart2 },
  { screen: 'History',  label: 'History',  Icon: History  },
  { screen: 'Settings', label: 'Settings', Icon: Settings },
];

export default function Layout({ state, onNavigate, onToggleTheme, onLogout, children }: LayoutProps) {
  const isDark = state.theme === 'dark';

  return (
    <div
      className={cn(
        'min-h-screen transition-colors duration-500 relative overflow-hidden',
        isDark ? 'bg-dark-bg text-dark-on-surface' : 'bg-surface text-on-surface'
      )}
    >
      {/* 3D Particle Background */}
      <Background theme={state.theme} />

      {/* Atmospheric dark gradient overlay */}
      {isDark && (
        <div className="fixed inset-0 z-0 pointer-events-none atmosphere-dark opacity-50" />
      )}

      {/* ── Top Navigation ─────────────────────────────────────────── */}
      <nav
        className={cn(
          'fixed top-0 w-full z-50 h-16 flex justify-between items-center px-4 md:px-8 backdrop-blur-3xl',
          isDark
            ? 'bg-dark-bg/60 border-b border-white/5'
            : 'bg-white/80 shadow-[0_12px_40px_rgba(25,28,29,0.04)]'
        )}
      >
        {/* Logo + desktop nav links */}
        <div className="flex items-center gap-6 md:gap-12 relative z-10">
          <button
            onClick={() => onNavigate('Hub')}
            className={cn(
              'text-xl md:text-2xl font-black tracking-tighter',
              isDark ? 'text-dark-primary font-headline' : 'text-on-surface'
            )}
          >
            Polaris
          </button>

          <div className="hidden sm:flex items-center gap-4 md:gap-8">
            {NAV_ITEMS.map(({ screen, label }) => (
              <button
                key={screen}
                onClick={() => onNavigate(screen, 'push')}
                className={cn(
                  'text-sm md:text-base font-medium transition-all duration-200 pb-1',
                  state.screen === screen
                    ? isDark
                      ? 'text-dark-primary border-b-2 border-dark-primary'
                      : 'text-primary border-b-2 border-primary font-bold'
                    : isDark
                    ? 'text-dark-on-surface-variant hover:text-dark-primary'
                    : 'text-on-surface-variant hover:text-primary'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1 md:gap-2 relative z-10">
          {/* Audio Player */}
          <AudioPlayer isDark={isDark} />

          <div className="h-6 w-[1px] bg-current opacity-10 mx-0.5" />

          <button
            onClick={onToggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={cn(
              'p-2 md:p-2.5 rounded-xl transition-all active:scale-90 flex items-center gap-2 border',
              isDark
                ? 'bg-white/5 text-dark-primary hover:bg-white/10 border-white/10'
                : 'bg-black/5 text-on-surface-variant hover:bg-black/10 hover:text-primary border-transparent'
            )}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="text-[10px] font-bold uppercase tracking-widest hidden lg:block">
              {isDark ? 'Light' : 'Dark'}
            </span>
          </button>

          <div className="h-6 w-[1px] bg-current opacity-10 mx-1 md:mx-2" />

          <div className="flex items-center gap-2 pl-1">
            <div
              className={cn(
                'w-7 h-7 md:w-8 md:h-8 rounded-full overflow-hidden border',
                isDark ? 'border-dark-primary/30' : 'border-outline-variant/10'
              )}
            >
              {/* Avatar placeholder */}
              <div
                className={cn(
                  'w-full h-full flex items-center justify-center text-xs font-bold',
                  isDark ? 'bg-dark-primary/20 text-dark-primary' : 'bg-primary/10 text-primary'
                )}
              >
                P
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={onLogout}
              aria-label="Sign out"
              title="Sign out"
              className={cn(
                'p-2 rounded-xl transition-all active:scale-90',
                isDark ? 'text-red-400 hover:bg-red-400/10' : 'text-on-surface-variant hover:text-red-500 hover:bg-red-50'
              )}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className="pt-20 pb-24 sm:pb-8 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${state.screen}-${state.theme}`}
            initial={state.transition === 'push' ? { x: 60, opacity: 0 } : { opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={state.transition === 'push' ? { x: -60, opacity: 0 } : { opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Mobile Bottom Navigation ──────────────────────────────────── */}
      <nav
        className={cn(
          'sm:hidden fixed bottom-0 w-full z-50 flex justify-around items-center px-2 pt-3 backdrop-blur-2xl rounded-t-[1.5rem] safe-area-bottom',
          isDark
            ? 'bg-dark-bg/90 border-t border-white/5'
            : 'bg-white/90 shadow-[0_-8px_30px_rgba(0,0,0,0.06)]'
        )}
      >
        {NAV_ITEMS.map(({ screen, label, Icon }) => {
          const active = state.screen === screen;
          return (
            <button
              key={screen}
              onClick={() => onNavigate(screen, 'push')}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all active:scale-90',
                active
                  ? isDark
                    ? 'bg-dark-primary/15 text-dark-primary'
                    : 'bg-primary/10 text-primary'
                  : isDark
                  ? 'text-dark-on-surface-variant'
                  : 'text-on-surface-variant'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
