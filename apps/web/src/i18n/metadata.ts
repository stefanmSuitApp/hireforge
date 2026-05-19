import type { Metadata } from 'next';

import { routing } from './routing';

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '';
  }

  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

export function buildLocaleAlternates(
  locale: string,
  pathname: string,
): Metadata['alternates'] {
  const path = normalizePath(pathname);

  const languages: Record<string, string> = Object.fromEntries(
    routing.locales.map((supportedLocale) => [
      supportedLocale,
      `/${supportedLocale}${path}`,
    ]),
  );
  languages['x-default'] = `/${routing.defaultLocale}${path}`;

  return {
    canonical: `/${locale}${path}`,
    languages,
  };
}
