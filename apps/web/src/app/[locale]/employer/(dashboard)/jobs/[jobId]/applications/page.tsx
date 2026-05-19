import { setRequestLocale } from 'next-intl/server';

import { EmployerJobApplications } from '@/features/employer/components/employer-job-applications';
import { loadEmployerSessionOrRedirect } from '@/lib/employer-workspace-load';

export default async function EmployerJobApplicationsPage({
  params,
}: {
  params: Promise<{ locale: string; jobId: string }>;
}) {
  const { locale, jobId } = await params;
  setRequestLocale(locale);

  await loadEmployerSessionOrRedirect();

  return <EmployerJobApplications jobId={jobId} />;
}
