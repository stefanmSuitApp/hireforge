'use client';

import { useTranslations } from 'next-intl';

import { TableErrorBoundary } from '@/components/query/table-error-boundary';
import { TableLoadingState } from '@/components/query/table-loading-state';
import { useAdminUsersQuery } from '@/hooks/queries';

import { AdminUsersTable } from './admin-users-table';

export function AdminUsersSection() {
  const t = useTranslations('Admin.users');
  const users = useAdminUsersQuery();

  return (
    <TableErrorBoundary>
      {users.isLoading ? <TableLoadingState /> : null}
      {users.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {t('empty')}
        </p>
      ) : null}
      {users.data ? (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {t('total', { count: users.data.total })}
          </p>
          <AdminUsersTable users={users.data.items} />
        </>
      ) : null}
    </TableErrorBoundary>
  );
}
