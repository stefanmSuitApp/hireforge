import type { ReactNode } from 'react';

/** Single content panel matching candidate dashboard section chrome. */
export function EmployerWorkspaceContentFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      {children}
    </div>
  );
}
