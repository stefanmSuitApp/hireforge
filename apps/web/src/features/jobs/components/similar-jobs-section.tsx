'use client';

import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import type { PublicJobListItem } from 'contracts';

import { Link } from '@/i18n/navigation';
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
    <section className="mt-6 border-t border-gray-200 pt-5">
      <h2 className="m-0 mb-3 text-base font-semibold text-gray-900">
        {t('similarJobsTitle')}
      </h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {items.map((job) => {
          const seg = publicJobUrlSegment(job);
          const city = localizedCityLine(locale, job.city);
          const cat = localizedCategoryLine(locale, job.category);
          return (
            <li key={job.id}>
              <Link
                href={`/jobs/${seg}`}
                className="block rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-sm font-medium text-teal-800 hover:bg-gray-100"
              >
                <span className="block text-gray-900">{job.title}</span>
                <span className="mt-0.5 block text-xs font-normal text-gray-600">
                  {job.company.name}
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
