'use client';

import type { EmployerJobListItem } from 'contracts';
import { ArrowUpRight, Eye, MoreHorizontal, Pencil, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import {
  jobListingStatusTone,
  TableStatusBadge,
} from '@/components/table-status-badge';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from '@/i18n/navigation';
import { publicJobUrlSegment } from '@/lib/job-public-segment';

type Props = { items: EmployerJobListItem[] };

export function EmployerJobsListTable({ items }: Props) {
  const locale = useLocale();
  const t = useTranslations('Employer.jobList');
  const tStatus = useTranslations('Employer.jobStatus');

  const columns = React.useMemo<DataTableColumn<EmployerJobListItem>[]>(
    () => [
      {
        id: 'title',
        header: t('colTitle'),
        accessorKey: 'title',
        cell: (row) => (
          <span className="font-medium text-foreground">{row.title}</span>
        ),
      },
      {
        id: 'status',
        header: t('colStatus'),
        cell: (row) => (
          <TableStatusBadge
            label={tStatus(row.status)}
            tone={jobListingStatusTone(row.status)}
          />
        ),
      },
      {
        id: 'updated',
        header: t('colUpdated'),
        accessorKey: 'updatedAt',
        cell: (row) => (
          <span className="text-muted-foreground">
            <time dateTime={row.updatedAt}>
              {new Date(row.updatedAt).toLocaleString()}
            </time>
          </span>
        ),
      },
      {
        id: 'actions',
        header: t('colActions'),
        cell: (row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 [&_svg]:size-3.5"
                aria-label={t('colActions')}
              >
                <MoreHorizontal />
                <span className="sr-only">{t('colActions')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link
                  href={`/employer/jobs/${row.id}/edit`}
                  locale={locale}
                  className="flex items-center gap-2"
                >
                  {row.status === 'draft' ? (
                    <Pencil className="size-3.5 text-muted-foreground" />
                  ) : (
                    <Eye className="size-3.5 text-muted-foreground" />
                  )}
                  {row.status === 'draft' ? t('actionEdit') : t('actionView')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/employer/jobs/${row.id}/applications`}
                  locale={locale}
                  className="flex items-center gap-2"
                >
                  <Users className="size-3.5 text-muted-foreground" />
                  {t('actionApplications')}
                </Link>
              </DropdownMenuItem>
              {row.status === 'published' ? (
                <DropdownMenuItem asChild>
                  <Link
                    href={`/jobs/${publicJobUrlSegment(row)}`}
                    locale={locale}
                    className="flex items-center gap-2"
                  >
                    <ArrowUpRight className="size-3.5 text-muted-foreground" />
                    {t('actionPublic')}
                  </Link>
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [t, tStatus, locale],
  );

  return (
    <DataTable
      data={items}
      columns={columns}
      emptyContent={t('empty')}
      getRowId={(row) => row.id}
      classNames={{
        root: 'border-0 rounded-none',
        table: 'min-w-[36rem]',
        cell: 'py-3 align-top',
      }}
    />
  );
}
