import { getTranslations, setRequestLocale } from 'next-intl/server';

import { StaffNestFetchError } from '@/components/staff-nest-fetch-error';
import { AdminEnterprisePendingPanel } from '@/features/admin';
import { loadAdminSessionOrRedirect } from '@/lib/admin-workspace-load';
import { fetchAdminPendingEnterpriseSubscriptions } from '@/lib/fetch-staff';

export default async function AdminEnterpriseBillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const paramsResolved = await params;
  setRequestLocale(paramsResolved.locale);
  const session = await loadAdminSessionOrRedirect();
  const res = await fetchAdminPendingEnterpriseSubscriptions(
    session.accessToken,
  );
  if (!res.ok) {
    return <StaffNestFetchError status={res.status} />;
  }

  const t = await getTranslations('Admin.billingEnterprise');

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground">
          {t('heading')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('lead')}</p>
      </section>
      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <AdminEnterprisePendingPanel initialItems={res.data.items} />
      </section>
    </div>
  );
}
