import { getTranslations, setRequestLocale } from 'next-intl/server';

import { StaffNestFetchError } from '@/components/staff-nest-fetch-error';
import { AdminTaxonomyPanel } from '@/features/admin';
import { fetchAdminJobCategories } from '@/lib/fetch-staff';
import { loadAdminSessionOrRedirect } from '@/lib/admin-workspace-load';
import { redirectToModeratorLoginIfUnauthorized } from '@/lib/staff-server-fetch-guard';

export default async function AdminTaxonomyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Admin.taxonomy');

  const session = await loadAdminSessionOrRedirect();
  const cats = await fetchAdminJobCategories(session.accessToken);
  if (!cats.ok) {
    redirectToModeratorLoginIfUnauthorized(locale, cats.status);
    return <StaffNestFetchError status={cats.status} />;
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
        <AdminTaxonomyPanel categories={cats.data.items} />
      </section>
    </div>
  );
}
