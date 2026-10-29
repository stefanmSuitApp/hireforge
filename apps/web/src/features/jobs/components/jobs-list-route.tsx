import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

import type { PublicJobTaxonomyResponse } from 'contracts';

import { resolveNestPublicOrigin } from '@/lib/nest-api-url';
import { hasAnyAuthSession } from '@/lib/unified-auth';
import {
  fetchPublicJobTaxonomy,
  fetchPublicJobsList,
  isPublicApiOutage,
  PublicApiUnavailableError,
} from '@/lib/public-jobs';

import {
  buildListQuery,
  jobsListFilterSignature,
  resolveListPageSize,
  type JobsSearchParams,
} from '../lib/jobs-list-query';

import { JobsListScreen, type JobsListBody } from './jobs-list-screen';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<JobsSearchParams>;
  /** Landing pages: filters fixed by the path (`/jobs/city/beograd`). */
  fixed?: { city?: string; category?: string };
  heading?: { title: string; intro: string };
  /** Rendered above the heading (breadcrumbs) and below the list (related links). */
  before?: ReactNode;
  after?: ReactNode;
};

/** Server entry: loads data, renders {@link JobsListScreen} (client UI + translations). */
export async function JobsListRoute({
  params,
  searchParams,
  fixed,
  heading,
  before,
  after,
}: Props) {
  const { locale } = await params;
  const sp = { ...(await searchParams), ...fixed };
  setRequestLocale(locale);

  const signedIn = await hasAnyAuthSession();
  // Guests get one page of GUEST_LIST_SIZE (the API caps it too).
  const pageSize = resolveListPageSize(sp, signedIn);

  /**
   * The requested page (`?page=N`, so crawlers can paginate through real
   * links); later pages load via client infinite scroll.
   */
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const qp = buildListQuery(sp, page, pageSize);
  const base = resolveNestPublicOrigin();

  const emptyTaxonomy: PublicJobTaxonomyResponse = {
    cities: [],
    cityGroups: [],
    categories: [],
  };

  let taxonomy: PublicJobTaxonomyResponse = emptyTaxonomy;
  let body: JobsListBody;

  if (!base) {
    body = { kind: 'no-api' };
  } else {
    const [result, taxonomyResult] = await Promise.all([
      fetchPublicJobsList(base, qp),
      fetchPublicJobTaxonomy(base),
    ]);

    taxonomy = taxonomyResult.ok ? taxonomyResult.data : emptyTaxonomy;

    if (!result.ok && result.status === 401) {
      body = { kind: 'guest-filters' };
    } else if (!result.ok && isPublicApiOutage(result)) {
      throw new PublicApiUnavailableError('jobs list', result);
    } else if (!result.ok) {
      body = {
        kind: 'error',
        message: result.error,
        missingApiUrl: result.error === 'missing_api_url',
        httpStatus: result.status,
      };
    } else {
      const { items } = result.data;
      if (items.length === 0) {
        body = { kind: 'empty' };
      } else {
        body = {
          kind: 'list',
          initialPage: result.data,
          listSignature: jobsListFilterSignature(sp, pageSize),
        };
      }
    }
  }

  return (
    <JobsListScreen
      formAction={`/${locale}/jobs`}
      pageSize={pageSize}
      defaults={{
        q: sp.q ?? '',
        city: sp.city ?? '',
        category: sp.category ?? '',
        job: sp.job ?? '',
        workModel: sp.workModel ?? '',
        employmentType: sp.employmentType ?? '',
        postedWithin: sp.postedWithin ?? '',
        easyApply: sp.easyApply === '1' || sp.easyApply === 'true',
      }}
      apiBasePresent={Boolean(base)}
      signedIn={signedIn}
      taxonomy={taxonomy}
      body={body}
      heading={heading}
      before={before}
      after={after}
    />
  );
}
