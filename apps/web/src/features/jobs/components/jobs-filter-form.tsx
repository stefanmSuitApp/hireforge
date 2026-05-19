'use client';

import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import type { PublicJobTaxonomyResponse } from 'contracts';

import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectField, type SelectFieldOption } from '@/components/ui/select';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

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
    <form
      className="flex flex-col gap-4"
      method="get"
      action={action}
    >
      <input type="hidden" name="page" value="1" />
      {preserve.job.trim() ? (
        <input type="hidden" name="job" value={preserve.job.trim()} />
      ) : null}
      {preserve.workModel.trim() ? (
        <input type="hidden" name="workModel" value={preserve.workModel.trim()} />
      ) : null}
      {preserve.employmentType.trim() ? (
        <input type="hidden" name="employmentType" value={preserve.employmentType.trim()} />
      ) : null}
      {preserve.postedWithin.trim() ? (
        <input type="hidden" name="postedWithin" value={preserve.postedWithin.trim()} />
      ) : null}
      {preserve.easyApply ? (
        <input type="hidden" name="easyApply" value="1" />
      ) : null}

      {/* Inline pill filter bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/80 p-4 backdrop-blur-sm sm:flex-row sm:items-end sm:gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor="jobs-filter-q" className="text-xs font-semibold text-muted-foreground">
            {t('searchLabel')}
          </Label>
          <Input
            id="jobs-filter-q"
            type="search"
            name="q"
            placeholder={t('searchPlaceholder')}
            defaultValue={defaultQ}
            autoComplete="off"
            maxLength={200}
            className="h-10 rounded-full border-input bg-background px-4"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor="jobs-filter-city" className="text-xs font-semibold text-muted-foreground">
            {t('cityLabel')}
          </Label>
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
            className="h-10 rounded-full border-input bg-background px-4"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor="jobs-filter-category" className="text-xs font-semibold text-muted-foreground">
            {t('categoryLabel')}
          </Label>
          <input type="hidden" name="category" value={category} aria-hidden />
          <SelectField
            id="jobs-filter-category"
            options={categoryOptions}
            value={category === '' ? JOBS_FILTER_ANY_VALUE : category}
            onValueChange={(v) => setCategory(v === JOBS_FILTER_ANY_VALUE ? '' : v)}
            placeholder={t('categoryAny')}
            classNames={{
              trigger: cn('w-full h-10 rounded-full border-input bg-background px-4 font-normal'),
            }}
          />
        </div>

        <div className="flex shrink-0 items-end gap-3">
          <Button type="submit" className="h-10 rounded-full px-6">
            {t('applySearch')}
          </Button>
          {hasFilters ? (
            <Button variant="ghost" className="h-10 rounded-full px-4 text-muted-foreground" asChild>
              <Link href="/jobs">{t('clearFilters')}</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <input type="hidden" name="pageSize" value={String(pageSize)} />
    </form>
  );
}
