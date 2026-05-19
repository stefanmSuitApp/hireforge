'use client';

import { useTranslations } from 'next-intl';

import { TableErrorBoundary } from '@/components/query/table-error-boundary';
import { TableLoadingState } from '@/components/query/table-loading-state';
import {
  useStaffCompaniesQuery,
  useStaffEmployersQuery,
} from '@/hooks/queries';

import { ModeratorEmployersTable } from './moderator-employers-table';

export function ModeratorEmployersSection() {
  const t = useTranslations('Moderator.employers');
  const employers = useStaffEmployersQuery();
  const companies = useStaffCompaniesQuery();

  return (
    <TableErrorBoundary>
      {employers.isLoading || companies.isLoading ? (
        <TableLoadingState />
      ) : null}
      {employers.isError || companies.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {t('empty')}
        </p>
      ) : null}
      {employers.data && companies.data ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {t('total', { count: employers.data.total })}
          </p>
          <ModeratorEmployersTable
            employers={employers.data.items}
            companies={companies.data.items}
          />
        </>
      ) : null}
    </TableErrorBoundary>
  );
}
