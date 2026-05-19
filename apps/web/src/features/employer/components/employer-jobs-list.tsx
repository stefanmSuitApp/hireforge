import { getLocale, getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { employerPackagesSubscriptionsHash } from '@/lib/employer-add-listing-href';

import { EmployerJobsListSection } from './employer-jobs-list-section';

type Props = { addListingHref: string };

export async function EmployerJobsList({ addListingHref }: Props) {
  const locale = await getLocale();
  const t = await getTranslations('Employer.jobList');

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('addListingHint')}{' '}
              <Link
                href={employerPackagesSubscriptionsHash}
                locale={locale}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {t('addListingPackagesLink')}
              </Link>
            </p>
          </div>
          <Button size="sm" className="shrink-0" asChild>
            <Link href={addListingHref} locale={locale}>
              {t('addListingCta')}
            </Link>
          </Button>
        </div>
      </section>
      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <EmployerJobsListSection />
      </section>
    </div>
  );
}
