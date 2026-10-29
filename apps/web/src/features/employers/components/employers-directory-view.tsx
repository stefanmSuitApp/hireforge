import { getTranslations } from 'next-intl/server';

import type { PublicEmployerDirectoryItem } from 'contracts';

import { ArrowRight } from 'lucide-react';

import { CompanyInitials } from '@/components/company-initials';
import { PublicSurfaceMain } from '@/components/public-surface';
import { Link } from '@/i18n/navigation';

type Props =
  | { kind: 'no-api'; locale: string }
  | { kind: 'error'; locale: string }
  | {
      kind: 'ok';
      locale: string;
      items: PublicEmployerDirectoryItem[];
      /** A running campaign's line for the employer pitch. */
      promo?: string;
    };

const heroClass =
  'hf-reveal grid items-center gap-8 rounded-[32px] border border-border bg-card px-6 py-9 md:grid-cols-2 md:px-14 md:py-14';

export async function EmployersDirectoryView(props: Props) {
  const t = await getTranslations('EmployersPage');
  const locale = props.locale;

  if (props.kind === 'no-api') {
    return (
      <PublicSurfaceMain className="pb-16 pt-6 md:pb-20 md:pt-8">
        <section className={heroClass}>
          <header>
            <h1 className="m-0 text-[clamp(2.25rem,5vw,3.5rem)] font-extrabold tracking-tight text-foreground">
              {t('title')}
            </h1>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground">
              {t('description')}
            </p>
          </header>
        </section>
        <div className="mt-8 rounded-[24px] border border-dashed border-destructive/35 bg-destructive-soft px-6 py-10 text-center">
          <p className="m-0 text-sm text-foreground">{t('errorNoApi')}</p>
        </div>
      </PublicSurfaceMain>
    );
  }

  if (props.kind === 'error') {
    return (
      <PublicSurfaceMain className="pb-16 pt-6 md:pb-20 md:pt-8">
        <section className={heroClass}>
          <header>
            <h1 className="m-0 text-[clamp(2.25rem,5vw,3.5rem)] font-extrabold tracking-tight text-foreground">
              {t('title')}
            </h1>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground">
              {t('description')}
            </p>
          </header>
        </section>
        <div className="mt-8 rounded-[24px] border border-dashed border-destructive/35 bg-destructive-soft px-6 py-10 text-center">
          <p className="m-0 text-sm text-foreground">{t('errorGeneric')}</p>
        </div>
      </PublicSurfaceMain>
    );
  }

  const { items } = props;
  const totalOpenRoles = items.reduce(
    (sum, item) => sum + item.publishedJobCount,
    0,
  );

  return (
    <PublicSurfaceMain className="pb-16 pt-6 md:pb-20 md:pt-8">
      <section className={heroClass}>
        <header>
          <span className="inline-flex rounded-full bg-featured-soft px-3.5 py-1.5 text-[0.8125rem] font-bold text-featured-soft-foreground">
            {t('headerEyebrow')}
          </span>
          <h1 className="m-0 mt-4 text-[clamp(2.25rem,5vw,3.5rem)] font-extrabold tracking-tight text-foreground">
            {t('title')}
          </h1>
          <p className="m-0 mt-3 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {t('description')}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-accent px-3.5 py-2 text-sm font-bold text-accent-foreground">
              {t('headerCompanies', { count: items.length })}
            </span>
            <span className="rounded-full bg-muted px-3.5 py-2 text-sm font-semibold text-foreground">
              {t('headerOpenings', { count: totalOpenRoles })}
            </span>
          </div>
        </header>
        {/* The first companies as a tile wall (logos later, plan step 6);
            plain tiles keep its shape while there are fewer than six. */}
        <ul
          aria-hidden
          className="m-0 hidden list-none grid-cols-3 gap-3 p-0 md:grid"
        >
          {Array.from({ length: 6 }, (_, idx) => items[idx]).map((row, idx) => (
            <li
              key={row?.slug ?? `tile-${idx}`}
              className={idx % 2 ? 'hf-float' : undefined}
            >
              {row ? (
                <CompanyInitials
                  name={row.name}
                  slug={row.slug}
                  className="aspect-square size-auto w-full rounded-[20px] text-2xl"
                />
              ) : (
                <span className="block aspect-square rounded-[20px] bg-muted" />
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* For employers: no prices here (Stefan, 2026-10-29), just why and
          where to start; a running campaign says so. */}
      <section
        aria-labelledby="employers-pitch"
        className="hf-reveal mt-6 flex flex-col gap-5 rounded-[28px] bg-featured px-6 py-8 text-featured-foreground md:flex-row md:items-center md:justify-between md:px-8"
      >
        <div className="max-w-2xl">
          <h2
            id="employers-pitch"
            className="m-0 text-[1.75rem] font-extrabold tracking-tight"
          >
            {t('pitchTitle')}
          </h2>
          <p className="m-0 mt-2 leading-relaxed opacity-90">
            {t('pitchBody')}
          </p>
          {props.promo ? (
            <p className="m-0 mt-3.5 inline-flex rounded-xl bg-featured-foreground px-3 py-2 text-sm font-bold text-featured">
              {props.promo}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2.5">
          <Link
            href="/employer/register"
            locale={locale}
            className="hf-press inline-flex min-h-12 items-center rounded-full bg-featured-foreground px-6 font-bold text-featured no-underline"
          >
            {t('pitchRegister')}
          </Link>
          <Link
            href="/employer/login"
            locale={locale}
            className="hf-press inline-flex min-h-12 items-center rounded-full border border-current px-6 font-semibold text-featured-foreground no-underline"
          >
            {t('pitchSignIn')}
          </Link>
        </div>
      </section>

      {items.length === 0 ? (
        <div className="mt-10 rounded-[24px] border border-dashed border-border bg-muted/40 px-6 py-10 text-center">
          <p className="m-0 text-sm text-muted-foreground">{t('empty')}</p>
        </div>
      ) : (
        <ul className="m-0 mt-10 grid list-none gap-[18px] p-0 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((row) => (
            <li key={row.slug} className="hf-reveal">
              <Link
                href={`/companies/${row.slug}`}
                locale={locale}
                className="hf-lift group flex h-full flex-col overflow-hidden rounded-[24px] border border-border bg-card no-underline"
              >
                <span
                  aria-hidden
                  className="h-20 bg-gradient-to-br from-placeholder to-featured-soft"
                />
                <span className="flex flex-1 flex-col px-5 pb-5">
                  <CompanyInitials
                    name={row.name}
                    slug={row.slug}
                    className="-mt-8 size-16 rounded-[18px] border border-border bg-card"
                  />
                  <span className="mt-3 text-lg font-bold text-foreground group-hover:text-primary">
                    {row.name}
                  </span>
                  <span className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {row.publishedJobCount >= 6
                      ? t('cardInsightHigh')
                      : row.publishedJobCount >= 3
                        ? t('cardInsightMid')
                        : t('cardInsightLow')}
                  </span>
                  <span className="mt-auto flex items-center justify-between pt-4">
                    <span className="rounded-full bg-accent px-3 py-1 text-[0.8125rem] font-bold text-accent-foreground">
                      {t('openRoles', { count: row.publishedJobCount })}
                    </span>
                    <ArrowRight
                      className="size-4 text-primary transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PublicSurfaceMain>
  );
}
