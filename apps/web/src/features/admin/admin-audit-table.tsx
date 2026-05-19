'use client';

import type { AdminAuditListItem } from 'contracts';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { DataTable, type DataTableColumn } from '@/components/ui/data-table';

type Props = { items: AdminAuditListItem[] };

export function AdminAuditTable({ items }: Props) {
  const t = useTranslations('Admin.audit');

  const columns = React.useMemo<DataTableColumn<AdminAuditListItem>[]>(
    () => [
      {
        id: 'when',
        header: t('colWhen'),
        accessorKey: 'createdAt',
        cell: (row) => (
          <span className="text-muted-foreground">{row.createdAt}</span>
        ),
      },
      {
        id: 'actor',
        header: t('colActor'),
        accessorKey: 'actorEmail',
        cell: (row) => {
          const meta = row.metadata as { actor?: string } | null | undefined;
          const label =
            row.actorEmail ??
            (typeof meta?.actor === 'string' ? meta.actor : null) ??
            t('systemActor');
          return <span className="font-mono">{label}</span>;
        },
      },
      {
        id: 'action',
        header: t('colAction'),
        accessorKey: 'action',
      },
      {
        id: 'entity',
        header: t('colEntity'),
        cell: (row) => (
          <>
            <span className="text-muted-foreground">{row.entityType}</span>{' '}
            <span className="font-mono">{row.entityId}</span>
          </>
        ),
      },
    ],
    [t],
  );

  return (
    <DataTable
      data={items}
      columns={columns}
      emptyContent={t('empty')}
      getRowId={(row) => row.id}
      classNames={{
        table: 'min-w-[48rem]',
        head: 'text-xs',
        cell: 'align-top text-xs',
        emptyCell: 'text-xs',
      }}
    />
  );
}
