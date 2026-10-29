import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { WorkspaceShell } from '@/components/workspace-shell';
import { ModeratorLogoutButton } from '@/features/moderator/components/moderator-logout-button';

import { AdminWorkspaceNav } from './admin-workspace-nav';

type Props = {
  children: ReactNode;
  staffEmail: string;
};

export async function AdminWorkspaceShell({ children, staffEmail }: Props) {
  const t = await getTranslations('Admin');

  return (
    <WorkspaceShell
      label={t('workspaceLabel')}
      badge={t('workspaceStatus')}
      title={t('workspaceTitle')}
      subtitle={staffEmail}
      actions={<ModeratorLogoutButton />}
      nav={<AdminWorkspaceNav />}
    >
      {children}
    </WorkspaceShell>
  );
}
