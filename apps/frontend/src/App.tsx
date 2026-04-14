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
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './components/screens/Login';
import Hub from './components/screens/Hub';
import GoalMatrix from './components/screens/GoalMatrix';
import Insights from './components/screens/Insights';
import History from './components/screens/History';
import Settings from './components/screens/Settings';
import { FocusMode } from './components/screens/FocusMode';
import { MorningBanner } from './components/MorningBanner';
import { WeeklyReview } from './components/screens/WeeklyReview';
import { OnboardingModal } from './components/OnboardingModal';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { useGoals } from './hooks/useGoals';
import { useActivities } from './hooks/useActivities';
import type { ScreenId, Theme, NavigationState } from './types/navigation';

const STORAGE_THEME_KEY   = 'polaris:theme';
const STORAGE_AUTH_KEY    = 'polaris:auth';
const BANNER_DISMISS_KEY  = 'polaris:banner-dismissed:';

function todayDateStr(): string {
  return new Date().toISOString().split('T')[0] as string;
}

function isBannerDismissedToday(): boolean {
  try {
    return localStorage.getItem(`${BANNER_DISMISS_KEY}${todayDateStr()}`) === 'true';
  } catch { return false; }
}

function markBannerDismissedToday(): void {
  try {
    // Remove stale dismiss keys first
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(BANNER_DISMISS_KEY) && k !== `${BANNER_DISMISS_KEY}${todayDateStr()}`) {
        localStorage.removeItem(k);
      }
    }
    localStorage.setItem(`${BANNER_DISMISS_KEY}${todayDateStr()}`, 'true');
  } catch { /* noop */ }
}

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
  const [showFocus,  setShowFocus]  = useState(false);
  const [showBanner, setShowBanner] = useState(() => !isBannerDismissedToday());

  // Onboarding: show if not completed yet (detected once data is loaded)
  const [onboardingDone, setOnboardingDone] = useState(() => {
    try { return localStorage.getItem('polaris:onboarded') === '1'; } catch { return false; }
  });
  // Only query when authenticated + onboarding hasn't been completed
  const shouldCheckOnboarding = navState.isAuthenticated && !onboardingDone;
  const { data: onboardGoals }      = useGoals({ status: 'active' }, { enabled: shouldCheckOnboarding });
  const { data: onboardActivities } = useActivities({}, { enabled: shouldCheckOnboarding });
  const showOnboarding =
    shouldCheckOnboarding &&
    onboardGoals !== undefined &&
    onboardActivities !== undefined &&
    onboardGoals.length === 0 &&
    (onboardActivities.meta?.total ?? 0) === 0;

  const dismissBanner = () => {
    markBannerDismissedToday();
    setShowBanner(false);
  };

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

  const screenContent: Record<string, React.ReactNode> = {
    Hub:          <Hub      {...sharedProps} onStartFocus={() => setShowFocus(true)} />,
    Goals:        <GoalMatrix {...sharedProps} />,
    Insights:     <Insights {...sharedProps} />,
    History:      <History  {...sharedProps} />,
    Settings:     <Settings {...sharedProps} onToggleTheme={toggleTheme} />,
    WeeklyReview: <WeeklyReview {...sharedProps} />,
  };

  return (
    <ErrorBoundary>
      <Layout state={navState} onNavigate={navigate} onToggleTheme={toggleTheme} onLogout={logout}>
        {screenContent[navState.screen]}
      </Layout>
      {/* Morning banner — shown once per day, below the nav */}
      <AnimatePresence>
        {showBanner && !showFocus && (
          <MorningBanner
            isDark={navState.theme === 'dark'}
            onDismiss={dismissBanner}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showFocus && (
          <FocusMode theme={navState.theme} onClose={() => setShowFocus(false)} />
        )}
      </AnimatePresence>
      {/* Onboarding — shown to brand-new users with 0 goals and 0 activities */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingModal
            theme={navState.theme}
            onComplete={() => {
              setOnboardingDone(true);
              import('react-hot-toast').then(({ default: toast }) => {
                toast.success("You're all set! Welcome to Polaris.", { duration: 4000 });
              });
            }}
          />
        )}
      </AnimatePresence>
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

