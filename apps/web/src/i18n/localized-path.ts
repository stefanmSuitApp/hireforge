import { routing } from './routing';

export type AppLocale = (typeof routing.locales)[number];

export function stripLocalePrefix(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/';
  }

  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;

  for (const locale of routing.locales) {
    if (normalized === `/${locale}`) {
      return '/';
    }
    if (normalized.startsWith(`/${locale}/`)) {
      return normalized.slice(locale.length + 1) || '/';
    }
  }

  return normalized;
}

export function buildLocalizedPath(
  locale: AppLocale,
  pathname: string,
  search?: string,
): string {
  const basePath = stripLocalePrefix(pathname);
  const suffix =
    search && search !== '?'
      ? search.startsWith('?')
        ? search
        : `?${search}`
      : '';

  return basePath === '/'
    ? `/${locale}${suffix}`
    : `/${locale}${basePath}${suffix}`;
}
