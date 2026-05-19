import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { loadCandidateMeOrRedirect } from '@/lib/candidate-workspace-load';

import { CandidateWorkspaceNav } from './candidate-workspace-nav';

type Props = {
  children: ReactNode;
};

export async function CandidateWorkspaceShell({ children }: Props) {
  const me = await loadCandidateMeOrRedirect();
  const t = await getTranslations('Candidate');
  const displayName = me.candidate.fullName?.trim() || me.user.email;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <p className="text-sm font-medium text-primary">{t('workspaceLabel')}</p>
          <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            {t('workspaceStatus')}
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">{displayName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{me.user.email}</p>
      </div>
      <CandidateWorkspaceNav />
      {children}
    </div>
  );
}
