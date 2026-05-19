import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { StaffNestFetchError } from '@/components/staff-nest-fetch-error';
import { ModeratorJobReview } from '@/features/moderator';
import { fetchModeratorJob } from '@/lib/fetch-moderator';
import { loadModeratorSessionOrRedirect } from '@/lib/moderator-workspace-load';
import { redirectToModeratorLoginIfUnauthorized } from '@/lib/staff-server-fetch-guard';

export default async function ModeratorJobReviewPage({
  params,
}: {
  params: Promise<{ locale: string; jobId: string }>;
}) {
  const { locale, jobId } = await params;
  setRequestLocale(locale);

  const session = await loadModeratorSessionOrRedirect();
  const job = await fetchModeratorJob(session.accessToken, jobId);
  if (!job.ok) {
    if (job.status === 404) {
      redirect(`/${locale}/moderator`);
    }
    redirectToModeratorLoginIfUnauthorized(locale, job.status);
    return <StaffNestFetchError status={job.status} />;
  }

  return (
    <ModeratorJobReview
      job={job.data}
      jobId={jobId}
      isAdmin={session.me.user.role === 'admin'}
    />
  );
}
