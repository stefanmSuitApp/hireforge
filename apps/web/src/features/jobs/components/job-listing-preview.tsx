'use client';

import * as React from 'react';

import { useFormatter, useLocale, useTranslations } from 'next-intl';

import type {
  ModeratorJobDetailResponse,
  PublicJobDetailResponse,
} from 'contracts';

import { CompanyInitials } from '@/components/company-initials';
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

/** Roughly a screen of text: past this the top apply button is out of view. */
const LONG_DESCRIPTION_CHARS = 1200;

const chipClass =
  'rounded-full bg-muted px-3 py-1 text-[0.8125rem] font-medium text-muted-foreground';

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
  /** Inside the list's preview pane: one card, sections split by lines. */
  embedded?: boolean;
  className?: string;
};

export function JobListingPreview({
  job,
  listingState,
  titleAs: Title = 'h1',
  stickyApply = false,
  guest = false,
  embedded = false,
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

  // A second button at the end only helps when the first one has scrolled
  // away; on a short ad it sat on the same screen as the first.
  const longDescription = job.description.length > LONG_DESCRIPTION_CHARS;

  /** The page's one action: under the title (and at the end of a long ad). */
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

  // Wide (the job page): an apply box sticks beside the text, so the
  // button under the title goes; narrow (pane, phones): the reverse.
  const asideCtaClass = cn(
    'w-full',
    !longDescription && 'hidden @4xl:inline-flex',
    longDescription && stickyApply && 'hidden md:inline-flex',
  );
  const card = embedded
    ? 'border-t border-border p-6'
    : 'rounded-[24px] border border-border bg-card p-6 @2xl:p-7';
  const featuredLive = listingState === 'live' && job.featured;

  return (
    <article className={cn('@container', className)}>
      <section
        className={cn(
          'overflow-hidden bg-card',
          !embedded && 'rounded-[28px] border',
          !embedded && (featuredLive ? 'border-featured/60' : 'border-border'),
        )}
      >
        {/* Cover band until companies have cover photos (plan step 6). */}
        <div
          aria-hidden
          className={cn(
            'bg-gradient-to-br from-placeholder to-featured-soft',
            embedded ? 'h-24' : 'h-28 @2xl:h-44',
          )}
        />
        <div className="px-6 pb-6 @2xl:px-8 @2xl:pb-8">
          <CompanyInitials
            name={job.company.name}
            className="-mt-10 size-20 rounded-[22px] border border-border bg-card text-lg shadow-[0_12px_30px_-18px_oklch(0.34_0.06_182_/_0.6)]"
          />
          {listingState === 'expired' ? (
            <p
              className="m-0 mt-4 rounded-xl border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground"
              role="status"
            >
              {t('expiredBanner')}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {job.featured && listingState !== 'expired' ? (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-featured-soft px-3 py-1 text-[0.8125rem] font-bold text-featured-soft-foreground"
                title={
                  listingState === 'live'
                    ? t('featuredSpotlightHint')
                    : undefined
                }
              >
                <Sparkles className="size-3.5" aria-hidden />
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
          <Title className="m-0 mt-3.5 text-[1.75rem] font-extrabold leading-[1.08] tracking-tight text-foreground @2xl:text-[2.5rem] @4xl:text-5xl">
            {job.title}
          </Title>
          <p className="m-0 mt-2 text-base leading-normal text-muted-foreground @2xl:text-[1.0625rem]">
            <Link
              href={`/companies/${job.company.slug}`}
              className="font-bold text-primary underline-offset-2 hover:underline"
            >
              {job.company.name}
            </Link>
            {cityLine ? ` · ${cityLine}` : ''}
            {categoryLine ? ` · ${categoryLine}` : ''}
          </p>
          <p className="m-0 mt-2.5 text-sm leading-normal text-muted-foreground">
            {listingState === 'preview' && !job.publishedAt
              ? t('previewNotPublished')
              : `${t('publishedLabel')} ${publishedMedium(job.publishedAt)}`}
            {listingState === 'live' && job.expiresAt
              ? ` · ${t('expiresLabel')} ${publishedMedium(job.expiresAt)}`
              : null}
          </p>
          {listingState === 'live' ? (
            <div className="mt-5 @4xl:hidden">
              {applyCta('hf-press w-full rounded-2xl sm:w-auto')}
            </div>
          ) : null}
        </div>
      </section>

      <div
        className={cn(
          'grid @4xl:grid-cols-[minmax(0,1fr)_340px] @4xl:items-start',
          !embedded && 'mt-6 gap-6',
        )}
      >
        <section className={cn(card, '@4xl:col-start-1')}>
          <h2 className="m-0 mb-3 text-[1.375rem] font-extrabold tracking-tight text-foreground">
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
          {job.pngCreativeUrl ? (
            <img
              src={job.pngCreativeUrl}
              alt={t('pngCreativeAlt')}
              className="mt-5 max-h-80 max-w-full rounded-[18px] border border-border object-contain"
            />
          ) : null}
        </section>

        <aside
          aria-label={t('applyTitle')}
          className={cn(
            card,
            '@4xl:col-start-2 @4xl:row-span-2 @4xl:row-start-1',
            !embedded &&
              '@4xl:sticky @4xl:top-24 @4xl:shadow-[0_24px_60px_-40px_oklch(0.34_0.06_182_/_0.6)]',
          )}
        >
          <h2 className="m-0 mb-2 text-xl font-extrabold tracking-tight text-foreground">
            {t('applyTitle')}
          </h2>
          {listingState === 'preview' ? (
            <p className="m-0 text-sm text-muted-foreground">
              {t('applyPreviewNote')}
            </p>
          ) : listingState === 'expired' ? (
            <p className="m-0 text-sm text-muted-foreground">
              {t('applyClosed')}{' '}
              <Link
                href="/jobs"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                {t('expiredBrowseLive')}
              </Link>
            </p>
          ) : (
            <>
              <p className="m-0 mb-4 leading-relaxed text-muted-foreground">
                {job.applyMode === 'external'
                  ? t('applyHintExternal')
                  : t('applyHint')}
              </p>
              {applyCta(cn('hf-press min-h-14 rounded-[18px]', asideCtaClass))}
              {guest && job.applyMode !== 'external' ? (
                <p className="m-0 mt-3.5 text-center text-sm text-muted-foreground">
                  {t('applyHaveAccount')}{' '}
                  <Link
                    href={`/candidate/login?returnTo=${encodeURIComponent(applyPath)}`}
                    className="font-bold text-primary underline-offset-2 hover:underline"
                  >
                    {t('applySignIn')}
                  </Link>
                </p>
              ) : null}
            </>
          )}
        </aside>

        <section
          className={cn(
            card,
            'flex flex-wrap items-center gap-4 @4xl:col-start-1',
          )}
        >
          <CompanyInitials
            name={job.company.name}
            className="size-16 rounded-[18px]"
          />
          <div className="min-w-0 flex-[1_1_220px]">
            <h2 className="m-0 text-lg font-extrabold text-foreground">
              {t('companySnapshotTitle')}
            </h2>
            <p className="m-0 mt-1 text-sm text-muted-foreground">
              <Link
                href={`/companies/${job.company.slug}`}
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                {job.company.name}
              </Link>
              {cityLine ? ` · ${cityLine}` : ''}
            </p>
          </div>
          <Button
            variant="outline"
            className="hf-press min-h-11 rounded-full px-5 font-semibold"
            asChild
          >
            <Link href={`/companies/${job.company.slug}`}>
              {t('companySnapshotCta')}
            </Link>
          </Button>
        </section>
      </div>

      {listingState !== 'preview' ? (
        <SimilarJobsSection
          jobId={job.id}
          listLocale={locale}
          className={embedded ? 'border-t border-border p-6' : 'mt-14'}
        />
      ) : null}

      {stickyApply && listingState === 'live' ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
          {applyCta('w-full min-h-[52px] rounded-2xl font-extrabold')}
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
