'use client';

import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import type { PublicJobTaxonomyResponse } from 'contracts';

import {
  SearchCard,
  SearchField,
  searchFieldInputClass,
  searchFieldTriggerClass,
} from '@/components/search-card';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { SelectField, type SelectFieldOption } from '@/components/ui/select';
import { Link } from '@/i18n/navigation';

import { pickLocalizedBilingual } from '../lib/bilingual-label';
import { buildJobCityComboboxSections } from '../lib/job-city-combobox-sections';
import { JOBS_FILTER_ANY_VALUE } from '../lib/jobs-filter-any-value';

export type JobsFilterPreserve = {
  job: string;
  workModel: string;
  employmentType: string;
  postedWithin: string;
  easyApply: boolean;
};

export type JobsFilterFormProps = {
  action: string;
  pageSize: number;
  defaultQ: string;
  defaultCity: string;
  defaultCategory: string;
  taxonomy: PublicJobTaxonomyResponse;
  preserve: JobsFilterPreserve;
  discoveryVariant?: boolean;
};

export function JobsFilterForm({
  action,
  pageSize,
  defaultQ,
  defaultCity,
  defaultCategory,
  taxonomy,
  preserve,
}: JobsFilterFormProps) {
  const t = useTranslations('Jobs');
  const locale = useLocale();
  const [city, setCity] = React.useState(defaultCity);
  const [category, setCategory] = React.useState(defaultCategory);

  const hasFilters = Boolean(
    defaultQ.trim() ||
      defaultCity.trim() ||
      defaultCategory.trim() ||
      preserve.job.trim() ||
      preserve.workModel.trim() ||
      preserve.employmentType.trim() ||
      preserve.postedWithin.trim() ||
      preserve.easyApply,
  );

  const cityComboboxSections = React.useMemo(
    () =>
      buildJobCityComboboxSections(taxonomy, locale, {
        cityAny: t('cityAny'),
        districtOther: t('districtOther'),
      }),
    [taxonomy, locale, t],
  );

  const categoryOptions = React.useMemo((): SelectFieldOption[] => {
    const anyOption: SelectFieldOption = {
      value: JOBS_FILTER_ANY_VALUE,
      label: t('categoryAny'),
    };
    const rest = taxonomy.categories.map((c) => ({
      value: c.slug,
      label: pickLocalizedBilingual(locale, c.nameSr, c.nameEn),
    }));
    return [anyOption, ...rest];
  }, [locale, t, taxonomy.categories]);

  return (
    <form className="flex flex-col gap-4" method="get" action={action}>
      <input type="hidden" name="page" value="1" />
      {preserve.job.trim() ? (
        <input type="hidden" name="job" value={preserve.job.trim()} />
      ) : null}
      {preserve.workModel.trim() ? (
        <input
          type="hidden"
          name="workModel"
          value={preserve.workModel.trim()}
        />
      ) : null}
      {preserve.employmentType.trim() ? (
        <input
          type="hidden"
          name="employmentType"
          value={preserve.employmentType.trim()}
        />
      ) : null}
      {preserve.postedWithin.trim() ? (
        <input
          type="hidden"
          name="postedWithin"
          value={preserve.postedWithin.trim()}
        />
      ) : null}
      {preserve.easyApply ? (
        <input type="hidden" name="easyApply" value="1" />
      ) : null}

      <SearchCard>
        <SearchField
          label={t('searchLabel')}
          htmlFor="jobs-filter-q"
          basis="flex-[2_1_240px]"
        >
          <input
            id="jobs-filter-q"
            type="search"
            name="q"
            placeholder={t('searchPlaceholder')}
            defaultValue={defaultQ}
            autoComplete="off"
            maxLength={200}
            className={searchFieldInputClass}
          />
        </SearchField>

        <SearchField
          label={t('cityLabel')}
          htmlFor="jobs-filter-city"
          basis="flex-[1_1_170px]"
          divider
        >
          <input type="hidden" name="city" value={city} aria-hidden />
          <Combobox
            id="jobs-filter-city"
            leadingOptions={cityComboboxSections.leadingOptions}
            groups={cityComboboxSections.groups}
            value={city === '' ? JOBS_FILTER_ANY_VALUE : city}
            onValueChange={(v) => setCity(v === JOBS_FILTER_ANY_VALUE ? '' : v)}
            placeholder={t('cityAny')}
            searchPlaceholder={t('citySearchPlaceholder')}
            emptyText={t('cityEmpty')}
            className={searchFieldTriggerClass}
          />
        </SearchField>

        <SearchField
          label={t('categoryLabel')}
          htmlFor="jobs-filter-category"
          basis="flex-[1_1_170px]"
          divider
        >
          <input type="hidden" name="category" value={category} aria-hidden />
          <SelectField
            id="jobs-filter-category"
            options={categoryOptions}
            value={category === '' ? JOBS_FILTER_ANY_VALUE : category}
            onValueChange={(v) =>
              setCategory(v === JOBS_FILTER_ANY_VALUE ? '' : v)
            }
            placeholder={t('categoryAny')}
            classNames={{ trigger: searchFieldTriggerClass }}
          />
        </SearchField>

        {/* Phones: the button gets its own full-width row. */}
        <div className="flex w-full items-center gap-1 sm:w-auto sm:flex-none">
          <Button
            type="submit"
            size="lg"
            className="hf-press min-h-14 flex-1 rounded-[18px] px-7 text-base font-bold sm:flex-none"
          >
            {t('applySearch')}
          </Button>
          {hasFilters ? (
            <Button
              variant="ghost"
              className="min-h-11 rounded-full px-4 text-muted-foreground"
              asChild
            >
              <Link href="/jobs">{t('clearFilters')}</Link>
            </Button>
          ) : null}
        </div>
      </SearchCard>

      <input type="hidden" name="pageSize" value={String(pageSize)} />
    </form>
  );
}
