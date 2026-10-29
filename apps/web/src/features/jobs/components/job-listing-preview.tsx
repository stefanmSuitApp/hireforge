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
import { jobEnumLabel } from '../lib/job-enum-label';

import { GuestApplySheet } from './guest-apply-sheet';
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
    updatedAt: job.updatedAt,
    live: false,
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
  className,
}: {
  job: PublicJobDetailResponse;
  label: string;
  className?: string;
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
    <Button variant="default" size="lg" className={className} asChild>
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
  'rounded-md bg-muted px-2 py-1 text-xs font-semibold text-foreground',
);

const descriptionHtmlClass = cn(
  'job-listing-description-html text-foreground leading-relaxed',
  '[&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-2 [&_a]:hover:underline',
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
  '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
  '[&_li]:my-0.5',
  '[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
  '[&_strong]:font-semibold [&_b]:font-semibold',
  '[&_em]:italic [&_i]:italic',
  '[&_u]:underline',
  '[&_s]:line-through [&_strike]:line-through',
  '[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground',
  '[&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground',
  '[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground',
  '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[0.9em]',
  '[&_pre]:my-3 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-sm',
  '[&_img]:my-3 [&_img]:max-h-96 [&_img]:max-w-full [&_img]:rounded-md [&_img]:border [&_img]:border-border',
);

export type JobListingPreviewProps = {
  job: PublicJobDetailResponse;
  /**
   * `live` = public job page; `expired` = public page of an ad that ended
   * (banner, no apply); `preview` = staff preview before go-live.
   */
  listingState: 'live' | 'expired' | 'preview';
  /** `h2` when embedded in a page that has its own `<h1>` (list preview pane). */
  titleAs?: 'h1' | 'h2';
  /** Full job page on a phone: keep the apply button in a bar at the bottom. */
  stickyApply?: boolean;
  /** No session: "Konkuriši" opens the sign-up sheet over the job. */
  guest?: boolean;
  className?: string;
};

