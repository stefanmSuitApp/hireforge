'use client';

import { useTranslations } from 'next-intl';

import { TableErrorBoundary } from '@/components/query/table-error-boundary';
import { TableLoadingState } from '@/components/query/table-loading-state';
import { useAdminAuditQuery } from '@/hooks/queries';

import { AdminAuditTable } from './admin-audit-table';

export function AdminAuditSection() {
  const t = useTranslations('Admin.audit');
  const audit = useAdminAuditQuery();

  return (
    <TableErrorBoundary>
      {audit.isLoading ? <TableLoadingState className="mt-6" /> : null}
      {audit.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {t('empty')}
        </p>
      ) : null}
      {audit.data ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {t('total', { count: audit.data.total })}
          </p>
          <AdminAuditTable items={audit.data.items} />
        </>
      ) : null}
    </TableErrorBoundary>
  );
}
