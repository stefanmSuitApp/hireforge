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
import type { EmployerJobPostingSlot } from 'contracts';

type Props = {
  locale: string;
  slots: EmployerJobPostingSlot[];
  /** Defaults to employer composer URL */
  newJobHref?: (subscriptionId: string) => string;
  backHref?: string;
  backLabel?: string;
};

export async function NewListingPickSubscription({
  locale,
  slots,
  newJobHref = (subscriptionId) =>
    `/employer/jobs/new?subscriptionId=${subscriptionId}`,
  backHref = '/employer/packages#employer-subscriptions',
  backLabel: backLabelProp,
}: Props) {
  const t = await getTranslations('Employer.newListing');
  const tSlots = await getTranslations('Employer.packages.mySubscriptions');
  const backLabel = backLabelProp ?? t('backToPackages');

  return (
    <Card className="mx-auto mt-8 max-w-lg">
      <CardHeader>
        <CardTitle>{t('pickSubscriptionTitle')}</CardTitle>
        <CardDescription>{t('pickSubscriptionBody')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {slots.map((s) =>
          s.publishSlotsFull ? (
            <div
              key={s.subscriptionId}
              className="flex h-auto cursor-not-allowed flex-col items-stretch justify-start rounded-md border border-border bg-muted/40 px-4 py-3 text-left opacity-70"
              role="group"
              aria-disabled="true"
              title={tSlots('slotsFullHint')}
            >
              <span className="flex flex-col items-start gap-0.5 text-left">
                <span className="font-medium text-foreground">
                  {s.packageNameSnapshot}
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {t('slotMeterShort', {
                    used: s.activePipelineCount,
                    max: s.maxActiveJobs,
                  })}
                </span>
              </span>
            </div>
          ) : (
            <Button
              key={s.subscriptionId}
              variant="outline"
              className="h-auto justify-start py-3"
              asChild
            >
              <Link href={newJobHref(s.subscriptionId)} locale={locale}>
                <span className="flex flex-col items-start gap-0.5 text-left">
                  <span className="font-medium text-foreground">
                    {s.packageNameSnapshot}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {t('slotMeterShort', {
                      used: s.activePipelineCount,
                      max: s.maxActiveJobs,
                    })}
                  </span>
                </span>
              </Link>
            </Button>
          ),
        )}
        <Button variant="ghost" size="sm" className="self-start" asChild>
          <Link href={backHref} locale={locale}>
            {backLabel}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
