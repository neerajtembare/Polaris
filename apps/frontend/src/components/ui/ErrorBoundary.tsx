/**
 * @file components/ui/ErrorBoundary.tsx
 * @description React error boundary that catches unhandled render errors and shows
 *   a friendly recovery UI instead of a blank white screen.
 * @module @polaris/frontend/components/ui
 *
 * @dependencies
 * - react
 *
 * @relatedFiles
 * - src/App.tsx (wraps entire app)
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Catches JavaScript errors anywhere in the child component tree and renders
 * a fallback UI rather than crashing the entire page.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error
        ? error.message
        : 'An unexpected error occurred';
    return { hasError: true, errorMessage: message };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console in dev; in production this is where you'd send to Sentry/etc.
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.href = '/dashboard';
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="text-5xl mb-4" aria-hidden="true">⚠️</div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-400 mb-2 text-sm">
              An unexpected error occurred. Your data is safe.
            </p>
            {this.state.errorMessage && (
              <p className="text-gray-500 text-xs mb-6 font-mono bg-gray-900 rounded px-3 py-2 break-words">
                {this.state.errorMessage}
              </p>
            )}
            <button
              onClick={this.handleReset}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
