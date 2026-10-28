'use client';

import * as React from 'react';

import { useTranslations } from 'next-intl';

import type { PublicJobDetailResponse } from 'contracts';

import { PublicSurfaceMain } from '@/components/public-surface';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

import { JobListingPreview } from './job-listing-preview';
import { TrackRecentlyViewedJob } from './track-recently-viewed-job';

export type JobDetailScreenProps =
  | { kind: 'no-api' }
  | { kind: 'error' }
  | {
      kind: 'ok';
      job: PublicJobDetailResponse;
      viewedSegment: string;
      /** Other live jobs of the same company (internal links). */
      moreFromCompany?: Array<{ title: string; href: string }>;
    };

export function JobDetailScreen(props: JobDetailScreenProps) {
  const t = useTranslations('JobDetail');

  if (props.kind === 'no-api') {
    return (
      <PublicSurfaceMain narrow>
        <div className="rounded-xl border border-dashed border-destructive/30 bg-destructive-soft px-5 py-9 text-center">
          {t('errorNoApi')}
        </div>
      </PublicSurfaceMain>
    );
  }

  if (props.kind === 'error') {
    return (
      <PublicSurfaceMain narrow>
        <div className="rounded-xl border border-dashed border-destructive/30 bg-destructive-soft px-5 py-9 text-center">
          {t('errorGeneric')}
        </div>
      </PublicSurfaceMain>
    );
  }

  const { job, viewedSegment, moreFromCompany = [] } = props;

  return (
    <PublicSurfaceMain narrow>
      <TrackRecentlyViewedJob segment={viewedSegment} />
      <Button
        variant="link"
        className="mb-4 h-auto px-0 text-muted-foreground"
        asChild
      >
        <Link href="/jobs">{t('backToJobs')}</Link>
      </Button>

      <JobListingPreview
        job={job}
        listingState={job.live ? 'live' : 'expired'}
        stickyApply
        // Room for the sticky apply bar on phones.
        className={job.live ? 'mb-20 md:mb-0' : undefined}
      />

      {moreFromCompany.length > 0 ? (
        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="m-0 mb-3 text-base font-semibold text-foreground">
            {t('moreFromCompany', { company: job.company.name })}
          </h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {moreFromCompany.map((j) => (
              <li key={j.href}>
                <Link
                  href={j.href}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {j.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </PublicSurfaceMain>
  );
}
