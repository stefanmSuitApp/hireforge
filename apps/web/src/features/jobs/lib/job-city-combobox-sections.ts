import type {
  PublicJobTaxonomyDistrictGroup,
  PublicJobTaxonomyResponse,
} from 'contracts';

import type {
  ComboboxGroupSection,
  ComboboxOption,
} from '@/components/ui/combobox';

import { pickLocalizedBilingual } from './bilingual-label';
import { JOBS_FILTER_ANY_VALUE } from './jobs-filter-any-value';

export function jobTaxonomyCityGroups(
  taxonomy: PublicJobTaxonomyResponse,
): PublicJobTaxonomyDistrictGroup[] {
  const raw = taxonomy.cityGroups ?? [];
  if (raw.length > 0) {
    return raw;
  }
  return [{ district: null, cities: taxonomy.cities }];
}

export function buildJobCityComboboxSections(
  taxonomy: PublicJobTaxonomyResponse,
  locale: string,
  labels: { cityAny: string; districtOther: string },
): {
  leadingOptions: ComboboxOption[];
  groups: ComboboxGroupSection[];
} {
  const cityGroups = jobTaxonomyCityGroups(taxonomy);
  const leadingOptions: ComboboxOption[] = [
    {
      value: JOBS_FILTER_ANY_VALUE,
      label: labels.cityAny,
      keywords: [labels.cityAny],
    },
  ];
  const groups: ComboboxGroupSection[] = cityGroups.map((g) => {
    const districtLabel = g.district
      ? pickLocalizedBilingual(locale, g.district.nameSr, g.district.nameEn)
      : labels.districtOther;
    const districtKeywords = (
      g.district
        ? [g.district.slug, g.district.nameSr, g.district.nameEn ?? '']
        : [labels.districtOther]
    ).filter(Boolean);
    const options: ComboboxOption[] = g.cities.map((c) => {
      const label = pickLocalizedBilingual(locale, c.nameSr, c.nameEn);
      const cityKeywords = [c.slug, c.nameSr, c.nameEn ?? ''].filter(Boolean);
      return {
        value: c.slug,
        label,
        keywords: [...cityKeywords, ...districtKeywords],
      };
    });
    return { heading: districtLabel, options };
  });
  return { leadingOptions, groups };
}
