/**
 * DEAD CODE — BrowserRouter is not mounted in App.tsx. This page is never rendered.
 * Do NOT delete yet — reserved for Phase 2+ when React Router is wired up.
 *
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
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0e0e13' }}>
      <div className="max-w-md w-full text-center">
        <div className="text-[8rem] font-black text-gray-800/60 leading-none mb-4 select-none" aria-hidden="true">
          404
        </div>
        <div className="glass mx-auto max-w-sm px-8 py-8">
          <h1 className="text-xl font-bold text-white mb-2">Page not found</h1>
          <p className="text-gray-400 mb-8 text-sm">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link
            to="/dashboard"
            className="inline-block px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
