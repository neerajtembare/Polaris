/**
 * @file pages/NotFound.tsx
 * @description 404 Not Found page — rendered for any unmatched route.
 * @module @polaris/frontend/pages
 *
 * @dependencies
 * - react-router-dom
 *
 * @relatedFiles
 * - src/App.tsx (catch-all route)
 */

import { Link } from 'react-router-dom';

/**
 * Displayed when the user navigates to a path that doesn't match any route.
 */
export function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl font-black text-gray-800 mb-2" aria-hidden="true">
          404
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-gray-400 mb-8 text-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/dashboard"
          className="inline-block px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
