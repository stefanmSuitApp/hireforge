import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { WorkspaceShell } from '@/components/workspace-shell';

import { ModeratorLogoutButton } from './moderator-logout-button';
import { ModeratorWorkspaceNav } from './moderator-workspace-nav';

type Props = {
  children: ReactNode;
  staffEmail: string;
  staffRole: 'moderator' | 'admin';
};

export async function ModeratorWorkspaceShell({
  children,
  staffEmail,
  staffRole,
}: Props) {
  const t = await getTranslations('Moderator');

  return (
    <WorkspaceShell
      label={t('workspaceLabel')}
      badge={staffRole === 'admin' ? t('roleAdmin') : t('roleModerator')}
      title={t('workspaceTitle')}
      subtitle={staffEmail}
      actions={<ModeratorLogoutButton />}
      nav={<ModeratorWorkspaceNav staffRole={staffRole} />}
    >
      {children}
    </WorkspaceShell>
  );
}
