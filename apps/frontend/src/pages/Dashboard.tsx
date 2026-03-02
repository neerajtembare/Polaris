/**
 * @file pages/Dashboard.tsx
 * @description Dashboard page — default landing page for Polaris
 * @module @polaris/frontend/pages
 *
 * @dependencies
 * - react
 *
 * @relatedFiles
 * - src/App.tsx
 */

export function Dashboard() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold tracking-tight text-white">Polaris</h1>
      <p className="text-gray-400 text-lg">Your personal activity tracker</p>
      <span className="text-xs text-gray-600 uppercase tracking-widest">Phase 0 · Foundation</span>
    </div>
  );
}
