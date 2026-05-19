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
  | { kind: 'error'; notFound: boolean }
  | { kind: 'ok'; job: PublicJobDetailResponse; viewedSegment: string };

export function JobDetailScreen(props: JobDetailScreenProps) {
  const t = useTranslations('JobDetail');

  if (props.kind === 'no-api') {
    return (
      <PublicSurfaceMain narrow>
        <div className="rounded-xl border border-dashed border-red-200 bg-red-50 px-5 py-9 text-center">
          {t('errorNoApi')}
        </div>
      </PublicSurfaceMain>
    );
  }

  if (props.kind === 'error') {
    const message = props.notFound ? t('errorNotFound') : t('errorGeneric');
    return (
      <PublicSurfaceMain narrow>
        <div className="rounded-xl border border-dashed border-red-200 bg-red-50 px-5 py-9 text-center">
          {message}
        </div>
      </PublicSurfaceMain>
    );
  }

  const { job, viewedSegment } = props;

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

      <JobListingPreview job={job} listingState="live" />
    </PublicSurfaceMain>
  );
}
