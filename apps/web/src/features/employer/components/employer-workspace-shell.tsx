import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { loadEmployerWorkspaceOrRedirect } from '@/lib/employer-workspace-load';

import { EmployerWorkspaceNav } from './employer-workspace-nav';

type Props = { children: ReactNode };

/** Authenticated employer area: workspace header + outlet (server; auth enforced here). */
export async function EmployerWorkspaceShell({ children }: Props) {
  const workspace = await loadEmployerWorkspaceOrRedirect();
  const t = await getTranslations('Employer');

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <p className="text-sm font-medium text-primary">{t('workspaceLabel')}</p>
          <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            {t('workspaceStatus')}
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">
          {workspace.company.legalName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{workspace.user.email}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {t('publicSlug')}:{' '}
          <span className="font-mono text-foreground">{workspace.company.slug}</span>
        </p>
      </div>
      {!workspace.user.emailVerified ? (
        <div
          className="my-6 rounded-xl border border-amber-600/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground"
          role="status"
        >
          {t('emailVerificationBanner')}
        </div>
      ) : null}
      <EmployerWorkspaceNav />
      {children}
    </div>
  );
}
