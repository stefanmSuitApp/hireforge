import type { Metadata } from 'next';

import {
  buildJobsLandingMetadata,
  JobsLandingRoute,
} from '@/features/jobs/components/jobs-landing-route';
import type { JobsSearchParams } from '@/features/jobs/lib/jobs-list-query';
import { requireSessionUnlessPublicJobs } from '@/lib/public-jobs-gate';

type Props = {
  params: Promise<{ locale: string; city: string }>;
  searchParams: Promise<JobsSearchParams>;
};

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { city } = await params;
  return buildJobsLandingMetadata(params, { city }, searchParams);
}

export default async function JobsCityPage({ params, searchParams }: Props) {
  const { locale, city } = await params;
  await requireSessionUnlessPublicJobs(locale, `/jobs/city/${city}`);
  return (
    <JobsLandingRoute
      params={params}
      searchParams={searchParams}
      landing={{ city }}
    />
  );
}
