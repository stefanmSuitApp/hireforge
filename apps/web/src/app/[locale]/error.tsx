'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

/** A page failed to render (e.g. the API is down): keep the site around it. */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('ErrorPage');
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="mx-auto flex max-w-xl flex-col items-start px-4 py-20 md:py-28">
      <h1 className="m-0 text-h1 text-foreground">{t('title')}</h1>
      <p className="m-0 mt-3 text-base text-muted-foreground">{t('body')}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button size="lg" onClick={() => reset()}>
          {t('retry')}
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/">{t('goHome')}</Link>
        </Button>
      </div>
    </main>
  );
}
