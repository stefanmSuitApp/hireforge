'use client';

import type { StaffCompanyListItem } from 'contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, MoreHorizontal, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { postStaffCompanyPickup } from '@/api/staff-client';
import {
  staffSalesStatusTone,
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
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';
import { Link } from '@/i18n/navigation';

type Props = {
  items: StaffCompanyListItem[];
  locale: string;
};

export function ModeratorCompaniesTable({ items, locale }: Props) {
  const t = useTranslations('Moderator.companies');
  const tErrors = useTranslations('Errors');
  const qc = useQueryClient();
  const [pickupError, setPickupError] = React.useState<string | null>(null);

  const pickup = useMutation({
    mutationFn: (companyId: string) => postStaffCompanyPickup(companyId),
    onSuccess: async () => {
      setPickupError(null);
      await qc.invalidateQueries({
        queryKey: ['tables', 'staff', 'companies'],
      });
    },
    onError: (err) => {
      setPickupError(
        getTranslatedApiErrorMessage(err, tErrors as ErrorsTranslator),
      );
    },
  });

  const columns = React.useMemo<DataTableColumn<StaffCompanyListItem>[]>(
    () => [
      {
        id: 'legal',
        header: t('colLegal'),
        accessorKey: 'legalName',
      },
      {
        id: 'slug',
        header: t('colSlug'),
        accessorKey: 'slug',
        cell: (row) => (
          <span className="font-mono text-muted-foreground">{row.slug}</span>
        ),
      },
      {
        id: 'sales',
        header: t('colSalesStatus'),
        cell: (row) => {
          let label: string;
          switch (row.salesStatus) {
            case 'unassigned':
              label = t('salesStatus.unassigned');
              break;
            case 'pipeline':
              label = t('salesStatus.pipeline');
              break;
            case 'closed_won':
              label = t('salesStatus.closed_won');
              break;
            case 'closed_lost':
              label = t('salesStatus.closed_lost');
              break;
            default:
              label = row.salesStatus;
          }
          return (
            <TableStatusBadge
              label={label}
              tone={staffSalesStatusTone(row.salesStatus)}
            />
          );
        },
      },
      {
        id: 'source',
        header: t('colSource'),
        cell: (row) => <span className="text-xs font-mono">{row.source}</span>,
      },
      {
        id: 'owner',
        header: t('colOwner'),
        cell: (row) => (
          <span className="text-xs text-muted-foreground font-mono">
            {row.assignedModeratorEmail ?? row.assignedModeratorId ?? '—'}
          </span>
        ),
      },
      {
        id: 'verified',
        header: t('colVerified'),
        cell: (row) => (row.verified ? t('yes') : t('no')),
      },
      {
        id: 'actions',
        header: t('colActions'),
        cell: (row) => {
          const inPool =
            row.salesStatus === 'unassigned' ||
            row.salesStatus === 'closed_lost';
          return (
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
                {inPool ? (
                  <DropdownMenuItem
                    disabled={pickup.isPending}
                    onSelect={() => pickup.mutate(row.id)}
                  >
                    <UserRound className="size-3.5 text-muted-foreground" />
                    {pickup.isPending ? t('pickupPending') : t('pickup')}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem asChild>
                  <Link
                    href={`/moderator/companies/${row.id}`}
                    locale={locale}
                    className="flex items-center gap-2"
                  >
                    <ArrowUpRight className="size-3.5 text-muted-foreground" />
                    {t('open')}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [t, locale, pickup.isPending],
  );

  return (
    <>
      {pickupError ? (
        <p className="mb-2 text-sm text-destructive" role="alert">
          {pickupError}
        </p>
      ) : null}
      <DataTable
        data={items}
        columns={columns}
        emptyContent={t('empty')}
        getRowId={(row) => row.id}
        classNames={{ table: 'min-w-[48rem]' }}
      />
    </>
  );
}
