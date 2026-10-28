'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';

import type {
  PublicJobListResponse,
  PublicJobTaxonomyResponse,
} from 'contracts';

import { Button } from '@/components/ui/button';
import { Link, usePathname } from '@/i18n/navigation';

import { type JobsFilterDefaults } from '../lib/jobs-list-query';

import { JobsFilterChipsBar } from './jobs-filter-chips-bar';
import { JobsFilterForm } from './jobs-filter-form';
import { JobsInfiniteList } from './jobs-infinite-list';
import { JobsListPreviewPane } from './jobs-list-preview-pane';
import { LockedJobsCta } from './locked-jobs-cta';

export type JobsListBody =
  | { kind: 'no-api' }
  | {
      kind: 'error';
      message: string;
      missingApiUrl: boolean;
      httpStatus?: number;
    }
  | { kind: 'empty' }
  | {
      kind: 'list';
      initialPage: PublicJobListResponse;
      listSignature: string;
    };

export type JobsListScreenProps = {
  formAction: string;
  pageSize: number;
  defaults: JobsFilterDefaults;
  apiBasePresent: boolean;
  taxonomy: PublicJobTaxonomyResponse;
  body: JobsListBody;
  /** Landing pages replace the generic heading and add breadcrumbs / links. */
  heading?: { title: string; intro: string };
  before?: ReactNode;
  after?: ReactNode;
};

export function JobsListScreen({
  formAction,
  pageSize,
  defaults,
  apiBasePresent,
  taxonomy,
  body,
  heading,
  before,
  after,
}: JobsListScreenProps) {
  const t = useTranslations('Jobs');
  const locale = useLocale();
  const pathname = usePathname();

  const selectedSegment = defaults.job.trim();
  const activeFilters = [
    defaults.q,
    defaults.city,
    defaults.category,
    defaults.workModel,
    defaults.employmentType,
    defaults.postedWithin,
    defaults.easyApply ? '1' : '',
  ].filter(Boolean).length;
  // Phones: results first; the filters open from one button.
  const [filtersOpen, setFiltersOpen] = useState(false);

  let main: ReactNode;
  if (body.kind === 'no-api') {
    main = (
      <div className="rounded-xl border border-dashed border-destructive/30 bg-destructive-soft px-6 py-10 text-center">
        <h2 className="m-0 mb-2 text-lg font-semibold text-destructive">
          {t('errorTitle')}
        </h2>
        <p className="m-0 mx-auto max-w-md text-[0.9375rem] text-foreground">
          {t('errorNoApi')}
        </p>
      </div>
    );
  } else if (body.kind === 'error') {
    main = (
      <div className="rounded-xl border border-dashed border-destructive/30 bg-destructive-soft px-6 py-10 text-center">
        <h2 className="m-0 mb-2 text-lg font-semibold text-destructive">
          {t('errorTitle')}
        </h2>
        <p className="m-0 mx-auto max-w-md text-[0.9375rem] text-foreground">
          {t('errorBody')}
        </p>
      </div>
    );
  } else if (body.kind === 'empty') {
    const filtered = Boolean(
      defaults.q ||
        defaults.city ||
        defaults.category ||
        defaults.workModel ||
        defaults.employmentType ||
        defaults.postedWithin ||
        defaults.easyApply,
    );
    main = (
      <div className="rounded-xl border border-dashed border-border bg-muted/50 px-6 py-10 text-center">
        <h2 className="m-0 mb-2 text-lg font-semibold text-foreground">
          {filtered ? t('emptyFilteredTitle') : t('emptyTitle')}
        </h2>
        <p className="m-0 mx-auto max-w-md text-[0.9375rem] text-muted-foreground">
          {filtered ? t('emptyFilteredBody') : t('emptyBody')}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/jobs">{t('emptyClearFilters')}</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/employers">{t('browseEmployers')}</Link>
          </Button>
        </div>
      </div>
    );
  } else {
    main = (
      <JobsInfiniteList
        initialPage={body.initialPage}
        listSignature={body.listSignature}
        pageSize={pageSize}
        defaults={defaults}
        apiBasePresent={apiBasePresent}
      />
    );
  }

  const previewPane =
    body.kind === 'list' ? (
      <div className="hidden md:block">
        <JobsListPreviewPane
          jobSegment={selectedSegment}
          apiBasePresent={apiBasePresent}
        />
      </div>
    ) : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pb-14 md:py-12 md:pb-16">
      {before}
      <header className="mb-8">
        <h1 className="m-0 mb-2 text-h1 text-foreground">
          {heading?.title ?? t('title')}
        </h1>
        <p className="m-0 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
          {heading?.intro ?? t('listDescription')}
        </p>
      </header>

      {apiBasePresent ? (
        <>
          <Button
            type="button"
            variant="outline"
            className="mb-4 min-h-11 w-full justify-center md:hidden"
            aria-expanded={filtersOpen}
            aria-controls="jobs-filters"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <SlidersHorizontal aria-hidden />
            {t('filtersToggle', { count: activeFilters })}
          </Button>
          {/* No Suspense: these pages render per request, so the bar is in
              the first HTML; a streamed swap pushed the form down (CLS). */}
          <div
            id="jobs-filters"
            className={filtersOpen ? 'block' : 'hidden md:block'}
          >
            <JobsFilterChipsBar />
          </div>
          <div className={filtersOpen ? 'mb-8' : 'mb-8 hidden md:block'}>
            <JobsFilterForm
              action={formAction}
              pageSize={pageSize}
              defaultQ={defaults.q}
              defaultCity={defaults.city}
              defaultCategory={defaults.category}
              taxonomy={taxonomy}
              preserve={{
                job: defaults.job,
                workModel: defaults.workModel,
                employmentType: defaults.employmentType,
                postedWithin: defaults.postedWithin,
                easyApply: defaults.easyApply,
              }}
            />
          </div>
        </>
      ) : null}

      {body.kind === 'list' ? (
        <LockedJobsCta
          count={body.initialPage.lockedTotal}
          locale={locale}
          returnToPath={pathname}
          className="mb-6"
        />
      ) : null}

      <div className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:items-start md:gap-6">
        <div>{main}</div>
        {previewPane}
      </div>
      {after}
    </main>
  );
}
