import { setRequestLocale } from 'next-intl/server';

import type { PublicJobTaxonomyResponse } from 'contracts';

import { resolveNestPublicOrigin } from '@/lib/nest-api-url';
import { fetchPublicJobTaxonomy, fetchPublicJobsList } from '@/lib/public-jobs';

import {
  buildListQuery,
  jobsListFilterSignature,
  JOBS_LIST_PAGE_SIZE,
  type JobsSearchParams,
} from '../lib/jobs-list-query';

import { JobsListScreen, type JobsListBody } from './jobs-list-screen';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<JobsSearchParams>;
};

/** Server entry: loads data, renders {@link JobsListScreen} (client UI + translations). */
export async function JobsListRoute({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const pageSize = Math.min(
    50,
    Math.max(
      1,
      parseInt(sp.pageSize ?? String(JOBS_LIST_PAGE_SIZE), 10) ||
        JOBS_LIST_PAGE_SIZE,
    ),
  );

  /** First page only; further pages load via client infinite scroll. */
  const qp = buildListQuery(sp, 1, pageSize);
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

    if (!result.ok) {
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
      taxonomy={taxonomy}
      body={body}
    />
  );
}
