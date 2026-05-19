'use client';

import type { PendingSubscriptionQueueItem } from 'contracts';
import { Check, MoreHorizontal } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import {
  Button,
  DataTable,
  type DataTableColumn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui';
import { useRouter } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/localized-path';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';
import { webHttp } from '@/lib/http/web-axios';

type Props = {
  initialItems: PendingSubscriptionQueueItem[];
};

function formatMinor(
  amountMinor: number,
  currency: string,
  locale: AppLocale,
): string {
  const tag = locale === 'sr' ? 'sr-Latn-RS' : 'en-GB';
  try {
    return new Intl.NumberFormat(tag, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currency}`;
  }
}

export function AdminEnterprisePendingPanel({ initialItems }: Props) {
  const t = useTranslations('Admin.billingEnterprise');
  const tErrors = useTranslations('Errors');
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const [items, setItems] =
    React.useState<PendingSubscriptionQueueItem[]>(initialItems);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const columns = React.useMemo<
    DataTableColumn<PendingSubscriptionQueueItem>[]
  >(
    () => [
      {
        id: 'company',
        header: t('colCompany'),
        accessorKey: 'companyLegalName',
        cell: (row) => (
          <span className="font-medium text-foreground">
            {row.companyLegalName}
          </span>
        ),
      },
      {
        id: 'package',
        header: t('colPackage'),
        accessorKey: 'packageNameSnapshot',
        cell: (row) => (
          <span className="text-muted-foreground">
            {row.packageNameSnapshot}
          </span>
        ),
      },
      {
        id: 'proforma',
        header: t('colProforma'),
        cell: (row) =>
          row.proformaNumber ? (
            <span className="font-mono text-sm">{row.proformaNumber}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'amount',
        header: t('colAmount'),
        cell: (row) => (
          <span className="tabular-nums">
            {row.proformaTotalMinor != null
              ? formatMinor(row.proformaTotalMinor, row.currency, locale)
              : formatMinor(row.priceMinor, row.currency, locale)}
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
                disabled={busyId !== null}
              >
                <MoreHorizontal />
                <span className="sr-only">{t('colActions')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => void activate(row)}>
                <Check className="size-3.5 text-muted-foreground" />
                {busyId === row.subscriptionId ? t('activating') : t('activate')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [t, locale, busyId],
  );

  async function activate(row: PendingSubscriptionQueueItem) {
    setBusyId(row.subscriptionId);
    setError(null);
    try {
      await webHttp.post(
        `/api/admin/subscriptions/${row.subscriptionId}/activate`,
      );
      setItems((prev) =>
        prev.filter((x) => x.subscriptionId !== row.subscriptionId),
      );
      router.refresh();
    } catch (e) {
      setError(getTranslatedApiErrorMessage(e, tErrors as ErrorsTranslator));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <DataTable
          columns={columns}
          data={items}
          getRowId={(r) => r.subscriptionId}
        />
      )}
    </div>
  );
}
