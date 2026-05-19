'use client';

import { useTranslations } from 'next-intl';

import { TableErrorBoundary } from '@/components/query/table-error-boundary';
import { TableLoadingState } from '@/components/query/table-loading-state';
import {
  useEmployerJobApplicationsQuery,
  useEmployerJobQuery,
} from '@/hooks/queries';

import { EmployerJobApplicationsTable } from './employer-job-applications-table';

type Props = { jobId: string };

export function EmployerJobApplicationsSection({ jobId }: Props) {
  const t = useTranslations('Employer.applications');
  const job = useEmployerJobQuery(jobId);
  const apps = useEmployerJobApplicationsQuery(jobId);

  return (
    <TableErrorBoundary>
      {job.isLoading || apps.isLoading ? <TableLoadingState /> : null}
      {job.isError || apps.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {t('empty')}
        </p>
      ) : null}
      {job.data && apps.data ? (
        <>
          <p className="mb-3 text-sm text-muted-foreground">{job.data.title}</p>
          {apps.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('empty')}</p>
          ) : (
            <EmployerJobApplicationsTable items={apps.data} />
          )}
        </>
      ) : null}
    </TableErrorBoundary>
  );
}
