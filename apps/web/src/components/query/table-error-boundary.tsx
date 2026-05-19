'use client';

import type { ReactNode } from 'react';
import { Component } from 'react';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = { hasError: boolean };

export class TableErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(): void {
    // noop: render-safe fallback for table sections
  }

  override render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <p className="text-sm text-destructive" role="alert">
            Could not render this table right now.
          </p>
        )
      );
    }
    return this.props.children;
  }
}
