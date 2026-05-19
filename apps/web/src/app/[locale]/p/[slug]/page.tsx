import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, permanentRedirect } from 'next/navigation';

import { CmsPortableText } from '@/components/cms-portable-text';
import { PublicSurfaceMain } from '@/components/public-surface';
import { Link } from '@/i18n/navigation';
import { buildEditorialPublicMetadata } from '@/lib/editorial-metadata';
import { fetchCmsEditorialPage } from '@/lib/cms-content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  return buildEditorialPublicMetadata(params);
}

export default async function EditorialCmsPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (slug === 'about-hireforge') {
    permanentRedirect(`/${locale}/about`);
  }
  setRequestLocale(locale);
  const doc = await fetchCmsEditorialPage(slug, locale);
  if (!doc) notFound();
  const t = await getTranslations('Editorial');
  const isAboutPage = slug === 'about' || slug === 'o-nama';

  return (
    <PublicSurfaceMain className="pb-20 pt-10 md:pt-14">
      <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/70 px-6 py-10 backdrop-blur-sm md:px-12 md:py-14">
        <div className="hf-hero-orb -left-24 -top-24 size-96 bg-primary/20" aria-hidden />
        <div className="hf-hero-orb -bottom-28 right-2 size-80 bg-cyan-400/20" aria-hidden />
        <header className="relative mx-auto max-w-3xl">
          <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            {t('headerEyebrow')}
          </span>
          <h1 className="text-[clamp(2rem,4.6vw,3.1rem)] font-extrabold tracking-tight text-foreground">
            {doc.title}
          </h1>
          {doc.excerpt?.trim() ? (
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{doc.excerpt}</p>
          ) : null}
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

      {isAboutPage ? (
        <>
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

          <section className="mx-auto mt-8 flex max-w-5xl flex-wrap items-center justify-between gap-4 rounded-3xl border border-primary/20 bg-primary/[0.06] p-6 md:p-8">
            <div>
              <h2 className="text-xl font-semibold text-foreground">{t('aboutCtaTitle')}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t('aboutCtaBody')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/jobs"
                locale={locale}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                {t('aboutCtaJobs')}
              </Link>
              <Link
                href="/sign-in"
                locale={locale}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/60"
              >
                {t('aboutCtaSignIn')}
              </Link>
            </div>
          </section>
        </>
      ) : null}
    </PublicSurfaceMain>
  );
}
