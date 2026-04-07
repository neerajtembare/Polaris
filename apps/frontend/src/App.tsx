/**
 * @file App.tsx
 * @description Root application component with route definitions.
 *   All app routes share the AppLayout via a single layout route —
 *   individual pages no longer need to import/render AppLayout themselves.
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
import { AppLayout }      from './components/layout/AppLayout.tsx';
import { ErrorBoundary }  from './components/ui/ErrorBoundary.tsx';
import { Spinner }        from './components/ui/Spinner.tsx';

// Lazy-loaded pages — each gets its own chunk, reducing initial JS payload
const Dashboard      = lazy(() => import('./pages/Dashboard.tsx').then((m) => ({ default: m.Dashboard })));
const GoalsList      = lazy(() => import('./pages/GoalsList.tsx').then((m) => ({ default: m.GoalsList })));
const GoalCreate     = lazy(() => import('./pages/GoalCreate.tsx').then((m) => ({ default: m.GoalCreate })));
const GoalDetail     = lazy(() => import('./pages/GoalDetail.tsx').then((m) => ({ default: m.GoalDetail })));
const ActivitiesList = lazy(() => import('./pages/ActivitiesList.tsx').then((m) => ({ default: m.ActivitiesList })));
const TodayView      = lazy(() => import('./pages/TodayView.tsx').then((m) => ({ default: m.TodayView })));
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
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <Spinner sizeClass="h-10 w-10" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* All app pages share the AppLayout via this layout route */}
          <Route element={<Layout />}>
            <Route path="/dashboard"  element={<Dashboard />} />
            <Route path="/goals"      element={<GoalsList />} />
            <Route path="/goals/new"  element={<GoalCreate />} />
            <Route path="/goals/:id"  element={<GoalDetail />} />
            <Route path="/activities" element={<ActivitiesList />} />
            <Route path="/today"      element={<TodayView />} />
          </Route>

          {/* Catch-all: any unmatched path shows 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
