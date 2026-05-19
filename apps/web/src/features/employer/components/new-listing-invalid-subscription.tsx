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

type Props = { locale: string };

export async function NewListingInvalidSubscription({ locale }: Props) {
  const t = await getTranslations('Employer.newListing');

  return (
    <Card className="mx-auto mt-8 max-w-lg">
      <CardHeader>
        <CardTitle>{t('invalidSubscriptionTitle')}</CardTitle>
        <CardDescription>{t('invalidSubscriptionBody')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link
            href="/employer/packages#employer-subscriptions"
            locale={locale}
          >
            {t('viewPackages')}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
