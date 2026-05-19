'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import type { PublicJobListResponse } from 'contracts';

import {
  buildListQuery,
  type JobsSearchParams,
} from '@/features/jobs/lib/jobs-list-query';

export function publicJobsInfiniteQueryKey(
  search: JobsSearchParams,
  pageSize: number,
) {
  return ['public-jobs-list', pageSize, search] as const;
}

async function fetchJobsPage(
  page: number,
  search: JobsSearchParams,
  pageSize: number,
): Promise<PublicJobListResponse> {
  const qp = buildListQuery(search, page, pageSize);
  const res = await fetch(`/api/public/jobs?${qp.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json() as Promise<PublicJobListResponse>;
}

type Args = {
  search: JobsSearchParams;
  pageSize: number;
  initialPage: PublicJobListResponse;
  /** When false, omit `initialData` so a stale SSR page is not shown after filters change. */
  seedFromInitialPage: boolean;
  enabled: boolean;
};

export function usePublicJobsInfiniteQuery({
  search,
  pageSize,
  initialPage,
  seedFromInitialPage,
  enabled,
}: Args) {
  return useInfiniteQuery({
    queryKey: publicJobsInfiniteQueryKey(search, pageSize),
    queryFn: ({ pageParam }) =>
      fetchJobsPage(pageParam as number, search, pageSize),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const loaded = last.page * last.pageSize;
      return loaded < last.total ? last.page + 1 : undefined;
    },
    ...(seedFromInitialPage
      ? {
          initialData: {
            pages: [initialPage],
            pageParams: [1],
          },
        }
      : {}),
    enabled,
    staleTime: 30_000,
  });
}
