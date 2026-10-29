'use client';

import type { EmployerJobApplicationItem } from 'contracts';
import { useFormatter, useTranslations } from 'next-intl';
import * as React from 'react';

import {
  applicationPipelineStatusTone,
  TableStatusBadge,
} from '@/components/table-status-badge';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';

type Props = { items: EmployerJobApplicationItem[] };

export function EmployerJobApplicationsTable({ items }: Props) {
  const t = useTranslations('Employer.applications');
  const format = useFormatter();
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
        id: 'coverLetter',
        header: t('colCoverLetter'),
        // Up to 1500 characters: collapsed so the table stays scannable.
        cell: (row) =>
          row.coverLetterText ? (
            <details className="max-w-md">
              <summary className="cursor-pointer text-primary underline-offset-2 hover:underline">
                {t('readCoverLetter')}
              </summary>
              <p className="mt-2 whitespace-pre-line text-foreground">
                {row.coverLetterText}
              </p>
            </details>
          ) : (
            '—'
          ),
      },
      {
        id: 'applied',
        header: t('colApplied'),
        accessorKey: 'createdAt',
        cell: (row) => (
          <span className="text-muted-foreground">
            <time dateTime={row.createdAt}>
              {format.dateTime(new Date(row.createdAt), {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
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
