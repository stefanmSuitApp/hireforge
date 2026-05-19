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

export function localizedCityLine(
  locale: string,
  city: {
    nameSr: string;
    nameEn: string | null;
    postalCode: string | null;
  } | null,
): string | null {
  if (!city) return null;
  const name = pickLocalizedBilingual(locale, city.nameSr, city.nameEn);
  return city.postalCode ? `${name} (${city.postalCode})` : name;
}

export function localizedCategoryLine(
  locale: string,
  category: { nameSr: string; nameEn: string | null } | null,
): string | null {
  if (!category) return null;
  return pickLocalizedBilingual(locale, category.nameSr, category.nameEn);
}

/** City / category row from taxonomy API (optional postal). */
export function localizedTaxonomyItemLine(
  locale: string,
  item: PublicJobTaxonomyItem,
): string {
  const base = pickLocalizedBilingual(locale, item.nameSr, item.nameEn);
  return item.postalCode ? `${base} (${item.postalCode})` : base;
}
