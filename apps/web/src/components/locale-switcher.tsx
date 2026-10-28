'use client';

import { Globe } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

import { Link, usePathname } from '../i18n/navigation';
import { routing } from '../i18n/routing';

export function LocaleSwitcher() {
  const t = useTranslations('Nav');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale() as (typeof routing.locales)[number];
  const query = Object.fromEntries(searchParams.entries());

  const otherLocale =
    locale === routing.locales[0] ? routing.locales[1] : routing.locales[0];
  const targetLabel = otherLocale === 'en' ? 'EN' : 'SR';
  const ariaLabel =
    otherLocale === 'en' ? t('switchToEnglish') : t('switchToSerbian');

  return (
    <Link
      href={{ pathname, query }}
      locale={otherLocale}
      hrefLang={otherLocale}
      className="flex min-h-11 items-center gap-1.5 rounded-full border border-border/60 bg-card/50 px-3 py-1.5 text-xs md:min-h-0 font-medium text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
    >
      <Globe className="size-3.5" aria-hidden />
      {/* Accessible name keeps the visible "EN"/"SR" (WCAG 2.5.3). */}
      <span className="sr-only">{ariaLabel}</span>
      <span aria-hidden>{targetLabel}</span>
    </Link>
  );
}
