'use client';

import { useTranslations } from 'next-intl';

import { WorkspaceNav } from '@/components/workspace-nav';
import {
  CANDIDATE_WORKSPACE_LINKS,
  getCandidateWorkspaceNavKey,
} from '@/features/candidate/candidate-workspace-links';
import { usePathname } from '@/i18n/navigation';

export function CandidateWorkspaceNav() {
  const t = useTranslations('Candidate');
  const current = getCandidateWorkspaceNavKey(usePathname());
  return (
    <WorkspaceNav
      ariaLabel={t('workspaceLabel')}
      groups={[
        CANDIDATE_WORKSPACE_LINKS.map(({ href, navKey, messageKey }) => ({
          href,
          label: t(messageKey),
          active: current === navKey,
        })),
      ]}
    />
  );
}
