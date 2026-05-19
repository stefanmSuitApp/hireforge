import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AdminUsersSection } from '@/features/admin';
import { loadAdminSessionOrRedirect } from '@/lib/admin-workspace-load';

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Admin.users');

  await loadAdminSessionOrRedirect();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground">
          {t('heading')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('hint')}</p>
      </section>
      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <AdminUsersSection />
      </section>
    </div>
  );
}
