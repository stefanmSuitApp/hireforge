'use client';

import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import type { PublicJobListItem } from 'contracts';

import { Link } from '@/i18n/navigation';
import { publicJobCardHref } from '@/lib/job-public-segment';

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
  const [items, setItems] = React.useState<PublicJobListItem[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/public/jobs/${jobId}/similar`);
        if (!res.ok) {
          if (!cancelled) setItems([]);
          return;
        }
        const data = (await res.json()) as { items: PublicJobListItem[] };
        if (!cancelled) setItems(data.items ?? []);
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
                href={publicJobCardHref(job, locale)}
                className="block rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-medium text-primary hover:bg-muted"
              >
                <span className="block text-foreground">{job.title}</span>
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  {job.company?.name ?? tJobs('lockedCompany')}
                  {city ? ` · ${city}` : ''}
                  {cat ? ` · ${cat}` : ''}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
