'use client';

import { useTranslations } from 'next-intl';

import { TableErrorBoundary } from '@/components/query/table-error-boundary';
import { TableLoadingState } from '@/components/query/table-loading-state';
import { useEmployerJobsQuery } from '@/hooks/queries';

import { EmployerJobsListTable } from './employer-jobs-list-table';

export function EmployerJobsListSection() {
  const t = useTranslations('Employer.jobList');
  const jobs = useEmployerJobsQuery();

  return (
    <TableErrorBoundary>
      {jobs.isLoading ? <TableLoadingState /> : null}
      {jobs.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {t('empty')}
        </p>
      ) : null}
      {jobs.data?.length ? <EmployerJobsListTable items={jobs.data} /> : null}
      {jobs.data && jobs.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : null}
    </TableErrorBoundary>
  );
}
