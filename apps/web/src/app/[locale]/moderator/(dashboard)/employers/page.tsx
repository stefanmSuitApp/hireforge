import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { ModeratorEmployersSection } from '@/features/moderator';
import { loadModeratorSessionOrRedirect } from '@/lib/moderator-workspace-load';

export default async function ModeratorEmployersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Moderator.employers');

  await loadModeratorSessionOrRedirect();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground">
          {t('heading')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('lead')}</p>
      </section>
      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <ModeratorEmployersSection />
      </section>
    </div>
  );
}
