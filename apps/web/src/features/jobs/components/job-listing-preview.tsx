'use client';

import * as React from 'react';

import { useFormatter, useLocale, useTranslations } from 'next-intl';

import type {
  ModeratorJobDetailResponse,
  PublicJobDetailResponse,
} from 'contracts';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { publicJobUrlSegment } from '@/lib/job-public-segment';
import { Sparkles } from 'lucide-react';

import {
  localizedCategoryLine,
  localizedCityLine,
} from '../lib/bilingual-label';
import { humanizeEnum } from '../lib/humanize-enum';

import { SimilarJobsSection } from './similar-jobs-section';

/** Map moderator API payload to the public-detail shape used by the shared preview. */
export function moderatorJobToPublicPreviewShape(
  job: ModeratorJobDetailResponse,
): PublicJobDetailResponse {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    descriptionHtml: job.descriptionHtml,
    slug: job.slug,
    shortId: job.shortId,
    applyMode: job.applyMode,
    externalApplyUrl: job.externalApplyUrl,
    primaryLanguage: job.primaryLanguage,
    featured: job.featured,
    crossborderVisible: job.crossborderVisible,
    pngCreativeUrl: job.pngCreativeUrl,
    publishedAt: job.publishedAt,
    expiresAt: null,
    workModel: job.workModel,
    employmentType: job.employmentType,
    seniority: job.seniority,
    company: { slug: job.company.slug, name: job.company.legalName },
    city: job.city,
    category: job.category,
  };
}

