/**
 * @file components/layout/AppLayout.tsx
 * @description Application shell — TopBar on md+, BottomNav on mobile, no sidebar.
 * @module @polaris/frontend/components/layout
 *
 * @dependencies
 * - TopBar (desktop/tablet nav)
 * - BottomNav (mobile nav)
 * - CommandPalette (Cmd/Ctrl+K)
 *
 * @relatedFiles
 * - src/App.tsx
 * - src/components/layout/TopBar.tsx
 * - src/components/layout/BottomNav.tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { CommandPalette } from '../ui/CommandPalette';

// ---------------------------------------------------------------------------
// Main Layout Component
// ---------------------------------------------------------------------------

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Minimal layout shell:
 * - Mobile (< 768px): Bottom tab bar (Home, Goals, History)
 * - Desktop/Tablet (≥ 768px): Top navigation bar
 * - Global: Cmd/Ctrl+K opens command palette, N focuses input
 */
export function AppLayout({ children }: AppLayoutProps) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const focusSmartInput = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-log-sheet'));
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }

      // N to focus the SmartInputBar (when not in input field)
      if (
        e.key === 'n' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        focusSmartInput();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusSmartInput]);

  return (
    <div className="flex flex-col h-screen text-white overflow-hidden" style={{ background: '#0e0e13' }}>
      {/* Desktop/Tablet top bar (md+) */}
      <TopBar onOpenSearch={() => setIsCommandPaletteOpen(true)} />

      {/* Content scrollable region */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-4">
        {children}
      </main>

      {/* Mobile bottom navigation (< md) */}
      <BottomNav />

      {/* Global command palette (Cmd/Ctrl+K) */}
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
    </div>
  );
}
