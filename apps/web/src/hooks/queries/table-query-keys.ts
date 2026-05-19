'use client';

import type { QueryClient } from '@tanstack/react-query';

export const tableQueryKeys = {
  staffCompanies: (query = 'limit=200&offset=0') =>
    ['tables', 'staff', 'companies', query] as const,
  staffEmployers: (query = 'limit=100&offset=0') =>
    ['tables', 'staff', 'employers', query] as const,
  adminUsers: (query = 'limit=100&offset=0') =>
    ['tables', 'admin', 'users', query] as const,
  adminAudit: (query = 'limit=100&offset=0') =>
    ['tables', 'admin', 'audit', query] as const,
  employerJobs: () => ['tables', 'employer', 'jobs'] as const,
  employerJob: (jobId: string) => ['tables', 'employer', 'job', jobId] as const,
  employerJobApplications: (jobId: string) =>
    ['tables', 'employer', 'applications', jobId] as const,
  candidateApplications: () => ['tables', 'candidate', 'applications'] as const,
};

/** Prefix for employer dashboard queries (jobs list, job detail, applications). */
export const employerTableQueryPrefix = ['tables', 'employer'] as const;

export function invalidateEmployerTableQueries(queryClient: QueryClient) {
  /** `all` refetches inactive queries too so the jobs list is warm before the user navigates back. */
  return queryClient.invalidateQueries({
    queryKey: employerTableQueryPrefix,
    refetchType: 'all',
  });
}
