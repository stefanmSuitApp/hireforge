'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import type { PublicJobListItem, PublicJobListResponse } from 'contracts';

import { usePublicJobsInfiniteQuery } from '@/hooks/queries/use-public-jobs-infinite-query';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { publicJobUrlSegment } from '@/lib/job-public-segment';

import {
  buildJobsSearchParamsFromUrl,
  jobsListFilterSignature,
  mergeJobsSearchParams,
  type JobsFilterDefaults,
} from '../lib/jobs-list-query';

import {
  PUBLIC_JOB_CARD_ESTIMATE_PX,
  PublicJobCardSkeleton,
} from './public-job-card-skeleton';
import { PublicJobCard } from './public-job-card';

type Props = {
  initialPage: PublicJobListResponse;
  listSignature: string;
  pageSize: number;
  defaults: JobsFilterDefaults;
  apiBasePresent: boolean;
};

function dedupeItems(pages: PublicJobListResponse[]): PublicJobListItem[] {
  const seen = new Set<string>();
  const out: PublicJobListItem[] = [];
  for (const p of pages) {
    for (const job of p.items) {
      if (seen.has(job.id)) continue;
      seen.add(job.id);
      out.push(job);
    }
  }
  return out;
}

export function JobsInfiniteList({
  initialPage,
  listSignature,
  pageSize,
  defaults,
  apiBasePresent,
}: Props) {
  const t = useTranslations('Jobs');
  const locale = useLocale();
  const format = useFormatter();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const returnToPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

  const search = React.useMemo(
    () => buildJobsSearchParamsFromUrl(searchParams, defaults),
    [
      searchParams,
      defaults.q,
      defaults.city,
      defaults.category,
      defaults.job,
      defaults.workModel,
      defaults.employmentType,
      defaults.postedWithin,
      defaults.easyApply,
    ],
  );

  const clientSig = React.useMemo(
    () => jobsListFilterSignature(search, pageSize),
    [search, pageSize],
  );

  const seedFromInitialPage = clientSig === listSignature;

  const query = usePublicJobsInfiniteQuery({
    search,
    pageSize,
    initialPage,
    seedFromInitialPage,
    enabled: apiBasePresent,
  });

  const selectedSegment = defaults.job.trim();

  function publishedMedium(iso: string | null): string {
    if (!iso) return '—';
    try {
      return format.dateTime(new Date(iso), { dateStyle: 'medium' });
    } catch {
      return iso;
    }
  }

  function jobCardSelected(job: PublicJobListItem): boolean {
    if (!selectedSegment) return false;
    const seg = publicJobUrlSegment(job);
    return seg === selectedSegment || job.id === selectedSegment;
  }

  function selectJobSegment(seg: string) {
    const n = mergeJobsSearchParams(searchParams, { job: seg });
    router.replace(`${pathname}?${n.toString()}`, { scroll: false });
  }

  const items = React.useMemo(
    () =>
      query.data?.pages?.length
        ? dedupeItems(query.data.pages)
        : seedFromInitialPage
          ? initialPage.items
          : [],
    [query.data?.pages, seedFromInitialPage, initialPage.items],
  );

  const parentRef = React.useRef<HTMLDivElement>(null);
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;

  React.useEffect(() => {
    const root = parentRef.current;
    const el = loadMoreRef.current;
    if (!root || !el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const [e] = entries;
        if (e?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { root, rootMargin: '280px 0px', threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const virtEnabled = items.length > 24;
  const virtualizer = useVirtualizer({
    count: virtEnabled ? items.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => PUBLIC_JOB_CARD_ESTIMATE_PX + 12,
    overscan: 6,
    enabled: virtEnabled,
  });

  const showListSkeleton =
    !seedFromInitialPage && (query.isPending || query.isFetching) && !items.length;

  const skeletonCount = pageSize;

  let listBody: React.ReactNode;
  if (showListSkeleton) {
    listBody = (
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {Array.from({ length: skeletonCount }, (_, i) => (
          <li key={`sk-${i}`}>
            <PublicJobCardSkeleton />
          </li>
        ))}
      </ul>
    );
  } else if (virtEnabled) {
    listBody = (
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((vi) => {
          const job = items[vi.index];
          return (
            <div
              key={job.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${vi.start}px)`,
              }}
            >
              <div className="pb-3">
                <PublicJobCard
                  job={job}
                  selected={jobCardSelected(job)}
                  onSelectDesktop={(seg) => selectJobSegment(seg)}
                  listLocale={locale}
                  returnToPath={returnToPath}
                  publishedLabel={t('publishedLabel')}
                  publishedMedium={publishedMedium}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  } else {
    listBody = (
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {items.map((job) => (
          <li key={job.id}>
            <PublicJobCard
              job={job}
              selected={jobCardSelected(job)}
              onSelectDesktop={(seg) => selectJobSegment(seg)}
              listLocale={locale}
              returnToPath={returnToPath}
              publishedLabel={t('publishedLabel')}
              publishedMedium={publishedMedium}
            />
          </li>
        ))}
      </ul>
    );
  }

  const total = query.data?.pages?.[0]?.total ?? initialPage.total;
  const loaded = items.length;

  return (
    <>
      <p className="mb-3 hidden text-xs text-muted-foreground md:block">
        {t('twoColumnNavHint')}
      </p>
      <div
        ref={parentRef}
        className={
          virtEnabled || items.length > 0
            ? 'max-h-[min(70vh,720px)] overflow-y-auto pr-1'
            : undefined
        }
      >
        {listBody}
        <div ref={loadMoreRef} className="h-2 w-full shrink-0" aria-hidden />
        {query.isFetchingNextPage ? (
          <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0 pb-1">
            {Array.from({ length: Math.min(3, skeletonCount) }, (_, i) => (
              <li key={`more-sk-${i}`}>
                <PublicJobCardSkeleton />
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {query.isError ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {t('infiniteListError')}
        </p>
      ) : null}

      <nav
        className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-6"
        aria-label={t('listStatusNav')}
      >
        <p className="m-0 text-sm text-muted-foreground">
          {loaded < total
            ? t('listStatusPartial', { loaded, total })
            : t('listStatusComplete', { total })}
        </p>
        {hasNextPage ? (
          <p className="m-0 text-xs text-muted-foreground">{t('scrollForMore')}</p>
        ) : loaded > 0 ? (
          <p className="m-0 text-xs text-muted-foreground">{t('endOfList')}</p>
        ) : null}
      </nav>
    </>
  );
}
