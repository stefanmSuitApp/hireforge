import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['sr', 'en'],
  defaultLocale: 'sr',
  /** Every URL includes a locale; `/` redirects to `/{defaultLocale}` (e.g. `/sr`). */
  localePrefix: 'always',
});
