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

import { useState } from 'react';
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

export default function App() {
  const [navState, setNavState] = useState<NavigationState>({
    screen: 'Hub',
    theme: 'dark',
    transition: 'none',
    isAuthenticated: false,
  });

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

  // Show login if not authenticated
  if (!navState.isAuthenticated) {
    return (
      <ErrorBoundary>
        <Login theme={navState.theme} onLogin={login} />
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
      <Layout state={navState} onNavigate={navigate} onToggleTheme={toggleTheme}>
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

