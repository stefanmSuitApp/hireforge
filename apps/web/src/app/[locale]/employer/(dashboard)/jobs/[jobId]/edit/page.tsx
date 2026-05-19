import { setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';

import { JobDraftFormPage } from '@/features/employer';
import { EmployerJobReadOnly } from '@/features/employer/components/employer-job-read-only';
import { EmployerWorkspaceContentFrame } from '@/features/employer/components/employer-workspace-content-frame';
import { fetchEmployerJob } from '@/lib/fetch-employer-jobs';
import {
  loadEmployerSessionOrRedirect,
  loadEmployerWorkspaceOrRedirect,
} from '@/lib/employer-workspace-load';
import { resolveNestPublicOrigin } from '@/lib/nest-api-url';
import { fetchPublicJobTaxonomy } from '@/lib/public-jobs';

import type { PublicJobTaxonomyResponse } from 'contracts';
import { entitlementsBlobFallbackTezgaBaseline } from 'contracts';

const emptyTaxonomy: PublicJobTaxonomyResponse = {
  cities: [],
  cityGroups: [],
  categories: [],
};

export const dynamic = 'force-dynamic';

export default async function EditEmployerJobDraftPage({
  params,
}: {
  params: Promise<{ locale: string; jobId: string }>;
}) {
  const { locale, jobId } = await params;
  setRequestLocale(locale);

  const { accessToken } = await loadEmployerSessionOrRedirect();
  const workspace = await loadEmployerWorkspaceOrRedirect();
  const job = await fetchEmployerJob(accessToken, jobId);
  if (!job.ok) {
    if (job.status === 404 || job.status === 403) {
      notFound();
    }
    redirect(`/${locale}/employer`);
  }

  const base = resolveNestPublicOrigin();
  let taxonomy: PublicJobTaxonomyResponse = emptyTaxonomy;
  if (base) {
    const result = await fetchPublicJobTaxonomy(base);
    if (result.ok) {
      taxonomy = result.data;
    }
  }

  if (job.data.status !== 'draft' && job.data.status !== 'published') {
    return (
      <EmployerWorkspaceContentFrame>
        <EmployerJobReadOnly job={job.data} />
      </EmployerWorkspaceContentFrame>
    );
  }

  const draftSlot = job.data.subscriptionId
    ? (workspace.jobPostingSlots ?? []).find(
        (s) => s.subscriptionId === job.data.subscriptionId,
      )
    : undefined;

  const publishSlotsFull =
    job.data.status === 'draft' &&
    (draftSlot?.publishSlotsFull ??
      (workspace.jobPosting.kind === 'eligible'
        ? workspace.jobPosting.publishSlotsFull
        : false));

  const composerEntitlements =
    job.data.authoringEntitlements ??
    (workspace.jobPosting.kind === 'eligible'
      ? workspace.jobPosting.entitlements
      : entitlementsBlobFallbackTezgaBaseline);

  return (
    <EmployerWorkspaceContentFrame>
      <JobDraftFormPage
        key={jobId}
        mode="edit"
        jobId={jobId}
        initial={job.data}
        taxonomy={taxonomy}
        publishSlotsFull={publishSlotsFull}
        composerEntitlements={composerEntitlements}
      />
    </EmployerWorkspaceContentFrame>
  );
}
