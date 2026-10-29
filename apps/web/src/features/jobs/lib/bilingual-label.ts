import type { PublicJobTaxonomyItem } from 'contracts';

import { routing } from '@/i18n/routing';

type AppLocale = (typeof routing.locales)[number];

/** Pick Serbian or English field from API payloads (single branching point). */
export function pickLocalizedBilingual(
  locale: string,
  nameSr: string,
  nameEn: string | null | undefined,
): string {
  const loc = locale as AppLocale;
  if (loc === 'en' && nameEn) return nameEn;
  return nameSr;
}

/** City name for cards and job pages; the postal code is noise there. */
export function localizedCityLine(
  locale: string,
  city: { nameSr: string; nameEn: string | null } | null,
): string | null {
  if (!city) return null;
  return pickLocalizedBilingual(locale, city.nameSr, city.nameEn);
}

export function localizedCategoryLine(
  locale: string,
  category: { nameSr: string; nameEn: string | null } | null,
): string | null {
  if (!category) return null;
  return pickLocalizedBilingual(locale, category.nameSr, category.nameEn);
}

/** City / category option in pickers: the postal code tells same-name places apart. */
export function localizedTaxonomyItemLine(
  locale: string,
  item: PublicJobTaxonomyItem,
): string {
  const base = pickLocalizedBilingual(locale, item.nameSr, item.nameEn);
  return item.postalCode ? `${base} (${item.postalCode})` : base;
}
