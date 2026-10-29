import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { CmsPortableText } from '@/components/cms-portable-text';
import { Link } from '@/i18n/navigation';
import { buildPublicPageMetadata } from '@/i18n/metadata';
import { pickLocalizedBilingual } from '@/features/jobs/lib/bilingual-label';
import { cn } from '@/lib/cn';
import {
  fetchCmsEditorialPage,
  fetchCmsHomeJobsDiscovery,
} from '@/lib/cms-content';
import { resolveNestPublicOrigin } from '@/lib/nest-api-url';
import { fetchPublicJobTaxonomy } from '@/lib/public-jobs';
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
  return buildPublicPageMetadata({
    locale,
    path: '/about',
    title: doc?.seoTitle?.trim() || doc?.title?.trim() || t('fallbackTitle'),
    description,
  });
}

const PILLARS = [
  {
    n: '01',
    key: 1,
    className: 'bg-primary text-primary-foreground',
    numberClass: 'opacity-35',
    top: 'md:top-6',
  },
  {
    n: '02',
    key: 2,
    className: 'bg-featured text-featured-foreground',
    numberClass: 'opacity-35',
    top: 'md:top-14',
  },
  {
    n: '03',
    key: 3,
    className: 'border border-border bg-card text-foreground',
    numberClass: 'text-primary opacity-30',
    top: 'md:top-[88px]',
  },
] as const;

