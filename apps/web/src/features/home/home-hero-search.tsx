'use client';

import type { PublicJobTaxonomyResponse } from 'contracts';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import {
  SearchCard,
  SearchField,
  searchFieldInputClass,
  searchFieldTriggerClass,
} from '@/components/search-card';

import { buildJobCityComboboxSections } from '@/features/jobs/lib/job-city-combobox-sections';
import { JOBS_FILTER_ANY_VALUE } from '@/features/jobs/lib/jobs-filter-any-value';

type Props = {
  action: string;
  taxonomy: PublicJobTaxonomyResponse;
  isAuthenticated: boolean;
};

/**
 * What + where, both visible (side by side, stacked on phones): the one
 * search people expect on a job board. Categories live in the tiles below.
 */
export function HomeHeroSearch({ action, taxonomy, isAuthenticated }: Props) {
  const t = useTranslations('Home');
  const tJobs = useTranslations('Jobs');
  const locale = useLocale();
  const router = useRouter();
  const [city, setCity] = React.useState('');
  const [keyword, setKeyword] = React.useState('');

  const citySections = React.useMemo(
    () =>
      buildJobCityComboboxSections(taxonomy, locale, {
        cityAny: tJobs('cityAny'),
        districtOther: tJobs('districtOther'),
      }),
    [taxonomy, locale, tJobs],
  );

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    if (!isAuthenticated) {
      e.preventDefault();
      const returnTo = encodeURIComponent(`/${locale}/jobs`);
      router.push(`/${locale}/sign-in?returnTo=${returnTo}`);
    }
  }

  return (
    <form
      method="get"
      action={action}
      onSubmit={handleSubmit}
      className="mt-8 w-full max-w-3xl"
    >
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="pageSize" value="12" />
      <input type="hidden" name="city" value={city} />

      <SearchCard>
        <SearchField
          label={t('heroSearchKeywords')}
          htmlFor="hero-q"
          basis="flex-[1_1_300px]"
        >
          <input
            id="hero-q"
            type="search"
            name="q"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t('heroSearchKeywordPlaceholder')}
            maxLength={200}
            autoComplete="off"
            className={searchFieldInputClass}
          />
        </SearchField>
        <SearchField
          label={t('heroSearchCity')}
          htmlFor="hero-city"
          basis="flex-[1_1_160px]"
          divider
        >
          <Combobox
            id="hero-city"
            leadingOptions={citySections.leadingOptions}
            groups={citySections.groups}
            value={city === '' ? JOBS_FILTER_ANY_VALUE : city}
            onValueChange={(v) => setCity(v === JOBS_FILTER_ANY_VALUE ? '' : v)}
            placeholder={t('heroSearchCityAny')}
            searchPlaceholder={tJobs('citySearchPlaceholder')}
            emptyText={tJobs('cityEmpty')}
            className={searchFieldTriggerClass}
          />
        </SearchField>
        <Button
          type="submit"
          size="lg"
          className="hf-press min-h-14 flex-none rounded-[18px] px-7 text-base font-bold"
        >
          {t('heroSearchSubmit')}
        </Button>
      </SearchCard>
    </form>
  );
}
