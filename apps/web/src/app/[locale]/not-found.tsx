import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default async function LocaleNotFound() {
  const t = await getTranslations('NotFound');
  return (
    <main className="mx-auto flex max-w-xl flex-col items-start px-4 py-20 md:py-28">
      <p className="m-0 text-sm font-semibold text-primary">404</p>
      <h1 className="m-0 mt-2 text-h1 text-foreground">{t('title')}</h1>
      <p className="m-0 mt-3 text-base text-muted-foreground">{t('body')}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button size="lg" asChild>
          <Link href="/jobs">{t('browseJobs')}</Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/">{t('goHome')}</Link>
        </Button>
      </div>
    </main>
  );
}
