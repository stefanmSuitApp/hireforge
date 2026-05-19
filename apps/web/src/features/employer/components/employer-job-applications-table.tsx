'use client';

import type { EmployerJobApplicationItem } from 'contracts';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import {
  applicationPipelineStatusTone,
  TableStatusBadge,
} from '@/components/table-status-badge';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';

type Props = { items: EmployerJobApplicationItem[] };

export function EmployerJobApplicationsTable({ items }: Props) {
  const t = useTranslations('Employer.applications');
  const tStatus = useTranslations('Employer.applicationStatus');

  const columns = React.useMemo<DataTableColumn<EmployerJobApplicationItem>[]>(
    () => [
      {
        id: 'email',
        header: t('colEmail'),
        accessorKey: 'candidateEmail',
        cell: (row) => (
          <span className="font-mono text-xs text-foreground">
            {row.candidateEmail}
          </span>
        ),
      },
      {
        id: 'status',
        header: t('colStatus'),
        cell: (row) => (
          <TableStatusBadge
            label={tStatus(
              row.status as
                | 'submitted'
                | 'viewed'
                | 'shortlisted'
                | 'withdrawn'
                | 'reviewed'
                | 'rejected'
                | 'hired',
            )}
            tone={applicationPipelineStatusTone(row.status)}
          />
        ),
      },
      {
        id: 'resume',
        header: t('colResume'),
        cell: (row) => row.resumeOriginalFilename ?? '—',
      },
      {
        id: 'applied',
        header: t('colApplied'),
        accessorKey: 'createdAt',
        cell: (row) => (
          <span className="text-muted-foreground">
            <time dateTime={row.createdAt}>
              {new Date(row.createdAt).toLocaleString()}
            </time>
          </span>
        ),
      },
    ],
    [t, tStatus],
  );

  return (
    <DataTable
      data={items}
      columns={columns}
      emptyContent={t('empty')}
      getRowId={(row) => row.id}
      classNames={{
        root: 'border-0 rounded-none',
        table: 'min-w-[32rem]',
        cell: 'py-3 align-top',
      }}
    />
  );
}
