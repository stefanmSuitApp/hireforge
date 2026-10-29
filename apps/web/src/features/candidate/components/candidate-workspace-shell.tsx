import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { WorkspaceShell } from '@/components/workspace-shell';
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
    <WorkspaceShell
      label={t('workspaceLabel')}
      badge={t('workspaceStatus')}
      title={displayName}
      subtitle={displayName === me.user.email ? undefined : me.user.email}
      nav={<CandidateWorkspaceNav />}
    >
      {children}
    </WorkspaceShell>
  );
}
