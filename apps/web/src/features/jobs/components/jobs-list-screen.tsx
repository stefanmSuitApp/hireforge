'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import * as React from 'react';

import type { PublicJobListResponse, PublicJobTaxonomyResponse } from 'contracts';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

import { type JobsFilterDefaults } from '../lib/jobs-list-query';

import { JobsFilterChipsBar } from './jobs-filter-chips-bar';
import { JobsFilterForm } from './jobs-filter-form';
import { JobsInfiniteList } from './jobs-infinite-list';
import { JobsListPreviewPane } from './jobs-list-preview-pane';

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
};

function JobsFilterChipsFallback() {
  return (
    <div className="mb-4 h-16 animate-pulse rounded-lg bg-muted/40" aria-hidden />
  );
}

export function JobsListScreen({
  formAction,
  pageSize,
  defaults,
  apiBasePresent,
  taxonomy,
  body,
}: JobsListScreenProps) {
  const t = useTranslations('Jobs');

  const selectedSegment = defaults.job.trim();

  let main: ReactNode;
  if (body.kind === 'no-api') {
    main = (
      <div className="rounded-xl border border-dashed border-red-200 bg-red-50 px-6 py-10 text-center">
        <h2 className="m-0 mb-2 text-lg font-semibold text-red-900">
          {t('errorTitle')}
        </h2>
        <p className="m-0 mx-auto max-w-md text-[0.9375rem] text-gray-700">
          {t('errorNoApi')}
        </p>
      </div>
    );
  } else if (body.kind === 'error') {
    const message = body.missingApiUrl
      ? t('errorNoApi')
      : t('errorBody', { message: body.message });
    main = (
      <div className="rounded-xl border border-dashed border-red-200 bg-red-50 px-6 py-10 text-center">
        <h2 className="m-0 mb-2 text-lg font-semibold text-red-900">
          {t('errorTitle')}
        </h2>
        <p className="m-0 mx-auto max-w-md text-[0.9375rem] text-gray-700">
          {message}
        </p>
        {body.httpStatus === 404 ? (
          <p className="mx-auto mt-3 max-w-lg text-sm leading-snug text-red-900">
            {t('error404Hint')}
          </p>
        ) : null}
      </div>
    );
  } else if (body.kind === 'empty') {
    main = (
      <div className="rounded-xl border border-dashed border-gray-300 bg-neutral-50 px-6 py-10 text-center">
        <h2 className="m-0 mb-2 text-lg font-semibold text-gray-700">
          {t('emptyTitle')}
        </h2>
        <p className="m-0 mx-auto max-w-md text-[0.9375rem] text-gray-500">
          {t('emptyBody')}
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
      <header className="mb-8">
        <h1 className="m-0 mb-2 text-[clamp(1.45rem,6vw,2.25rem)] font-bold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="m-0 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
          {t('listDescription')}
        </p>
      </header>

      {apiBasePresent ? (
        <>
          <React.Suspense fallback={<JobsFilterChipsFallback />}>
            <JobsFilterChipsBar />
          </React.Suspense>
          <div className="mb-8">
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

      <div className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:items-start md:gap-6">
        <div>{main}</div>
        {previewPane}
      </div>
    </main>
  );
}
