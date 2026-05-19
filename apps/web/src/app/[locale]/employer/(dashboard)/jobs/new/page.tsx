import { setRequestLocale } from 'next-intl/server';

import { JobDraftFormPage } from '@/features/employer';
import { NewListingBlocked } from '@/features/employer/components/new-listing-blocked';
import { NewListingInvalidSubscription } from '@/features/employer/components/new-listing-invalid-subscription';
import { NewListingPickSubscription } from '@/features/employer/components/new-listing-pick-subscription';
import { EmployerWorkspaceContentFrame } from '@/features/employer/components/employer-workspace-content-frame';
import { loadEmployerWorkspaceOrRedirect } from '@/lib/employer-workspace-load';
import { resolveNestPublicOrigin } from '@/lib/nest-api-url';
import { fetchPublicJobTaxonomy } from '@/lib/public-jobs';

import type { PublicJobTaxonomyResponse } from 'contracts';

const emptyTaxonomy: PublicJobTaxonomyResponse = {
  cities: [],
  cityGroups: [],
  categories: [],
};

export default async function NewEmployerJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ subscriptionId?: string }>;
}) {
  const { locale } = await params;
  const { subscriptionId: subscriptionIdParam } = await searchParams;
  setRequestLocale(locale);

  const workspace = await loadEmployerWorkspaceOrRedirect();

  if (workspace.jobPosting.kind !== 'eligible') {
    return (
      <EmployerWorkspaceContentFrame>
        <NewListingBlocked locale={locale} jobPosting={workspace.jobPosting} />
      </EmployerWorkspaceContentFrame>
    );
  }

  const slots = workspace.jobPostingSlots ?? [];
  if (slots.length === 0) {
    return (
      <EmployerWorkspaceContentFrame>
        <NewListingBlocked
          locale={locale}
          jobPosting={{ kind: 'no_subscription' }}
        />
      </EmployerWorkspaceContentFrame>
    );
  }

  const subscriptionIdRaw = subscriptionIdParam?.trim() ?? '';
  let resolved: (typeof slots)[number] | undefined;

  if (!subscriptionIdRaw) {
    if (slots.length === 1 && !slots[0].publishSlotsFull) {
      resolved = slots[0];
    } else {
      return (
        <EmployerWorkspaceContentFrame>
          <NewListingPickSubscription locale={locale} slots={slots} />
        </EmployerWorkspaceContentFrame>
      );
    }
  } else {
    resolved = slots.find((s) => s.subscriptionId === subscriptionIdRaw);
  }

  if (!resolved) {
    return (
      <EmployerWorkspaceContentFrame>
        <NewListingInvalidSubscription locale={locale} />
      </EmployerWorkspaceContentFrame>
    );
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
    <EmployerWorkspaceContentFrame>
      <JobDraftFormPage
        key={`new-${resolved.subscriptionId}`}
        mode="create"
        taxonomy={taxonomy}
        publishSlotsFull={resolved.publishSlotsFull}
        composerEntitlements={resolved.entitlements}
        createSubscriptionId={resolved.subscriptionId}
        listingPackageLabel={resolved.packageNameSnapshot}
      />
    </EmployerWorkspaceContentFrame>
  );
}
