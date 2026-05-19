import { setRequestLocale } from 'next-intl/server';

import { EmployerDashboardHome } from '@/features/employer';
import { loadEmployerWorkspaceOrRedirect } from '@/lib/employer-workspace-load';

export default async function EmployerDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const workspace = await loadEmployerWorkspaceOrRedirect();

  return <EmployerDashboardHome workspace={workspace} />;
}
