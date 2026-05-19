import type { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';

import { EmployerWorkspaceShell } from '@/features/employer';

export default async function EmployerDashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <EmployerWorkspaceShell>{children}</EmployerWorkspaceShell>;
}
