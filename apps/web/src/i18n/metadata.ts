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

export const SITE_NAME = 'Šljakam';

/** Index, or `noindex,follow` (links still crawled). */
export const NOINDEX: NonNullable<Metadata['robots']> = {
  index: false,
  follow: true,
};

/**
 * Metadata for a public page: title, description, self canonical + hreflang
 * (relative; `metadataBase` in the locale layout makes them absolute), and
 * Open Graph / Twitter. Next replaces (not merges) `openGraph` per page, so
 * the site-wide fields are repeated here.
 */
export function buildPublicPageMetadata({
  locale,
  path,
  title,
  description,
  noindex = false,
  canonicalPath,
}: {
  locale: string;
  /** Path after the locale, e.g. `/jobs` (`/` for the locale root). */
  path: string;
  title: string;
  description: string;
  noindex?: boolean;
  /** Canonicalize to another path (e.g. a filter URL to its landing page). */
  canonicalPath?: string;
}): Metadata {
  const alternates = buildLocaleAlternates(locale, canonicalPath ?? path);
  const canonical = `/${locale}${normalizePath(canonicalPath ?? path)}`;
  return {
    title,
    description,
    alternates,
    ...(noindex ? { robots: NOINDEX } : {}),
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: locale === 'sr' ? 'sr_RS' : 'en_US',
      title,
      description,
      url: canonical,
    },
    twitter: { card: 'summary', title, description },
  };
}
