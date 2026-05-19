import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">
              {t('workspaceLabel')}
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-foreground">
              {t('workspaceTitle')}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{staffEmail}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              {staffRole === 'admin' ? t('roleAdmin') : t('roleModerator')}
            </span>
            <ModeratorLogoutButton />
          </div>
        </div>
      </div>
      <ModeratorWorkspaceNav staffRole={staffRole} />
      {children}
    </div>
  );
}
