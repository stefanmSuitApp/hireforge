'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
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
import { GuestBrowseCta } from './guest-browse-cta';
import { type LaunchViewer, SiteLaunchPanel } from './site-launch-panel';

export type JobsListBody =
  | { kind: 'no-api' }
  | {
      kind: 'error';
      message: string;
      missingApiUrl: boolean;
      httpStatus?: number;
    }
  | { kind: 'empty'; siteEmpty: boolean; viewer: LaunchViewer }
  /** A guest opened a URL with filters that need an account. */
  | { kind: 'guest-filters' }
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
  /** Guests browse page 1 and can't use the advanced filters. */
  signedIn: boolean;
  taxonomy: PublicJobTaxonomyResponse;
  body: JobsListBody;
  /** Landing pages replace the generic heading and add breadcrumbs / links. */
  heading?: { title: string; intro: string; imageUrl?: string | null };
  before?: ReactNode;
  after?: ReactNode;
};

export function JobsListScreen({
  formAction,
  pageSize,
  defaults,
  apiBasePresent,
  signedIn,
  taxonomy,
  body,
  heading,
  before,
  after,
}: JobsListScreenProps) {
  const t = useTranslations('Jobs');
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const returnToPath = query ? `${pathname}?${query}` : pathname;

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
  } else if (body.kind === 'empty' && body.siteEmpty) {
    main = <SiteLaunchPanel viewer={body.viewer} variant="jobs" />;
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
  } else if (body.kind === 'guest-filters') {
    main = (
      <GuestBrowseCta
        total={0}
        title={t('guestFiltersTitle')}
        locale={locale}
        returnToPath={returnToPath}
      />
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
          guest={!signedIn}
        />
      </div>
    ) : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pb-14 md:py-12 md:pb-16">
      {before}
      {heading ? (
        // Landings: the city/category photo (CMS) with the title on a card.
        <header className="hf-reveal relative mb-6 flex min-h-[300px] items-end overflow-hidden rounded-[32px] bg-gradient-to-br from-placeholder to-featured-soft">
          {heading.imageUrl ? (
            <img
              src={heading.imageUrl}
              alt=""
              className="absolute inset-0 size-full object-cover"
              fetchPriority="high"
            />
          ) : null}
          <div className="relative m-4 max-w-[620px] rounded-[24px] border border-border bg-card px-6 py-6 md:m-6 md:px-7">
            <h1 className="m-0 text-[clamp(1.875rem,4.5vw,2.875rem)] font-extrabold leading-[1.08] tracking-tight text-foreground">
              {heading.title}
            </h1>
            <p className="m-0 mt-2.5 leading-relaxed text-muted-foreground">
              {heading.intro}
            </p>
            {body.kind === 'list' ? (
              <span className="mt-3.5 inline-flex rounded-full bg-featured-soft px-3.5 py-1.5 text-sm font-bold text-featured-soft-foreground">
                {t('openPositions', { count: body.initialPage.total })}
              </span>
            ) : null}
          </div>
        </header>
      ) : (
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="m-0 text-[clamp(2.125rem,5vw,3.25rem)] font-extrabold leading-[1.05] tracking-tight text-foreground">
              {t('title')}
            </h1>
            <p className="m-0 mt-2.5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-[1.0625rem]">
              {t('listDescription')}
            </p>
          </div>
          {body.kind === 'list' ? (
            <span className="rounded-full bg-featured-soft px-3.5 py-2 text-sm font-bold text-featured-soft-foreground">
              {t('openPositions', { count: body.initialPage.total })}
            </span>
          ) : null}
        </header>
      )}

      {apiBasePresent ? (
        <>
          {/* Search first and on phones too; only the extra filters fold. */}
          <div className="mb-4">
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
          {/* No Suspense: these pages render per request, so the bar is in
              the first HTML; a streamed swap pushed the list down (CLS). */}
          {signedIn ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="mb-4 min-h-11 w-full justify-center rounded-full md:hidden"
                aria-expanded={filtersOpen}
                aria-controls="jobs-filters"
                onClick={() => setFiltersOpen((v) => !v)}
              >
                <SlidersHorizontal aria-hidden />
                {t('filtersToggle', { count: activeFilters })}
              </Button>
              <div
                id="jobs-filters"
                className={filtersOpen ? 'mb-6 block' : 'mb-6 hidden md:block'}
              >
                <JobsFilterChipsBar />
              </div>
            </>
          ) : (
            <div className="mb-6">
              <JobsFilterChipsBar guest />
            </div>
          )}
        </>
      ) : null}

      {/* Split view only when there is a list to preview; empty states,
          errors and the launch panel take the full width. */}
      <div
        className={
          previewPane
            ? 'md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:items-start md:gap-6'
            : undefined
        }
      >
        <div>
          {main}
          {body.kind === 'list' && body.initialPage.guestLimited ? (
            <GuestBrowseCta
              total={body.initialPage.total}
              locale={locale}
              returnToPath={returnToPath}
              className="mt-6"
            />
          ) : null}
        </div>
        {previewPane}
      </div>
      {after}
    </main>
  );
}