function ExternalApplyCta({
  job,
  label,
}: {
  job: PublicJobDetailResponse;
  label: string;
}) {
  const sessionKeyRef = React.useRef<string | null>(null);
  if (
    sessionKeyRef.current === null &&
    typeof globalThis.crypto?.randomUUID === 'function'
  ) {
    sessionKeyRef.current = globalThis.crypto.randomUUID();
  }

  const targetUrl = job.externalApplyUrl;
  if (!targetUrl) {
    return null;
  }

  function logClick(): void {
    const sessionKey = sessionKeyRef.current;
    if (!sessionKey) {
      return;
    }
    void fetch(`/api/public/jobs/${job.id}/external-click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionKey }),
      keepalive: true,
    }).catch(() => {
      /* telemetry — ignore */
    });
  }

  return (
    <Button variant="default" asChild>
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener nofollow noreferrer"
        onPointerDown={logClick}
      >
        {label}
      </a>
    </Button>
  );
}

const chipClass = cn(
  'rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700',
);

const descriptionHtmlClass = cn(
  'job-listing-description-html text-gray-700 leading-relaxed',
  '[&_a]:font-medium [&_a]:text-teal-700 [&_a]:underline-offset-2 [&_a]:hover:underline',
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
  '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
  '[&_li]:my-0.5',
  '[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
  '[&_strong]:font-semibold [&_b]:font-semibold',
  '[&_em]:italic [&_i]:italic',
  '[&_u]:underline',
  '[&_s]:line-through [&_strike]:line-through',
  '[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-gray-900',
  '[&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-900',
  '[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:text-gray-600',
  '[&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[0.9em]',
  '[&_pre]:my-3 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-gray-100 [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-sm',
  '[&_img]:my-3 [&_img]:max-h-96 [&_img]:max-w-full [&_img]:rounded-md [&_img]:border [&_img]:border-gray-200',
);

export type JobListingPreviewProps = {
  job: PublicJobDetailResponse;
  /** `live` = public job page; `preview` = staff preview before go-live. */
  listingState: 'live' | 'preview';
  className?: string;
};

export function JobListingPreview({
  job,
  listingState,
  className,
}: JobListingPreviewProps) {
  const t = useTranslations('JobDetail');
  const locale = useLocale();
  const format = useFormatter();

  function publishedMedium(iso: string | null): string {
    if (!iso) return '—';
    try {
      return format.dateTime(new Date(iso), { dateStyle: 'medium' });
    } catch {
      return iso;
    }
  }

  const jobPath = publicJobUrlSegment(job);
  const cityLine = localizedCityLine(locale, job.city);
  const categoryLine = localizedCategoryLine(locale, job.category);
  const html = job.descriptionHtml?.trim();
  const showHtml = Boolean(html);

  return (
    <article
      className={cn(
        'rounded-[0.85rem] border border-gray-200 bg-white p-5',
        listingState === 'live' &&
          job.featured &&
          'border-amber-300/80 shadow-md ring-1 ring-amber-200/70',
        className,
      )}
    >
      {listingState === 'live' && job.featured ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-2 text-sm font-semibold text-white shadow-sm">
          <Sparkles className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
          <span>{t('featuredBadge')}</span>
          <span className="hidden text-xs font-normal text-amber-50 sm:inline">
            {t('featuredSpotlightHint')}
          </span>
        </div>
      ) : null}
      <h1 className="m-0 mb-2 text-[clamp(1.45rem,3vw,1.9rem)] font-normal leading-snug text-gray-900">
        {job.title}
      </h1>
      <p className="m-0 text-[0.9375rem] leading-normal text-gray-600">
        <Link
          href={`/companies/${job.company.slug}`}
          className="font-semibold text-teal-700 underline-offset-2 hover:underline"
        >
          {job.company.name}
        </Link>
        {cityLine ? ` · ${cityLine}` : ''}
        {categoryLine ? ` · ${categoryLine}` : ''}
      </p>
      <p className="m-0 text-[0.9375rem] leading-normal text-gray-600">
        {listingState === 'preview' && !job.publishedAt
          ? t('previewNotPublished')
          : `${t('publishedLabel')} ${publishedMedium(job.publishedAt)}`}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {listingState === 'preview' && job.featured ? (
          <span
            className={cn(chipClass, 'bg-amber-100 text-amber-900')}
            title={t('featuredBadge')}
          >
            {t('featuredBadge')}
          </span>
        ) : null}
        {job.crossborderVisible ? (
          <span
            className={cn(chipClass, 'bg-sky-100 text-sky-900')}
            title={t('crossborderBadge')}
          >
            {t('crossborderBadge')}
          </span>
        ) : null}
        <span className={chipClass}>{humanizeEnum(job.workModel)}</span>
        <span className={chipClass}>{humanizeEnum(job.employmentType)}</span>
        <span className={chipClass}>{humanizeEnum(job.seniority)}</span>
      </div>

      {job.pngCreativeUrl ? (
        <div className="mt-4">
          <img
            src={job.pngCreativeUrl}
            alt={t('pngCreativeAlt')}
            className="max-h-48 max-w-full rounded-md border border-gray-200 object-contain"
          />
        </div>
      ) : null}

      <section className="mt-5">
        <h2 className="m-0 mb-1.5 text-base text-gray-900">
          {t('descriptionTitle')}
        </h2>
        {showHtml ? (
          <div
            className={descriptionHtmlClass}
            dangerouslySetInnerHTML={{ __html: html ?? '' }}
          />
        ) : (
          <p className="m-0 whitespace-pre-wrap leading-relaxed text-gray-700">
            {job.description}
          </p>
        )}
      </section>

      <section className="mt-5 border-t border-gray-200 pt-5">
        <h2 className="m-0 mb-2 text-base font-semibold text-gray-900">
          {t('companySnapshotTitle')}
        </h2>
        <p className="m-0 text-sm text-gray-700">
          <Link
            href={`/companies/${job.company.slug}`}
            className="font-semibold text-teal-700 underline-offset-2 hover:underline"
          >
            {job.company.name}
          </Link>
          {cityLine ? ` · ${cityLine}` : ''}
        </p>
        <p className="mt-2 mb-0">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/companies/${job.company.slug}`}>
              {t('companySnapshotCta')}
            </Link>
          </Button>
        </p>
      </section>

      {listingState === 'live' ? (
        <SimilarJobsSection jobId={job.id} listLocale={locale} />
      ) : null}

      <section className="mt-5 border-t border-gray-200 pt-5">
        <h2 className="m-0 mb-1 text-gray-900">{t('applyTitle')}</h2>
        {listingState === 'preview' ? (
          <p className="mb-0 mt-0 text-sm text-gray-600">
            {t('applyPreviewNote')}
          </p>
        ) : job.applyMode === 'external' ? (
          <>
            <p className="mb-3.5 mt-0 text-gray-500">
              {t('applyHintExternal')}
            </p>
            <ExternalApplyCta job={job} label={t('applyButtonExternal')} />
          </>
        ) : (
          <>
            <p className="mb-3.5 mt-0 text-gray-500">{t('applyHint')}</p>
            <Button variant="default" asChild>
              <Link href={`/jobs/${jobPath}/apply`}>{t('applyButton')}</Link>
            </Button>
            <p className="mb-0 mt-3 text-sm text-gray-600">
              <Link
                href={`/candidate/login?returnTo=${encodeURIComponent(`/jobs/${jobPath}/apply`)}`}
                className="font-medium text-teal-700 underline-offset-2 hover:underline"
              >
                {t('applySignIn')}
              </Link>
              <span className="text-gray-400"> · </span>
              <Link
                href="/candidate/register"
                className="font-medium text-teal-700 underline-offset-2 hover:underline"
              >
                {t('applyCreateAccount')}
              </Link>
            </p>
          </>
        )}
      </section>
    </article>
  );
}
