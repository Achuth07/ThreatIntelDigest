import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'wouter';
import { SEO } from '@/components/seo';

interface RouteErrorBoundaryProps {
  children: ReactNode;
  /** When this value changes (e.g. the URL), a crashed page gets another chance to render. */
  resetKey?: string;
}

interface RouteErrorBoundaryState {
  failed: boolean;
}

/**
 * Catches errors thrown while rendering a page, so one broken page shows a message and a way
 * out instead of a blank screen (the whole React tree unmounts when an error is not caught).
 */
export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page failed to render:', error, info.componentStack);
  }

  componentDidUpdate(previous: RouteErrorBoundaryProps) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <SEO title="Something went wrong | WhatCyber" description="This page could not be displayed." noindex />
        <h1 className="text-2xl font-bold text-slate-100">Something went wrong</h1>
        <p className="max-w-md text-slate-400">
          This page could not be displayed. Try reloading, or go back to the home page.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Reload
          </button>
          <Link href="/" className="rounded-md bg-whatcyber-teal px-4 py-2 text-sm font-medium text-black hover:opacity-90">
            Home
          </Link>
        </div>
      </main>
    );
  }
}
