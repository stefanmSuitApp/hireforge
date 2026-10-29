'use client';

import { useTranslations } from 'next-intl';

import { WorkspaceNav } from '@/components/workspace-nav';
import {
  EMPLOYER_WORKSPACE_LINKS,
  getEmployerWorkspaceNavKey,
} from '@/features/employer/employer-workspace-links';
import { usePathname } from '@/i18n/navigation';

export function EmployerWorkspaceNav() {
  const t = useTranslations('Employer');
  const current = getEmployerWorkspaceNavKey(usePathname());
  return (
    <WorkspaceNav
      ariaLabel={t('workspaceLabel')}
      groups={[
        EMPLOYER_WORKSPACE_LINKS.map(({ href, navKey, messageKey }) => ({
          href,
          label: t(messageKey),
          active: current === navKey,
        })),
      ]}
    />
  );
}
