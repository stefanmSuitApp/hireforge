'use client';

import { cn } from '@/lib/utils';

type Props = {
  rows?: number;
  className?: string;
};

export function TableLoadingState({ rows = 5, className }: Props) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-border',
        className,
      )}
    >
      <div className="animate-pulse space-y-3 p-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-8 rounded-md bg-muted/60" />
        ))}
      </div>
    </div>
  );
}
