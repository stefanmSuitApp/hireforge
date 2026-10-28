import { buildLocalizedPath, type AppLocale } from '@/i18n/localized-path';

/**
 * After sign-in, sign-up or sign-out, load the next page in full. The header
 * sits in the shared locale layout, which client-side navigation keeps as it
 * was rendered with the old session; `router.refresh()` right after
 * `router.replace()` races the navigation and only sometimes wins.
 */
export function navigateWithFreshSession(
  locale: AppLocale,
  path: string,
): void {
  window.location.assign(buildLocalizedPath(locale, path));
}
