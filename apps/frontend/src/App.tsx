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
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard.tsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      {/* Phase 1 routes added here */}
    </Routes>
  );
}
