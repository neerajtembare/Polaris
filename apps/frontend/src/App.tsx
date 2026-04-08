/**
 * @file App.tsx
 * @description Root application component with route definitions.
 *   All app routes share the AppLayout via a single layout route.
 *   Pages are lazy-loaded to reduce initial bundle size.
 * @module @polaris/frontend
 *
 * @dependencies
 * - react-router-dom
 *
 * @relatedFiles
 * - src/components/layout/AppLayout.tsx
 * - src/pages/*.tsx
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppLayout }      from './components/layout/AppLayout.tsx';
import { ErrorBoundary }  from './components/ui/ErrorBoundary.tsx';
import { Spinner }        from './components/ui/Spinner.tsx';

// Lazy-loaded pages
const Home           = lazy(() => import('./pages/Home.tsx'));
const GoalsList      = lazy(() => import('./pages/GoalsList.tsx').then((m) => ({ default: m.GoalsList })));
const GoalCreate     = lazy(() => import('./pages/GoalCreate.tsx').then((m) => ({ default: m.GoalCreate })));
const GoalDetail     = lazy(() => import('./pages/GoalDetail.tsx').then((m) => ({ default: m.GoalDetail })));
const ActivitiesList = lazy(() => import('./pages/ActivitiesList.tsx').then((m) => ({ default: m.ActivitiesList })));
const Settings       = lazy(() => import('./pages/Settings.tsx').then((m) => ({ default: m.Settings })));
const NotFound       = lazy(() => import('./pages/NotFound.tsx').then((m) => ({ default: m.NotFound })));

/** Shared layout wrapper — renders AppLayout with the matched child route inside */
function Layout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1f2028',
            color: '#e2e8f0',
            border: '1px solid rgba(75,85,99,0.4)',
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: '#34d399', secondary: '#0e0e13' } },
          error:   { iconTheme: { primary: '#f87171', secondary: '#0e0e13' } },
        }}
      />
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <Spinner sizeClass="h-10 w-10" />
          </div>
        }
      >
        <Routes>
          {/* All app pages share the AppLayout via this layout route */}
          <Route element={<Layout />}>
            <Route path="/"           element={<Home />} />
            <Route path="/goals"      element={<GoalsList />} />
            <Route path="/goals/new"  element={<GoalCreate />} />
            <Route path="/goals/:id"  element={<GoalDetail />} />
            <Route path="/history"    element={<ActivitiesList />} />
            <Route path="/settings"   element={<Settings />} />
          </Route>

          {/* Legacy route redirects */}
          <Route path="/dashboard"  element={<Navigate to="/" replace />} />
          <Route path="/today"      element={<Navigate to="/" replace />} />
          <Route path="/activities" element={<Navigate to="/history" replace />} />

          {/* Catch-all: any unmatched path shows 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
