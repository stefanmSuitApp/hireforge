import { getTranslations } from 'next-intl/server';

import type { PublicEmployerDirectoryItem } from 'contracts';

import { PublicSurfaceMain } from '@/components/public-surface';
import { Link } from '@/i18n/navigation';

type Props =
  | { kind: 'no-api'; locale: string }
  | { kind: 'error'; locale: string }
  | { kind: 'ok'; locale: string; items: PublicEmployerDirectoryItem[] };

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export async function EmployersDirectoryView(props: Props) {
  const t = await getTranslations('EmployersPage');
  const locale = props.locale;

  if (props.kind === 'no-api') {
    return (
      <PublicSurfaceMain className="pb-16 pt-8 md:pb-20 md:pt-12">
        <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/70 px-6 py-10 backdrop-blur-sm md:px-10 md:py-12">
          <div className="hf-hero-orb -right-16 -top-20 size-72 bg-primary/20" aria-hidden />
          <header className="relative">
            <h1 className="m-0 text-[clamp(1.85rem,3.8vw,2.6rem)] font-bold tracking-tight text-foreground">
              {t('title')}
            </h1>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground">{t('description')}</p>
          </header>
        </section>
        <div className="mt-8 rounded-2xl border border-dashed border-destructive/35 bg-destructive/5 px-6 py-10 text-center">
          <p className="m-0 text-sm text-foreground">{t('errorNoApi')}</p>
        </div>
      </PublicSurfaceMain>
    );
  }

  if (props.kind === 'error') {
    return (
      <PublicSurfaceMain className="pb-16 pt-8 md:pb-20 md:pt-12">
        <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/70 px-6 py-10 backdrop-blur-sm md:px-10 md:py-12">
          <div className="hf-hero-orb -left-20 -top-14 size-72 bg-cyan-400/20" aria-hidden />
          <header className="relative">
            <h1 className="m-0 text-[clamp(1.85rem,3.8vw,2.6rem)] font-bold tracking-tight text-foreground">
              {t('title')}
            </h1>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground">{t('description')}</p>
          </header>
        </section>
        <div className="mt-8 rounded-2xl border border-dashed border-destructive/35 bg-destructive/5 px-6 py-10 text-center">
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
    <PublicSurfaceMain className="pb-16 pt-8 md:pb-20 md:pt-12">
      <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/70 px-6 py-10 backdrop-blur-sm md:px-10 md:py-12">
        <div className="hf-hero-orb -left-24 -top-24 size-80 bg-primary/25" aria-hidden />
        <div className="hf-hero-orb -bottom-24 right-8 size-72 bg-emerald-400/20" aria-hidden />
        <header className="relative">
          <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            {t('headerEyebrow')}
          </span>
          <h1 className="m-0 text-[clamp(1.55rem,6vw,2.6rem)] font-bold tracking-tight text-foreground">
            {t('title')}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {t('description')}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-foreground">
              {t('headerCompanies', { count: items.length })}
            </span>
            <span className="inline-flex rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-foreground">
              {t('headerOpenings', { count: totalOpenRoles })}
            </span>
          </div>
        </header>
      </section>

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
          <p className="m-0 text-sm text-muted-foreground">{t('empty')}</p>
        </div>
      ) : (
        <ul className="mt-8 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((row) => (
            <li
              key={row.slug}
              className="rounded-2xl border border-border/60 bg-card/80 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-sm"
            >
              <Link
                href={`/companies/${row.slug}`}
                locale={locale}
                className="flex h-full flex-col justify-between gap-4 no-underline"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                      {initialsFromName(row.name)}
                    </span>
                    <div>
                      <p className="m-0 text-base font-semibold text-foreground">{row.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t('cardSlugLabel')}: {row.slug}
                      </p>
                    </div>
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('openRoles', { count: row.publishedJobCount })}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {row.publishedJobCount >= 6
                      ? t('cardInsightHigh')
                      : row.publishedJobCount >= 3
                        ? t('cardInsightMid')
                        : t('cardInsightLow')}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    {t('cardOpenProfile')}
                  </span>
                  <span className="text-sm font-medium text-primary" aria-hidden>
                    &rarr;
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PublicSurfaceMain>
  );
}
