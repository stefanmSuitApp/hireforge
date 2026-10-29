import { getTranslations, setRequestLocale } from 'next-intl/server';

import { StaffNestFetchError } from '@/components/staff-nest-fetch-error';
import { AdminCampaignsPanel } from '@/features/admin';
import { loadAdminSessionOrRedirect } from '@/lib/admin-workspace-load';
import { fetchAdminCampaigns } from '@/lib/fetch-staff';
import { redirectToModeratorLoginIfUnauthorized } from '@/lib/staff-server-fetch-guard';

export default async function AdminCampaignsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Admin.campaigns');

  const session = await loadAdminSessionOrRedirect();
  const list = await fetchAdminCampaigns(session.accessToken);
  if (!list.ok) {
    redirectToModeratorLoginIfUnauthorized(locale, list.status);
    return <StaffNestFetchError status={list.status} />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground">
          {t('pageHeading')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('pageLead')}</p>
      </section>
      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <AdminCampaignsPanel items={list.data.items} locale={locale} />
      </section>
    </div>
  );
}
