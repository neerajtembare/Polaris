/**
 * @file App.tsx
 * @description Root application component with state-based navigation.
 *   Manages screen, theme, and auth state. Uses Kinetic Precision layout.
 * @module @polaris/frontend
 *
 * @dependencies
 * - motion/react (AnimatePresence)
 * - components/Layout
 * - components/Hub, GoalMatrix, Insights, History, Settings, Login
 */

import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './components/Login';
import Hub from './components/Hub';
import GoalMatrix from './components/GoalMatrix';
import Insights from './components/Insights';
import History from './components/History';
import Settings from './components/Settings';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import type { ScreenId, Theme, NavigationState } from './types/navigation';

const STORAGE_THEME_KEY = 'polaris:theme';
const STORAGE_AUTH_KEY  = 'polaris:auth';

function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* storage unavailable */ }
  return 'dark';
}

function loadAuth(): boolean {
  try {
    return localStorage.getItem(STORAGE_AUTH_KEY) === 'true';
  } catch { return false; }
}

export default function App() {
  const [navState, setNavState] = useState<NavigationState>({
    screen: 'Hub',
    theme: loadTheme(),
    transition: 'none',
    isAuthenticated: loadAuth(),
  });

  // Persist theme whenever it changes + sync <html> class for Tailwind dark:
  useEffect(() => {
    try { localStorage.setItem(STORAGE_THEME_KEY, navState.theme); } catch { /* noop */ }
    const root = document.documentElement;
    if (navState.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [navState.theme]);

  // Persist auth whenever it changes
  useEffect(() => {
    try { localStorage.setItem(STORAGE_AUTH_KEY, String(navState.isAuthenticated)); } catch { /* noop */ }
  }, [navState.isAuthenticated]);

  const navigate = (screen: ScreenId, transition: 'none' | 'push' = 'push') => {
    setNavState((prev) => ({ ...prev, screen, transition }));
  };

  const toggleTheme = () => {
    setNavState((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  };

  const login = () => {
    setNavState((prev) => ({ ...prev, isAuthenticated: true, screen: 'Hub' }));
  };

  const logout = () => {
    try { localStorage.removeItem(STORAGE_AUTH_KEY); } catch { /* noop */ }
    setNavState((prev) => ({ ...prev, isAuthenticated: false, screen: 'Hub' }));
  };

  // Show login if not authenticated
  if (!navState.isAuthenticated) {
    return (
      <ErrorBoundary>
        <Login theme={navState.theme} onLogin={login} onToggleTheme={toggleTheme} />
        <ToastConfig isDark={navState.theme === 'dark'} />
      </ErrorBoundary>
    );
  }

  const sharedProps = { theme: navState.theme, onNavigate: navigate } as const;

  const screenContent = {
    Hub:      <Hub      {...sharedProps} />,
    Goals:    <GoalMatrix {...sharedProps} />,
    Insights: <Insights {...sharedProps} />,
    History:  <History  {...sharedProps} />,
    Settings: <Settings {...sharedProps} />,
  };

  return (
    <ErrorBoundary>
      <Layout state={navState} onNavigate={navigate} onToggleTheme={toggleTheme} onLogout={logout}>
        {screenContent[navState.screen]}
      </Layout>
      <ToastConfig isDark={navState.theme === 'dark'} />
    </ErrorBoundary>
  );
}

function ToastConfig({ isDark }: { isDark: boolean }) {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: isDark ? '#0f172a' : '#ffffff',
          color: isDark ? '#f1f5f9' : '#1e293b',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          borderRadius: '12px',
          fontSize: '14px',
        },
        success: {
          iconTheme: { primary: isDark ? '#81ecff' : '#0058be', secondary: isDark ? '#020617' : '#ffffff' },
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: isDark ? '#020617' : '#ffffff' },
        },
      }}
    />
  );
}

