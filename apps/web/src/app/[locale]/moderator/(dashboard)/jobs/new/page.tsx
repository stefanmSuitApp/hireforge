import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { StaffNestFetchError } from '@/components/staff-nest-fetch-error';
import { JobDraftFormPage } from '@/features/employer';
import { NewListingPickSubscription } from '@/features/employer/components/new-listing-pick-subscription';
import { Link } from '@/i18n/navigation';
import { fetchModeratorJobComposerBootstrap } from '@/lib/fetch-moderator';
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

export default async function ModeratorNewJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ companyId?: string; subscriptionId?: string }>;
}) {
  const { locale } = await params;
  const { companyId: companyIdRaw, subscriptionId: subscriptionIdParam } =
    await searchParams;
  setRequestLocale(locale);

  const companyId = companyIdRaw?.trim() ?? '';
  if (!companyId) {
    redirect(`/${locale}/moderator/companies`);
  }

  const session = await loadModeratorSessionOrRedirect();
  const bootstrap = await fetchModeratorJobComposerBootstrap(
    session.accessToken,
    companyId,
  );
  if (!bootstrap.ok) {
    redirectToModeratorLoginIfUnauthorized(locale, bootstrap.status);
    return <StaffNestFetchError status={bootstrap.status} />;
  }

  const t = await getTranslations('Moderator.jobsNew');
  const slots = bootstrap.data.jobPostingSlots ?? [];

  if (slots.length === 0) {
    return (
      <Card className="mx-auto mt-8 max-w-lg">
        <CardHeader>
          <CardTitle>{t('noSubscriptionsTitle')}</CardTitle>
          <CardDescription>{t('noSubscriptionsBody')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href={`/moderator/companies/${companyId}`} locale={locale}>
              {t('backToCompany')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const subscriptionIdRaw = subscriptionIdParam?.trim() ?? '';
  let resolved: (typeof slots)[number] | undefined;

  if (!subscriptionIdRaw) {
    if (slots.length === 1 && !slots[0].publishSlotsFull) {
      resolved = slots[0];
    } else {
      return (
        <NewListingPickSubscription
          locale={locale}
          slots={slots}
          newJobHref={(subscriptionId) =>
            `/moderator/jobs/new?companyId=${companyId}&subscriptionId=${subscriptionId}`
          }
          backHref={`/moderator/companies/${companyId}`}
          backLabel={t('backToCompany')}
        />
      );
    }
  } else {
    resolved = slots.find((s) => s.subscriptionId === subscriptionIdRaw);
  }

  if (!resolved) {
    return (
      <Card className="mx-auto mt-8 max-w-lg">
        <CardHeader>
          <CardTitle>{t('invalidSubscriptionTitle')}</CardTitle>
          <CardDescription>{t('invalidSubscriptionBody')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link
              href={`/moderator/jobs/new?companyId=${companyId}`}
              locale={locale}
            >
              {t('pickAgain')}
            </Link>
          </Button>
        </CardContent>
      </Card>
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
    <JobDraftFormPage
      key={`mod-new-${resolved.subscriptionId}`}
      mode="create"
      taxonomy={taxonomy}
      publishSlotsFull={resolved.publishSlotsFull}
      composerEntitlements={resolved.entitlements}
      createSubscriptionId={resolved.subscriptionId}
      listingPackageLabel={resolved.packageNameSnapshot}
      staffPortal
      staffCompanyId={companyId}
    />
  );
}
