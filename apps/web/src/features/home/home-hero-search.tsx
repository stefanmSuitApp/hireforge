'use client';

import type { PublicJobTaxonomyResponse } from 'contracts';
import { MapPin, Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';

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
      className="mt-10 w-full max-w-3xl"
    >
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="pageSize" value="12" />
      <input type="hidden" name="city" value={city} />

      <div className="flex flex-col gap-2 rounded-3xl border border-input bg-background p-2 shadow-sm sm:flex-row sm:items-center sm:rounded-full">
        <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-full px-3 focus-within:ring-2 focus-within:ring-ring/40">
          <Search
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <span className="sr-only">{t('heroSearchKeywords')}</span>
          <input
            type="search"
            name="q"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t('heroSearchKeywordPlaceholder')}
            maxLength={200}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="flex min-h-11 min-w-0 items-center gap-2 rounded-full px-3 focus-within:ring-2 focus-within:ring-ring/40 sm:w-60 sm:border-l sm:border-border sm:rounded-none">
          <MapPin
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <label htmlFor="hero-city" className="sr-only">
            {t('heroSearchCity')}
          </label>
          <div className="min-w-0 flex-1">
            <Combobox
              id="hero-city"
              leadingOptions={citySections.leadingOptions}
              groups={citySections.groups}
              value={city === '' ? JOBS_FILTER_ANY_VALUE : city}
              onValueChange={(v) =>
                setCity(v === JOBS_FILTER_ANY_VALUE ? '' : v)
              }
              placeholder={t('heroSearchCityAny')}
              searchPlaceholder={tJobs('citySearchPlaceholder')}
              emptyText={tJobs('cityEmpty')}
              className="h-10 w-full border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        <Button type="submit" size="lg" className="min-h-11 rounded-full">
          {t('heroSearchSubmit')}
        </Button>
      </div>
    </form>
  );
}
