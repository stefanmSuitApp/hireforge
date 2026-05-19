import type { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';

import { ModeratorWorkspaceShell } from '@/features/moderator';
import { loadModeratorOrRedirect } from '@/lib/moderator-workspace-load';

export default async function ModeratorDashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const me = await loadModeratorOrRedirect();

  return (
    <ModeratorWorkspaceShell
      staffEmail={me.user.email}
      staffRole={me.user.role}
    >
      {children}
    </ModeratorWorkspaceShell>
  );
}