export function JobListingPreview({
  job,
  listingState,
  titleAs: Title = 'h1',
  stickyApply = false,
  guest = false,
  className,
}: JobListingPreviewProps) {
  const t = useTranslations('JobDetail');
  const tEnum = useTranslations('Enums');
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
  const applyPath = `/jobs/${jobPath}/apply`;
  const [signUpOpen, setSignUpOpen] = React.useState(false);

  function openSignUp(e: React.MouseEvent<HTMLAnchorElement>) {
    // Modified clicks still open the apply link (and its sign-in redirect).
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    e.preventDefault();
    setSignUpOpen(true);
  }

  /** The one action of the page: right under the title and again at the end. */
  function applyCta(ctaClass?: string) {
    if (listingState !== 'live') return null;
    return job.applyMode === 'external' ? (
      <ExternalApplyCta
        job={job}
        label={t('applyButtonExternal')}
        className={ctaClass}
      />
    ) : (
      <Button variant="default" size="lg" className={ctaClass} asChild>
        <Link href={applyPath} onClick={guest ? openSignUp : undefined}>
          {t('applyButton')}
        </Link>
      </Button>
    );
  }

  return (
    <article
      className={cn(
        'rounded-[0.85rem] border border-border bg-card p-5',
        listingState === 'live' &&
          job.featured &&
          'border-featured shadow-md ring-1 ring-featured/40',
        className,
      )}
    >
      {listingState === 'expired' ? (
        <p
          className="m-0 mb-4 rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground"
          role="status"
        >
          {t('expiredBanner')}
        </p>
      ) : null}
      {listingState === 'live' && job.featured ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-featured px-3 py-2 text-sm font-semibold text-featured-foreground">
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
          <span>{t('featuredBadge')}</span>
          <span className="hidden text-xs font-normal text-featured-foreground sm:inline">
            {t('featuredSpotlightHint')}
          </span>
        </div>
      ) : null}
      <Title className="m-0 mb-2 text-h1 text-foreground">{job.title}</Title>
      <p className="m-0 text-[0.9375rem] leading-normal text-muted-foreground">
        <Link
          href={`/companies/${job.company.slug}`}
          className="font-semibold text-primary underline-offset-2 hover:underline"
        >
          {job.company.name}
        </Link>
        {cityLine ? ` · ${cityLine}` : ''}
        {categoryLine ? ` · ${categoryLine}` : ''}
      </p>
      <p className="m-0 text-[0.9375rem] leading-normal text-muted-foreground">
        {listingState === 'preview' && !job.publishedAt
          ? t('previewNotPublished')
          : `${t('publishedLabel')} ${publishedMedium(job.publishedAt)}`}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {listingState === 'preview' && job.featured ? (
          <span
            className={cn(chipClass, 'bg-featured text-featured-foreground')}
            title={t('featuredBadge')}
          >
            {t('featuredBadge')}
          </span>
        ) : null}
        {job.crossborderVisible ? (
          <span
            className={cn(chipClass, 'bg-info-soft text-info')}
            title={t('crossborderBadge')}
          >
            {t('crossborderBadge')}
          </span>
        ) : null}
        <span className={chipClass}>
          {jobEnumLabel(tEnum, 'workModel', job.workModel)}
        </span>
        <span className={chipClass}>
          {jobEnumLabel(tEnum, 'employmentType', job.employmentType)}
        </span>
        <span className={chipClass}>
          {jobEnumLabel(tEnum, 'seniority', job.seniority)}
        </span>
      </div>

      {listingState === 'live' ? (
        <div className="mt-5">{applyCta('w-full sm:w-auto')}</div>
      ) : null}

      {job.pngCreativeUrl ? (
        <div className="mt-4">
          <img
            src={job.pngCreativeUrl}
            alt={t('pngCreativeAlt')}
            className="max-h-48 max-w-full rounded-md border border-border object-contain"
          />
        </div>
      ) : null}

      <section className="mt-5">
        <h2 className="m-0 mb-1.5 text-h3 text-foreground">
          {t('descriptionTitle')}
        </h2>
        {showHtml ? (
          <div
            className={descriptionHtmlClass}
            dangerouslySetInnerHTML={{ __html: html ?? '' }}
          />
        ) : (
          <p className="m-0 whitespace-pre-wrap leading-relaxed text-foreground">
            {job.description}
          </p>
        )}
      </section>

      <section className="mt-5 border-t border-border pt-5">
        <h2 className="m-0 mb-1 text-h3 text-foreground">{t('applyTitle')}</h2>
        {listingState === 'preview' ? (
          <p className="mb-0 mt-0 text-sm text-muted-foreground">
            {t('applyPreviewNote')}
          </p>
        ) : listingState === 'expired' ? (
          <p className="mb-0 mt-0 text-sm text-muted-foreground">
            {t('applyClosed')}{' '}
            <Link
              href="/jobs"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {t('expiredBrowseLive')}
            </Link>
          </p>
        ) : job.applyMode === 'external' ? (
          <>
            <p className="mb-3.5 mt-0 text-muted-foreground">
              {t('applyHintExternal')}
            </p>
            {applyCta()}
          </>
        ) : (
          <>
            <p className="mb-3.5 mt-0 text-muted-foreground">
              {t('applyHint')}
            </p>
            {applyCta()}
            {guest ? (
              <p className="mb-0 mt-3 text-sm text-muted-foreground">
                {t('applyHaveAccount')}{' '}
                <Link
                  href={`/candidate/login?returnTo=${encodeURIComponent(applyPath)}`}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  {t('applySignIn')}
                </Link>
              </p>
            ) : null}
          </>
        )}
      </section>

      <section className="mt-5 border-t border-border pt-5">
        <h2 className="m-0 mb-2 text-base font-semibold text-foreground">
          {t('companySnapshotTitle')}
        </h2>
        <p className="m-0 text-sm text-foreground">
          <Link
            href={`/companies/${job.company.slug}`}
            className="font-semibold text-primary underline-offset-2 hover:underline"
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

      {listingState !== 'preview' ? (
        <SimilarJobsSection jobId={job.id} listLocale={locale} />
      ) : null}

      {stickyApply && listingState === 'live' ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
          {applyCta('w-full')}
        </div>
      ) : null}

      {guest && listingState === 'live' && job.applyMode !== 'external' ? (
        <GuestApplySheet
          open={signUpOpen}
          onOpenChange={setSignUpOpen}
          jobTitle={job.title}
          companyName={job.company.name}
          applyPath={applyPath}
        />
      ) : null}
    </article>
  );
}
