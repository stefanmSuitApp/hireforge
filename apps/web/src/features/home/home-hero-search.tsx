'use client';

import type { PublicJobTaxonomyResponse } from 'contracts';
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
      className="mt-8 w-full max-w-3xl"
    >
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="pageSize" value="12" />
      <input type="hidden" name="city" value={city} />

      {/* Redesign A, as in the concept: one white card that wraps. The two
          fields share the first row (thin divider between them); the button
          drops below on its own when the row is too narrow for all three. */}
      <div className="flex flex-wrap gap-2 rounded-[24px] border border-border bg-card p-2.5 shadow-[0_24px_60px_-30px_oklch(0.34_0.06_182_/_0.45)]">
        <label className="flex min-w-0 flex-[1_1_300px] flex-col justify-center rounded-2xl px-3.5 py-2 focus-within:bg-muted/60">
          <span className="text-xs font-semibold text-muted-foreground">
            {t('heroSearchKeywords')}
          </span>
          <input
            type="search"
            name="q"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t('heroSearchKeywordPlaceholder')}
            maxLength={200}
            autoComplete="off"
            className="min-w-0 bg-transparent py-1 text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="flex min-w-0 flex-[1_1_160px] flex-col justify-center border-t border-border sm:border-l sm:border-t-0 px-3.5 py-2 focus-within:bg-muted/60">
          <label
            htmlFor="hero-city"
            className="text-xs font-semibold text-muted-foreground"
          >
            {t('heroSearchCity')}
          </label>
          <Combobox
            id="hero-city"
            leadingOptions={citySections.leadingOptions}
            groups={citySections.groups}
            value={city === '' ? JOBS_FILTER_ANY_VALUE : city}
            onValueChange={(v) => setCity(v === JOBS_FILTER_ANY_VALUE ? '' : v)}
            placeholder={t('heroSearchCityAny')}
            searchPlaceholder={tJobs('citySearchPlaceholder')}
            emptyText={tJobs('cityEmpty')}
            className="h-8 w-full border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="hf-press min-h-14 flex-none rounded-[18px] px-7 text-base font-bold"
        >
          {t('heroSearchSubmit')}
        </Button>
      </div>
    </form>
  );
}
