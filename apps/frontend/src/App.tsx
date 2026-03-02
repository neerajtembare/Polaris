/**
 * @file App.tsx
 * @description Root application component with route definitions
 * @module @polaris/frontend
 *
 * @dependencies
 * - react-router-dom
 *
 * @relatedFiles
 * - src/pages/Dashboard.tsx
 * - src/pages/GoalsList.tsx
 * - src/pages/GoalCreate.tsx
 * - src/pages/GoalDetail.tsx
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard }       from './pages/Dashboard.tsx';
import { GoalsList }       from './pages/GoalsList.tsx';
import { GoalCreate }      from './pages/GoalCreate.tsx';
import { GoalDetail }      from './pages/GoalDetail.tsx';
import { ActivitiesList }  from './pages/ActivitiesList.tsx';
import { TodayView }       from './pages/TodayView.tsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />

      {/* Goals */}
      <Route path="/goals"     element={<GoalsList />} />
      <Route path="/goals/new" element={<GoalCreate />} />
      <Route path="/goals/:id" element={<GoalDetail />} />

      {/* Activities */}
      <Route path="/activities" element={<ActivitiesList />} />

      {/* Today */}
        <Route path="/today" element={<TodayView />} />
    </Routes>

  );
}
