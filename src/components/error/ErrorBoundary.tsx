/**
 * React error boundary.
 *
 * A render-phase throw anywhere below this unmounts the subtree — without a
 * boundary that meant a blank page for the whole app. Mounted twice in
 * `_app.tsx`: inside the providers (so a page crash keeps nav + toasts alive)
 * and outside everything as the last resort for provider crashes.
 *
 * Class component by necessity: `componentDidCatch` has no hook equivalent.
 */

import React from 'react';
import { logger } from '@/lib/logger';

const log = logger.scope('ErrorBoundary');

interface ErrorBoundaryProps {
  /** Names the mount point in error tracking (e.g. 'page', 'root'). */
  boundaryName: string;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  /** Reference shown to the user; matches the `error_ref` tag on the capture. */
  errorRef?: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const errorRef = Math.random().toString(36).slice(2, 10);
    this.setState({ errorRef });
    // Fans out to PostHog (+ Sentry: render crashes are high severity).
    log.error('Unhandled render error', error, {
      severity: 'high',
      type: 'system',
      fingerprint: `render/${this.props.boundaryName}`,
      boundary: this.props.boundaryName,
      error_ref: errorRef,
      componentStack: errorInfo.componentStack ?? undefined,
    });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const mailtoSubject = encodeURIComponent(
      `Something broke on the site${this.state.errorRef ? ` (ref ${this.state.errorRef})` : ''}`
    );

    return (
      <div className="min-h-screen bg-brand-gray-darkest flex items-center justify-center px-4">
        <div
          role="alert"
          className="max-w-md w-full bg-black/30 border border-brand-gray-dark rounded-2xl p-8 text-center"
        >
          <h1 className="text-2xl font-bold text-brand-white mb-3">Something broke</h1>
          <p className="text-brand-gray-light text-sm mb-6">
            The page hit an unexpected error. Refreshing usually fixes it — your cart and
            tickets are safe.
          </p>
          <button
            onClick={this.handleReload}
            className="inline-flex items-center justify-center rounded-lg bg-brand-yellow-main px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow-main focus-visible:ring-offset-2 focus-visible:ring-offset-brand-gray-darkest"
          >
            Refresh the page
          </button>
          <p className="mt-6 text-xs text-brand-gray-light">
            Still stuck? Email{' '}
            <a
              href={`mailto:hello@zurichjs.com?subject=${mailtoSubject}`}
              className="underline hover:text-brand-yellow-main"
            >
              hello@zurichjs.com
            </a>
            {this.state.errorRef && (
              <>
                {' '}with reference <span className="font-mono">{this.state.errorRef}</span>
              </>
            )}
            .
          </p>
        </div>
      </div>
    );
  }
}
