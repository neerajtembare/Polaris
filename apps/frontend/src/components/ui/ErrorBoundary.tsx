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
        <div className="min-h-screen bg-surface dark:bg-dark-bg flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="text-5xl mb-4" aria-hidden="true">⚠️</div>
            <h1 className="text-2xl font-bold text-on-surface dark:text-dark-on-surface mb-2">
              Something went wrong
            </h1>
            <p className="text-on-surface-variant dark:text-dark-on-surface-variant mb-2 text-sm opacity-70">
              An unexpected error occurred. Your data is safe.
            </p>
            {this.state.errorMessage && (
              <p className="text-on-surface-variant dark:text-dark-on-surface-variant text-xs mb-6 font-mono bg-surface-container dark:bg-white/5 rounded px-3 py-2 break-words opacity-70">
                {this.state.errorMessage}
              </p>
            )}
            <button
              onClick={this.handleReset}
              className="px-6 py-2 bg-primary dark:bg-dark-primary text-white dark:text-dark-bg rounded-lg font-medium transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:focus-visible:ring-dark-primary"
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
