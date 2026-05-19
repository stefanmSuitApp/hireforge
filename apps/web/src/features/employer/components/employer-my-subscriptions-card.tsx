import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import type {
  EmployerJobPostingSlot,
  EmployerSubscriptionListItem,
} from 'contracts';

type Props = {
  locale: string;
  items: EmployerSubscriptionListItem[];
  jobPostingSlots: EmployerJobPostingSlot[];
};

function statusPillClass(status: EmployerSubscriptionListItem['status']) {
  switch (status) {
    case 'active':
      return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400';
    case 'pending_payment':
      return 'bg-amber-500/15 text-amber-900 dark:text-amber-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export async function EmployerMySubscriptionsCard({
  locale,
  items,
  jobPostingSlots,
}: Props) {
  const t = await getTranslations('Employer.packages.mySubscriptions');
  const tStatus = await getTranslations('Employer.packages.proforma.status');

  const anySlotsFull =
    jobPostingSlots.length > 0 &&
    jobPostingSlots.every((s) => s.publishSlotsFull);

  const dateLocale = locale === 'sr' ? 'sr-Latn-RS' : 'en-GB';
  const formatDate = (iso: string | null) => {
    if (!iso) {
      return '—';
    }
    return new Intl.DateTimeFormat(dateLocale, {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(new Date(iso));
  };

  return (
    <Card id="employer-subscriptions" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription className="text-base">{t('lead')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {anySlotsFull ? (
          <p
            className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-200"
            role="status"
          >
            {t('slotsFullBanner')}
          </p>
        ) : null}

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {items.map((row) => {
              const slot =
                row.status === 'active'
                  ? jobPostingSlots.find((s) => s.subscriptionId === row.id)
                  : undefined;
              const remaining =
                slot !== undefined
                  ? Math.max(0, slot.maxActiveJobs - slot.activePipelineCount)
                  : null;

              return (
                <li
                  key={row.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">
                        {row.packageNameSnapshot}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusPillClass(row.status)}`}
                      >
                        {tStatus(row.status)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('periodLabel', {
                        start: formatDate(row.startsAt),
                        end: formatDate(row.endsAt),
                      })}
                    </p>
                    {slot ? (
                      <div className="space-y-1">
                        <div
                          className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted"
                          role="img"
                          aria-label={t('slotMeterA11y', {
                            used: slot.activePipelineCount,
                            max: slot.maxActiveJobs,
                          })}
                        >
                          <div
                            className="h-full rounded-full bg-primary transition-[width]"
                            style={{
                              width: `${Math.min(100, (slot.activePipelineCount / slot.maxActiveJobs) * 100)}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t('slotMeter', {
                            used: slot.activePipelineCount,
                            max: slot.maxActiveJobs,
                          })}
                          {remaining !== null && remaining > 0
                            ? ` · ${t('slotsRemaining', { count: remaining })}`
                            : slot.publishSlotsFull
                              ? ` · ${t('slotsFullHint')}`
                              : null}
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                    {row.status === 'active' && slot ? (
                      slot.publishSlotsFull ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled
                          className="opacity-60"
                          title={t('slotsFullHint')}
                        >
                          {t('addListing')}
                        </Button>
                      ) : (
                        <Button size="sm" asChild>
                          <Link
                            href={`/employer/jobs/new?subscriptionId=${row.id}`}
                            locale={locale}
                          >
                            {t('addListing')}
                          </Link>
                        </Button>
                      )
                    ) : null}
                    {row.status === 'pending_payment' && row.proformaId ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={`/employer/billing/proforma/${row.proformaId}`}
                          locale={locale}
                        >
                          {t('openProforma')}
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
