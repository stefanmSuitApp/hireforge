'use client';

import type { PublicJobTaxonomyResponse } from 'contracts';
import { Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { SelectField, type SelectFieldOption } from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { pickLocalizedBilingual } from '@/features/jobs/lib/bilingual-label';
import { buildJobCityComboboxSections } from '@/features/jobs/lib/job-city-combobox-sections';
import { JOBS_FILTER_ANY_VALUE } from '@/features/jobs/lib/jobs-filter-any-value';

type Props = {
  action: string;
  taxonomy: PublicJobTaxonomyResponse;
  isAuthenticated: boolean;
};

type Tab = 'keyword' | 'city' | 'category';

export function HomeHeroSearch({ action, taxonomy, isAuthenticated }: Props) {
  const t = useTranslations('Home');
  const tJobs = useTranslations('Jobs');
  const locale = useLocale();
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<Tab>('keyword');
  const [city, setCity] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [keyword, setKeyword] = React.useState('');

  const citySections = React.useMemo(
    () =>
      buildJobCityComboboxSections(taxonomy, locale, {
        cityAny: tJobs('cityAny'),
        districtOther: tJobs('districtOther'),
      }),
    [taxonomy, locale, tJobs],
  );

  const categoryOptions = React.useMemo((): SelectFieldOption[] => {
    const anyOption: SelectFieldOption = {
      value: JOBS_FILTER_ANY_VALUE,
      label: t('heroSearchCategoryAny'),
    };
    const rest = taxonomy.categories.map((c) => ({
      value: c.slug,
      label: pickLocalizedBilingual(locale, c.nameSr, c.nameEn),
    }));
    return [anyOption, ...rest];
  }, [locale, t, taxonomy.categories]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'keyword', label: t('heroTabKeyword') },
    { id: 'city', label: t('heroTabCity') },
    { id: 'category', label: t('heroTabCategory') },
  ];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!isAuthenticated) {
      e.preventDefault();
      const returnTo = encodeURIComponent(`/${locale}/jobs`);
      router.push(`/${locale}/sign-in?returnTo=${returnTo}`);
    }
  }

  return (
    <form method="get" action={action} onSubmit={handleSubmit} className="mt-10 w-full max-w-2xl">
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="pageSize" value="12" />
      {activeTab !== 'city' && city && (
        <input type="hidden" name="city" value={city} />
      )}
      {activeTab !== 'category' && category && (
        <input type="hidden" name="category" value={category} />
      )}
      {activeTab !== 'keyword' && keyword && (
        <input type="hidden" name="q" value={keyword} />
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-1" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-full px-5 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search pill */}
      <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background p-2 pl-5 shadow-sm">
        {activeTab === 'keyword' && (
          <input
            type="search"
            name="q"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t('heroSearchKeywordPlaceholder')}
            maxLength={200}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
          />
        )}

        {activeTab === 'city' && (
          <>
            <input type="hidden" name="city" value={city} />
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
          </>
        )}

        {activeTab === 'category' && (
          <>
            <input type="hidden" name="category" value={category} />
            <div className="min-w-0 flex-1">
              <SelectField
                id="hero-category"
                options={categoryOptions}
                value={category === '' ? JOBS_FILTER_ANY_VALUE : category}
                onValueChange={(v) =>
                  setCategory(v === JOBS_FILTER_ANY_VALUE ? '' : v)
                }
                placeholder={t('heroSearchCategoryAny')}
                classNames={{
                  trigger:
                    'h-10 w-full border-0 bg-transparent px-0 shadow-none focus-visible:ring-0',
                }}
              />
            </div>
          </>
        )}

        <Button
          type="submit"
          size="icon"
          className="size-11 shrink-0 rounded-full"
          aria-label={t('heroSearchSubmit')}
        >
          <Search className="size-5" aria-hidden />
        </Button>
      </div>
    </form>
  );
}
