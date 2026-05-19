import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { StaffNestFetchError } from '@/components/staff-nest-fetch-error';
import { JobDraftFormPage } from '@/features/employer';
import { fetchModeratorJobAuthoring } from '@/lib/fetch-moderator';
import { loadModeratorSessionOrRedirect } from '@/lib/moderator-workspace-load';
import { resolveNestPublicOrigin } from '@/lib/nest-api-url';
import { fetchPublicJobTaxonomy } from '@/lib/public-jobs';
import { redirectToModeratorLoginIfUnauthorized } from '@/lib/staff-server-fetch-guard';

import type { PublicJobTaxonomyResponse } from 'contracts';

const emptyTaxonomy: PublicJobTaxonomyResponse = {
  cities: [],
  cityGroups: [],
  categories: [],
};

export default async function ModeratorJobEditPage({
  params,
}: {
  params: Promise<{ locale: string; jobId: string }>;
}) {
  const { locale, jobId } = await params;
  setRequestLocale(locale);

  const session = await loadModeratorSessionOrRedirect();
  const job = await fetchModeratorJobAuthoring(session.accessToken, jobId);
  if (!job.ok) {
    if (job.status === 404) {
      redirect(`/${locale}/moderator`);
    }
    redirectToModeratorLoginIfUnauthorized(locale, job.status);
    return <StaffNestFetchError status={job.status} />;
  }

  const entitlements = job.data.authoringEntitlements;
  if (!entitlements) {
    redirect(`/${locale}/moderator/jobs/${jobId}`);
  }

  const base = resolveNestPublicOrigin();
  let taxonomy: PublicJobTaxonomyResponse = emptyTaxonomy;
  if (base) {
    const result = await fetchPublicJobTaxonomy(base);
    if (result.ok) {
      taxonomy = result.data;
    }
  }

  return (
    <JobDraftFormPage
      mode="edit"
      jobId={jobId}
      initial={job.data}
      taxonomy={taxonomy}
      composerEntitlements={entitlements}
      staffPortal
    />
  );
}
