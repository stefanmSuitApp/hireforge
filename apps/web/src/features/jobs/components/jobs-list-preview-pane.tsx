'use client';

import type { ReactNode } from 'react';

import { useTranslations } from 'next-intl';

import {
  PublicJobDetailQueryError,
  usePublicJobDetailQuery,
} from '@/hooks/queries/use-public-job-detail-query';
import { useMediaQuery } from '@/hooks/use-media-query';

import { JobListingPreview } from './job-listing-preview';

function JobListingPreviewSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-6 w-4/5 max-w-md animate-pulse rounded-md bg-muted/60" />
      <div className="h-4 w-3/5 animate-pulse rounded-md bg-muted/45" />
      <div className="space-y-2 pt-2">
        <div className="h-3 w-full animate-pulse rounded bg-muted/40" />
        <div className="h-3 w-full animate-pulse rounded bg-muted/40" />
        <div className="h-3 w-[90%] animate-pulse rounded bg-muted/40" />
        <div className="h-3 w-[70%] animate-pulse rounded bg-muted/40" />
      </div>
      <div className="h-24 animate-pulse rounded-xl bg-muted/35" />
    </div>
  );
}

type Props = {
  jobSegment: string;
  apiBasePresent: boolean;
};

export function JobsListPreviewPane({ jobSegment, apiBasePresent }: Props) {
  const t = useTranslations('Jobs');
  const tDetail = useTranslations('JobDetail');
  const isMdUp = useMediaQuery('(min-width: 768px)');
  const trimmed = jobSegment.trim();

  const shouldFetch = Boolean(trimmed && apiBasePresent && isMdUp);
  const query = usePublicJobDetailQuery({
    jobRef: trimmed,
    enabled: shouldFetch,
  });

  const showLoader =
    shouldFetch &&
    !query.data &&
    (query.isPending || query.isFetching);

  let body: ReactNode;
  if (!trimmed) {
    body = (
      <p className="text-sm text-muted-foreground">{t('previewPlaceholder')}</p>
    );
  } else if (!apiBasePresent) {
    body = (
      <p className="text-sm text-muted-foreground">{t('errorNoApi')}</p>
    );
  } else if (showLoader) {
    body = (
      <>
        <p className="mb-4 text-xs text-muted-foreground">{t('previewLoading')}</p>
        <JobListingPreviewSkeleton />
      </>
    );
  } else if (query.isError) {
    body = (
      <p className="text-sm text-muted-foreground">
        {query.error instanceof PublicJobDetailQueryError &&
        query.error.status === 404
          ? tDetail('errorNotFound')
          : t('previewLoadError')}
      </p>
    );
  } else if (query.data) {
    body = <JobListingPreview job={query.data} listingState="live" />;
  } else {
    body = (
      <p className="text-sm text-muted-foreground">{t('previewPlaceholder')}</p>
    );
  }

  return (
    <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-border/60 bg-card p-5">
      <p className="m-0 mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('previewHeading')}
      </p>
      {body}
    </div>
  );
}
