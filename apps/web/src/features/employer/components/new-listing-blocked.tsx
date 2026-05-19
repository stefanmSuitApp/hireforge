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
import type { JobPostingEligibility } from 'contracts';

type Props = {
  locale: string;
  jobPosting: Exclude<JobPostingEligibility, { kind: 'eligible' }>;
};

export async function NewListingBlocked({ locale, jobPosting }: Props) {
  const t = await getTranslations('Employer.newListing');

  const packagesHref = '/employer/packages';
  const jobsHref = '/employer/jobs';

  let title: string;
  let description: string;
  let primary: { href: string; label: string };
  const secondary: { href: string; label: string } | null = {
    href: jobsHref,
    label: t('manageListings'),
  };

  if (jobPosting.kind === 'no_subscription') {
    title = t('noSubscriptionTitle');
    description = t('noSubscriptionBody');
    primary = { href: packagesHref, label: t('choosePackage') };
  } else {
    const pending = jobPosting;
    title = t('pendingPaymentTitle');
    description = t('pendingPaymentBody');
    if (pending.proformaId) {
      primary = {
        href: `/employer/billing/proforma/${pending.proformaId}`,
        label: t('completePayment'),
      };
    } else {
      primary = { href: packagesHref, label: t('viewPackages') };
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={primary.href} locale={locale}>
              {primary.label}
            </Link>
          </Button>
          {secondary ? (
            <Button variant="outline" asChild>
              <Link href={secondary.href} locale={locale}>
                {secondary.label}
              </Link>
            </Button>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          <Link
            href={packagesHref}
            locale={locale}
            className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
          >
            {t('viewPackagesAndStatus')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
