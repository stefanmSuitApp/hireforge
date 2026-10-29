'use client';

import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import type { PublicJobListItem } from 'contracts';

import { Link, usePathname } from '@/i18n/navigation';
import { publicJobUrlSegment } from '@/lib/job-public-segment';

import {
  localizedCategoryLine,
  localizedCityLine,
} from '../lib/bilingual-label';

export function SimilarJobsSection({
  jobId,
  listLocale,
}: {
  jobId: string;
  /** Locale at SSR paint — keeps hydration stable vs `useLocale()`. */
  listLocale: string;
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
    <section className="mt-6 border-t border-border pt-5">
      <h2 className="m-0 mb-3 text-base font-semibold text-foreground">
        {t('similarJobsTitle')}
      </h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {items.map((job) => {
          const city = localizedCityLine(locale, job.city);
          const cat = localizedCategoryLine(locale, job.category);
          return (
            <li key={job.id}>
              <Link
                href={`/jobs/${publicJobUrlSegment(job)}`}
                className="block rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-medium text-primary hover:bg-muted"
              >
                <span className="block text-foreground">{job.title}</span>
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
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
        <p className="m-0 mt-3 text-sm">
          <Link
            href={`/sign-in?returnTo=${encodeURIComponent(`/${locale}${pathname}`)}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {tJobs('similarMoreSignIn')}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
