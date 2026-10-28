import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';

import { AdminWorkspaceShell } from '@/features/admin';
import { loadAdminSessionOrRedirect } from '@/lib/admin-workspace-load';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await loadAdminSessionOrRedirect();

  return (
    <AdminWorkspaceShell staffEmail={session.me.user.email}>
      {children}
    </AdminWorkspaceShell>
  );
}
