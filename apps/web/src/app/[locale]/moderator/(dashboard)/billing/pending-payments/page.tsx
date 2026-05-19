import { getTranslations, setRequestLocale } from 'next-intl/server';

import { StaffNestFetchError } from '@/components/staff-nest-fetch-error';
import { ModeratorPendingPaymentsPanel } from '@/features/moderator';
import { fetchModeratorPendingSubscriptionPayments } from '@/lib/fetch-moderator';
import { loadModeratorSessionOrRedirect } from '@/lib/moderator-workspace-load';
import { redirectToModeratorLoginIfUnauthorized } from '@/lib/staff-server-fetch-guard';

export default async function ModeratorPendingPaymentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { accessToken } = await loadModeratorSessionOrRedirect();
  const res = await fetchModeratorPendingSubscriptionPayments(accessToken);
  if (!res.ok) {
    redirectToModeratorLoginIfUnauthorized(locale, res.status);
    return <StaffNestFetchError status={res.status} />;
  }

  const t = await getTranslations('Moderator.billingPending');

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground">
          {t('heading')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('lead')}</p>
      </section>
      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <ModeratorPendingPaymentsPanel initialItems={res.data.items} />
      </section>
    </div>
  );
}
