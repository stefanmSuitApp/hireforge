import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';

import { ModeratorCompanyCreateForm } from '@/features/moderator';
import { loadModeratorSessionOrRedirect } from '@/lib/moderator-workspace-load';

export default async function ModeratorCompanyNewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await loadModeratorSessionOrRedirect();
  const t = await getTranslations('Moderator.companies');

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground">
          {t('createHeading')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('createLead')}</p>
      </section>
      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <ModeratorCompanyCreateForm />
      </section>
    </div>
  );
}
