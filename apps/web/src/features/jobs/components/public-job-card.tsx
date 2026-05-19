'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import type { PublicJobListItem } from 'contracts';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { publicJobUrlSegment } from '@/lib/job-public-segment';

import {
  localizedCategoryLine,
  localizedCityLine,
} from '../lib/bilingual-label';
import { humanizeEnum } from '../lib/humanize-enum';

import { SaveJobButton } from './save-job-button';

type Props = {
  job: PublicJobListItem;
  selected?: boolean;
  onSelectDesktop?: (segment: string) => void;
  listLocale: string;
  returnToPath: string;
  publishedLabel: string;
  publishedMedium: (iso: string | null) => string;
};

export function PublicJobCard({
  job,
  selected,
  onSelectDesktop,
  listLocale,
  returnToPath,
  publishedLabel,
  publishedMedium,
}: Props) {
  const t = useTranslations('Jobs');
  const tDetail = useTranslations('JobDetail');
  const hookLocale = useLocale();
  const locale = listLocale || hookLocale;
  const seg = publicJobUrlSegment(job);
  const city = localizedCityLine(locale, job.city);
  const cat = localizedCategoryLine(locale, job.category);
  const jobHref = `/jobs/${seg}`;

  function onCardLinkClick(e: MouseEvent<HTMLAnchorElement>) {
    if (
      !onSelectDesktop ||
      typeof window === 'undefined' ||
      !window.matchMedia('(min-width: 768px)').matches
    ) {
      return;
    }
    e.preventDefault();
    onSelectDesktop(seg);
  }

  return (
    <article
      className={cn(
        'relative cursor-pointer overflow-hidden rounded-2xl border bg-card p-5 transition-all duration-250',
        !selected && 'hf-primary-glow-hover',
        selected
          ? 'border-l-4 border-l-primary border-t-border/60 border-r-border/60 border-b-border/60 bg-primary/[0.02]'
          : 'border-border/60',
        job.featured &&
          !selected &&
          'border-primary/30 bg-primary/[0.02]',
      )}
    >
      <Link
        href={jobHref}
        className="absolute inset-0 z-0 rounded-2xl outline-offset-2"
        aria-label={t('cardOpenJobAria', { title: job.title })}
        onClick={onCardLinkClick}
      />
      <div className="relative z-10 pointer-events-none">
        {job.featured ? (
          <span className="mb-3 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-primary">
            {tDetail('featuredBadge')}
          </span>
        ) : null}
        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="m-0 mb-1 text-base font-semibold leading-snug text-foreground">
              {job.title}
            </h2>
            <p className="m-0 text-sm leading-snug text-muted-foreground">
              <Link
                href={`/companies/${job.company.slug}`}
                className="pointer-events-auto font-medium text-primary underline-offset-2 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {job.company.name}
              </Link>
              {city ? ` · ${city}` : ''}
              {cat ? ` · ${cat}` : ''}
            </p>
            <p className="m-0 mt-1 text-xs text-muted-foreground">
              {publishedLabel} {publishedMedium(job.publishedAt)}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {job.applyMode === 'internal' ? (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {t('chipEasyApply')}
                </span>
              ) : null}
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {humanizeEnum(job.workModel)}
              </span>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {humanizeEnum(job.employmentType)}
              </span>
            </div>
          </div>
          <SaveJobButton
            jobId={job.id}
            returnToPath={returnToPath}
            className="pointer-events-auto shrink-0"
          />
        </div>
      </div>
    </article>
  );
}
