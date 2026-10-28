'use client';

import type { ReactNode } from 'react';
import { Component } from 'react';

import { useTranslations } from 'next-intl';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = { hasError: boolean };

class TableErrorBoundaryInner extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(): void {
    // noop: render-safe fallback for table sections
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function TableErrorBoundary({ children, fallback }: Props) {
  const t = useTranslations('Errors');
  return (
    <TableErrorBoundaryInner
      fallback={
        fallback ?? (
          <p className="text-sm text-destructive" role="alert">
            {t('tableRenderFailed')}
          </p>
        )
      }
    >
      {children}
    </TableErrorBoundaryInner>
  );
}
