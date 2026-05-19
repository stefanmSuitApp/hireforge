import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { CmsPortableText } from '@/components/cms-portable-text';
import { PublicSurfaceMain } from '@/components/public-surface';
import { Link } from '@/i18n/navigation';
import { buildLocaleAlternates } from '@/i18n/metadata';
import { fetchCmsEditorialPage } from '@/lib/cms-content';
import { hasAnyAuthSession } from '@/lib/unified-auth';

async function fetchAboutDoc(locale: string) {
  const primary = await fetchCmsEditorialPage('about-hireforge', locale);
  if (primary) return primary;
  return fetchCmsEditorialPage('about', locale);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Editorial');
  const doc = await fetchAboutDoc(locale);
  const rawDesc = doc?.seoDescription?.trim() || doc?.excerpt?.trim() || '';
  const description = rawDesc ? rawDesc.slice(0, 320) : t('defaultDescription');
  return {
    title: doc?.seoTitle?.trim() || doc?.title?.trim() || t('fallbackTitle'),
    description,
    alternates: buildLocaleAlternates(locale, '/about'),
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const doc = await fetchAboutDoc(locale);
  if (!doc) notFound();
  const t = await getTranslations('Editorial');
  const isAuthenticated = await hasAnyAuthSession();

  return (
    <PublicSurfaceMain className="pb-16 pt-8 md:pb-20 md:pt-14">
      <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/70 px-6 py-10 backdrop-blur-sm md:px-10 md:py-12">
        <div className="hf-hero-orb -left-24 -top-24 size-80 bg-primary/25" aria-hidden />
        <div className="hf-hero-orb -bottom-24 right-8 size-72 bg-cyan-400/20" aria-hidden />
        <header className="relative">
          <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            {t('aboutHeroEyebrow')}
          </span>
          <h1 className="m-0 text-[clamp(1.55rem,6vw,2.6rem)] font-bold tracking-tight text-foreground">
            {t('aboutHeroTitle')}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            {t('aboutHeroSubtitle')}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-foreground">
              {t('headerChipTrust')}
            </span>
            <span className="inline-flex rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-foreground">
              {t('headerChipClarity')}
            </span>
          </div>
        </header>
      </section>

      <section className="mx-auto mt-10 max-w-4xl rounded-3xl border border-border/60 bg-card/80 p-6 md:p-10">
        <CmsPortableText value={doc.body} />
      </section>

      <section className="mx-auto mt-10 max-w-5xl">
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-border/60 bg-card/70 p-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
              {t('aboutPillar1Eyebrow')}
            </p>
            <h2 className="text-lg font-semibold text-foreground">{t('aboutPillar1Title')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t('aboutPillar1Body')}
            </p>
          </article>
          <article className="rounded-2xl border border-border/60 bg-card/70 p-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
              {t('aboutPillar2Eyebrow')}
            </p>
            <h2 className="text-lg font-semibold text-foreground">{t('aboutPillar2Title')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t('aboutPillar2Body')}
            </p>
          </article>
          <article className="rounded-2xl border border-border/60 bg-card/70 p-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
              {t('aboutPillar3Eyebrow')}
            </p>
            <h2 className="text-lg font-semibold text-foreground">{t('aboutPillar3Title')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t('aboutPillar3Body')}
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-5xl rounded-3xl border border-border/60 bg-gradient-to-br from-card to-muted/40 p-6 md:p-8">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{t('aboutJourneyTitle')}</h2>
        <ul className="mt-5 grid list-none gap-3 p-0 md:grid-cols-3">
          <li className="rounded-xl border border-border/60 bg-background/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t('aboutJourneyStep1Eyebrow')}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{t('aboutJourneyStep1Body')}</p>
          </li>
          <li className="rounded-xl border border-border/60 bg-background/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t('aboutJourneyStep2Eyebrow')}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{t('aboutJourneyStep2Body')}</p>
          </li>
          <li className="rounded-xl border border-border/60 bg-background/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t('aboutJourneyStep3Eyebrow')}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{t('aboutJourneyStep3Body')}</p>
          </li>
        </ul>
      </section>

      <section className="mx-auto mt-8 flex max-w-5xl flex-wrap items-center justify-between gap-4 rounded-3xl border border-primary/20 bg-primary/[0.06] p-5 md:p-8">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{t('aboutCtaTitle')}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t('aboutCtaBody')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAuthenticated ? <Link
            href="/jobs"
            locale={locale}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            {t('aboutCtaJobs')}
          </Link> :
            <Link
              href="/sign-in"
              locale={locale}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              {t('aboutCtaSignIn')}
            </Link>}
        </div>
      </section>
    </PublicSurfaceMain>
  );
}
