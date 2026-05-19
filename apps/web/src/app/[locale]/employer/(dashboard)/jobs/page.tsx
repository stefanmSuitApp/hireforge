import { setRequestLocale } from 'next-intl/server';

import { EmployerJobsList } from '@/features/employer/components/employer-jobs-list';
import { resolveEmployerAddListingHref } from '@/lib/employer-add-listing-href';
import { loadEmployerSessionOrRedirect } from '@/lib/employer-workspace-load';

export default async function EmployerJobsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await loadEmployerSessionOrRedirect();
  const addListingHref = resolveEmployerAddListingHref(session.workspace);

  return <EmployerJobsList addListingHref={addListingHref} />;
}
