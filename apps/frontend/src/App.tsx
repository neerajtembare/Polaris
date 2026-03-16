/**
 * @file App.tsx
 * @description Root application component with route definitions.
 *   All app routes share the AppLayout via a single layout route —
 *   individual pages no longer need to import/render AppLayout themselves.
 * @module @polaris/frontend
 *
 * @dependencies
 * - react-router-dom
 *
 * @relatedFiles
 * - src/components/layout/AppLayout.tsx
 * - src/pages/*.tsx
 */

import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppLayout }       from './components/layout/AppLayout.tsx';
import { Dashboard }       from './pages/Dashboard.tsx';
import { GoalsList }       from './pages/GoalsList.tsx';
import { GoalCreate }      from './pages/GoalCreate.tsx';
import { GoalDetail }      from './pages/GoalDetail.tsx';
import { ActivitiesList }  from './pages/ActivitiesList.tsx';
import { TodayView }       from './pages/TodayView.tsx';

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
    </Routes>
  );
}
