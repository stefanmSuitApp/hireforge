'use client';

import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import type { PublicJobListItem } from 'contracts';

import { CompanyInitials } from '@/components/company-initials';
import { Link, usePathname } from '@/i18n/navigation';
import { publicJobUrlSegment } from '@/lib/job-public-segment';

import {
  localizedCategoryLine,
  localizedCityLine,
} from '../lib/bilingual-label';

export function SimilarJobsSection({
  jobId,
  listLocale,
  className,
}: {
  jobId: string;
  /** Locale at SSR paint — keeps hydration stable vs `useLocale()`. */
  listLocale: string;
  className?: string;
}) {
  const t = useTranslations('JobDetail');
  const tJobs = useTranslations('Jobs');
  const hookLocale = useLocale();
  const locale = listLocale || hookLocale;
  const pathname = usePathname();
  const [items, setItems] = React.useState<PublicJobListItem[] | null>(null);
  // Guests see 3; the API says when signing in shows more.
  const [moreAvailable, setMoreAvailable] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/public/jobs/${jobId}/similar`);
        if (!res.ok) {
          if (!cancelled) setItems([]);
          return;
        }
        const data = (await res.json()) as {
          items: PublicJobListItem[];
          moreAvailable?: boolean;
        };
        if (!cancelled) {
          setItems(data.items ?? []);
          setMoreAvailable(data.moreAvailable === true);
        }
      } catch {
        if (!cancelled) setItems([]);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  if (items === null || items.length === 0) {
    return null;
  }

  return (
    <section className={className}>
      <h2 className="m-0 text-[1.625rem] font-extrabold tracking-tight text-foreground @2xl:text-3xl">
        {t('similarJobsTitle')}
      </h2>
      <ul className="m-0 mt-5 grid list-none gap-4 p-0 @2xl:grid-cols-3">
        {items.map((job) => {
          const city = localizedCityLine(locale, job.city);
          const cat = localizedCategoryLine(locale, job.category);
          return (
            <li key={job.id}>
              <Link
                href={`/jobs/${publicJobUrlSegment(job)}`}
                className="hf-lift group block h-full rounded-[22px] border border-border bg-card p-5 no-underline"
              >
                <CompanyInitials name={job.company.name} />
                <span className="mt-3.5 block text-lg font-bold leading-snug text-foreground group-hover:text-primary">
                  {job.title}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {job.company.name}
                  {city ? ` · ${city}` : ''}
                  {cat ? ` · ${cat}` : ''}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {moreAvailable ? (
        <p className="m-0 mt-4 text-sm">
          <Link
            href={`/sign-in?returnTo=${encodeURIComponent(`/${locale}${pathname}`)}`}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {tJobs('similarMoreSignIn')}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
