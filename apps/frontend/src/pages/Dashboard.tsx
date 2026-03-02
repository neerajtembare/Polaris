/**
 * @file pages/Dashboard.tsx
 * @description Dashboard page — default landing page for Polaris
 * @module @polaris/frontend/pages
 *
 * @dependencies
 * - components/layout/AppLayout
 *
 * @relatedFiles
 * - src/App.tsx
 */

import { Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.tsx';

export function Dashboard() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Welcome back. Here's what's happening.</p>

        {/* Placeholder — will be replaced in Milestone 1.5 */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <DashCard
            icon="🎯"
            title="Goals"
            description="Create and track your long-term goals"
            to="/goals"
          />
        </div>
      </div>
    </AppLayout>
  );
}

// ---------------------------------------------------------------------------
// Local sub-component
// ---------------------------------------------------------------------------

function DashCard({
  icon, title, description, to,
}: {
  icon: string;
  title: string;
  description: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="block bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
    >
      <span className="text-2xl" aria-hidden="true">{icon}</span>
      <p className="mt-3 font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm text-gray-400">{description}</p>
    </Link>
  );
}
