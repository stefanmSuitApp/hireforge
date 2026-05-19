import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default async function CandidateHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Candidate.home');

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground">{t('heading')}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t('body')}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild className="h-auto justify-center py-3">
            <Link href="/candidate/cv/build" locale={locale}>
              {t('ctaBuildCv')}
            </Link>
          </Button>
          <Button variant="outline" asChild className="h-auto justify-center py-3">
            <Link href="/candidate/applications" locale={locale}>
              {t('ctaApplications')}
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-border/70 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t('cardApplicationsLabel')}
          </p>
          <p className="mt-2 text-sm text-foreground">{t('cardApplicationsBody')}</p>
        </article>
        <article className="rounded-xl border border-border/70 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t('cardProfileLabel')}
          </p>
          <p className="mt-2 text-sm text-foreground">{t('cardProfileBody')}</p>
        </article>
        <article className="rounded-xl border border-border/70 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t('cardCvLabel')}
          </p>
          <p className="mt-2 text-sm text-foreground">{t('cardCvBody')}</p>
        </article>
      </section>
    </div>
  );
}
