import { getTranslations, setRequestLocale } from 'next-intl/server';

import {
  EmployerMySubscriptionsCard,
  EmployerPackagesPanel,
} from '@/features/employer';
import { EmployerPackagesHashScroll } from '@/features/employer/components/employer-packages-hash-scroll';
import { loadEmployerSessionOrRedirect } from '@/lib/employer-workspace-load';
import { fetchEmployerPackageCatalog } from '@/lib/fetch-employer-catalog';
import { fetchEmployerSubscriptions } from '@/lib/fetch-employer-subscriptions';

export default async function EmployerPackagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await loadEmployerSessionOrRedirect();
  const t = await getTranslations('Employer.packages');
  const [catalog, subscriptions] = await Promise.all([
    fetchEmployerPackageCatalog(session.accessToken),
    fetchEmployerSubscriptions(session.accessToken),
  ]);

  const header = (
    <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-foreground">{t('heading')}</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t('lead')}</p>
    </section>
  );

  const subscriptionsBlock = subscriptions.ok ? (
    <EmployerMySubscriptionsCard
      locale={locale}
      items={subscriptions.data.items}
      jobPostingSlots={session.workspace.jobPostingSlots ?? []}
    />
  ) : (
    <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <p className="text-sm text-destructive" role="alert">
        {t('subscriptionsLoadError')}
      </p>
    </section>
  );

  if (!catalog.ok) {
    const staleApiHint = catalog.status === 404 ? t('loadErrorStaleApi') : null;
    return (
      <div className="space-y-6">
        <EmployerPackagesHashScroll />
        {header}
        {subscriptionsBlock}
        <p className="text-sm text-destructive" role="alert">
          {t('loadError')}
        </p>
        {staleApiHint ? (
          <p className="mt-2 text-sm text-muted-foreground">{staleApiHint}</p>
        ) : null}
      </div >
    );
  }

  if (catalog.data.items.length === 0) {
    return (
      <div className="space-y-6">
        <EmployerPackagesHashScroll />
        {header}
        {subscriptionsBlock}
        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">{t('catalogEmpty')}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t('catalogEmptyHint')}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EmployerPackagesHashScroll />
      {header}
      {subscriptionsBlock}
      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <EmployerPackagesPanel
          companyId={session.workspace.company.id}
          emailVerified={session.workspace.user.emailVerified}
          items={catalog.data.items}
        />
      </section>
    </div>
  );
}
