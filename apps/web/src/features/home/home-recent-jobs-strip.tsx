'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';

import type { PublicJobListItem } from 'contracts';

import { PublicJobTeaserCard } from '@/features/jobs/components/public-job-teaser-card';
import { readRecentJobRefs } from '@/lib/recently-viewed-jobs';

export function HomeRecentJobsStrip({
  locale,
  featuredRibbonLabel,
  isAuthenticated = true,
}: {
  locale: string;
  featuredRibbonLabel: string;
  isAuthenticated?: boolean;
}) {
  const t = useTranslations('Home');
  const [items, setItems] = React.useState<PublicJobListItem[] | null>(null);

  React.useEffect(() => {
    const refs = readRecentJobRefs();
    if (refs.length === 0) {
      setItems([]);
      return;
    }
    let cancelled = false;
    void fetch(
      `/api/public/jobs/previews?refs=${encodeURIComponent(refs.join(','))}`,
    )
      .then((r) => r.json())
      .then((d: { items?: PublicJobListItem[] }) => {
        if (!cancelled) setItems(d.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (items === null) {
    return (
      <section>
        <div className="mb-8 h-8 w-48 animate-pulse rounded bg-muted/50" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((k) => (
            <div
              key={k}
              className="h-32 animate-pulse rounded-2xl bg-muted/40"
            />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="m-0 mb-8 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        {t('recentJobsTitle')}
      </h2>
      <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((job) => (
          <li key={job.id}>
            <PublicJobTeaserCard
              job={job}
              locale={locale}
              spotlight={job.featured}
              featuredRibbonLabel={featuredRibbonLabel}
              isAuthenticated={isAuthenticated}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