/** Where the collage cards sit (desktop), as in the concept. */
const COLLAGE = [
  { r: '-6deg', pos: 'left-[4%] top-[6%] h-[56%] w-[52%]', delay: '0.1s, 0s' },
  { r: '5deg', pos: 'right-[2%] top-0 h-[46%] w-[44%]', delay: '0.25s, 1s' },
  { r: '3deg', pos: 'bottom-0 left-[18%] h-[44%] w-[46%]', delay: '0.4s, 2s' },
  {
    r: '-4deg',
    pos: 'bottom-[8%] right-[6%] h-[38%] w-[36%]',
    delay: '0.55s, 3s',
  },
] as const;

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const base = resolveNestPublicOrigin();
  const [doc, taxonomy, discovery] = await Promise.all([
    fetchAboutDoc(locale),
    base ? fetchPublicJobTaxonomy(base) : null,
    fetchCmsHomeJobsDiscovery(locale),
  ]);
  const t = await getTranslations('Editorial');
  const isAuthenticated = await hasAnyAuthSession();

  // Real fields for the ticker; the homepage category photos (CMS) for the
  // collage, with soft tiles while there are none.
  const fields = taxonomy?.ok
    ? taxonomy.data.categories.map((c) =>
        pickLocalizedBilingual(locale, c.nameSr, c.nameEn),
      )
    : [];
  const photos = (discovery?.categorySpotlights ?? [])
    .map((row) => row.imageUrl)
    .filter((url): url is string => Boolean(url))
    .slice(0, COLLAGE.length);

  return (
    <main className="overflow-hidden">
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-10 md:grid-cols-2 md:pt-14">
        <div>
          <span className="inline-flex rounded-full bg-featured-soft px-3.5 py-2 text-sm font-bold text-featured-soft-foreground">
            {t('aboutHeroEyebrow')}
          </span>
          <h1 className="m-0 mt-5 text-[clamp(2.75rem,7vw,5.75rem)] font-black leading-[0.98] tracking-[-0.045em] text-foreground">
            {t.rich('aboutHeroTitle', {
              mark: (chunks) => (
                <span className="[box-shadow:inset_0_-0.32em_0_var(--featured)]">
                  {chunks}
                </span>
              ),
            })}
          </h1>
          <p className="m-0 mt-6 max-w-xl text-xl leading-relaxed text-muted-foreground">
            {t('aboutHeroSubtitle')}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[t('headerChipTrust'), t('headerChipClarity')].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
        <div aria-hidden className="relative hidden h-[480px] md:block">
          {COLLAGE.map((card, idx) => (
            <div
              key={card.r}
              className={cn(
                'hf-pop absolute rounded-[22px] bg-card p-2.5 pb-9 shadow-[0_24px_50px_-24px_oklch(0.34_0.06_182_/_0.5)]',
                card.pos,
              )}
              style={
                {
                  '--hf-r': card.r,
                  transform: `rotate(${card.r})`,
                  animationDelay: card.delay,
                } as React.CSSProperties
              }
            >
              {photos[idx] ? (
                <img
                  src={photos[idx]}
                  alt=""
                  className="size-full rounded-[14px] object-cover"
                />
              ) : (
                <div className="size-full rounded-[14px] bg-gradient-to-br from-placeholder to-featured-soft" />
              )}
            </div>
          ))}
        </div>
      </section>

      {fields.length > 0 ? (
        <div aria-hidden className="overflow-hidden bg-footer py-5">
          <div className="hf-marquee flex w-max gap-3.5">
            {[...fields, ...fields].map((field, idx) => (
              <span
                key={`${field}-${idx}`}
                className="whitespace-nowrap text-[1.625rem] font-extrabold text-footer-foreground"
              >
                {field} <span className="text-featured">●</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <section className="mx-auto max-w-6xl px-4 pb-10 pt-24">
        <h2 className="hf-reveal m-0 mb-8 max-w-3xl text-[clamp(2.125rem,5vw,3.5rem)] font-black tracking-[-0.04em] text-foreground">
          {t('aboutPillarsTitle')}
        </h2>
        {/* A deck: each card sticks a little lower, so they stack. */}
        <div className="flex flex-col gap-6">
          {PILLARS.map((p) => (
            <article
              key={p.n}
              className={cn(
                'grid min-h-[340px] items-end gap-6 rounded-[32px] p-7 shadow-[0_-20px_50px_-40px_oklch(0.34_0.06_182_/_0.6)] md:sticky md:grid-cols-2 md:p-14',
                p.className,
                p.top,
              )}
            >
              <div
                aria-hidden
                className={cn(
                  'text-[clamp(5rem,12vw,10rem)] font-black leading-[0.8] tracking-[-0.06em]',
                  p.numberClass,
                )}
              >
                {p.n}
              </div>
              <div>
                <p className="m-0 text-sm font-bold uppercase tracking-[0.12em] opacity-85">
                  {t(`aboutPillar${p.key}Eyebrow`)}
                </p>
                <h3 className="m-0 mt-2.5 text-[2.125rem] font-black leading-tight tracking-[-0.03em]">
                  {t(`aboutPillar${p.key}Title`)}
                </h3>
                <p className="m-0 mt-3 text-lg leading-relaxed opacity-90">
                  {t(`aboutPillar${p.key}Body`)}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {doc ? (
        <section className="mx-auto grid max-w-6xl items-start gap-12 px-4 py-16 md:grid-cols-2">
          {doc.excerpt?.trim() ? (
            <blockquote className="hf-reveal m-0 border-l-[6px] border-featured pl-6 text-[clamp(1.75rem,3.5vw,2.5rem)] font-extrabold leading-tight tracking-[-0.03em] text-foreground">
              {doc.excerpt}
            </blockquote>
          ) : null}
          <div
            className={cn(
              'hf-reveal text-lg leading-relaxed text-muted-foreground',
              !doc.excerpt?.trim() && 'md:col-span-2',
            )}
          >
            <CmsPortableText value={doc.body} />
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-6xl px-4 pb-24 pt-16">
        <h2 className="hf-reveal m-0 text-[clamp(2.125rem,5vw,3.5rem)] font-black tracking-[-0.04em] text-foreground">
          {t('aboutJourneyTitle')}
        </h2>
        <div className="relative mt-10">
          <div
            aria-hidden
            className="hf-draw absolute inset-x-0 top-[22px] hidden h-1 rounded bg-featured md:block"
          />
          <ol className="relative m-0 grid list-none gap-7 p-0 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <li key={n} className="hf-reveal">
                <span className="flex size-12 items-center justify-center rounded-full bg-featured font-black text-featured-foreground shadow-[0_0_0_8px_var(--background)]">
                  {n}
                </span>
                <p className="m-0 mt-[18px] text-[0.8125rem] font-bold uppercase tracking-[0.12em] text-primary">
                  {t(`aboutJourneyStep${n}Eyebrow`)}
                </p>
                <p className="m-0 mt-1.5 text-[1.1875rem] font-semibold leading-normal text-foreground">
                  {t(`aboutJourneyStep${n}Body`)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="hf-reveal relative overflow-hidden rounded-[36px] bg-footer px-8 py-12 text-footer-foreground md:px-16 md:py-16">
          <div
            aria-hidden
            className="absolute -right-20 -top-20 size-[280px] rounded-full bg-featured opacity-90"
          />
          <div
            aria-hidden
            className="absolute -bottom-32 right-36 size-[220px] rounded-full border-[36px] border-primary"
          />
          <div className="relative max-w-xl">
            <h2 className="m-0 text-[clamp(2.125rem,5vw,3.75rem)] font-black leading-none tracking-[-0.04em]">
              {t('aboutCtaTitle')}
            </h2>
            <p className="m-0 mb-7 mt-4 text-[1.1875rem]">
              {t('aboutCtaBody')}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/jobs"
                locale={locale}
                className="hf-press inline-flex min-h-12 items-center rounded-full bg-featured px-6 font-extrabold text-featured-foreground no-underline"
              >
                {t('aboutCtaJobs')}
              </Link>
              {isAuthenticated ? null : (
                <Link
                  href="/sign-in"
                  locale={locale}
                  className="hf-press inline-flex min-h-12 items-center rounded-full border border-current px-6 font-bold text-footer-foreground no-underline"
                >
                  {t('aboutCtaSignIn')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
