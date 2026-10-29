'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import type { PublicJobListItem } from 'contracts';

import { CompanyInitials } from '@/components/company-initials';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { publicJobUrlSegment } from '@/lib/job-public-segment';

import {
  localizedCategoryLine,
  localizedCityLine,
} from '../lib/bilingual-label';
import { jobEnumLabel } from '../lib/job-enum-label';

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
  const tEnum = useTranslations('Enums');
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
        'hf-lift relative cursor-pointer rounded-[22px] border bg-card p-5',
        selected
          ? 'border-primary ring-2 ring-primary'
          : job.featured
            ? 'border-featured/60'
            : 'border-border',
      )}
    >
      <Link
        href={jobHref}
        className="absolute inset-0 z-0 rounded-[22px] outline-offset-2"
        aria-label={t('cardOpenJobAria', { title: job.title })}
        onClick={onCardLinkClick}
      />
      <div className="pointer-events-none relative z-10 flex items-start gap-3.5">
        <CompanyInitials name={job.company.name} className="size-[52px]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="m-0 text-lg font-bold leading-snug text-foreground">
              {job.title}
            </h2>
            <SaveJobButton
              jobId={job.id}
              returnToPath={returnToPath}
              className="pointer-events-auto shrink-0"
            />
          </div>
          <p className="m-0 mt-0.5 text-sm leading-snug text-muted-foreground">
            <Link
              href={`/companies/${job.company.slug}`}
              className="pointer-events-auto font-semibold text-primary underline-offset-2 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {job.company.name}
            </Link>
            {city ? ` · ${city}` : ''}
            {cat ? ` · ${cat}` : ''}
            {` · ${publishedLabel} ${publishedMedium(job.publishedAt)}`}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {job.featured ? (
              <span className="rounded-full bg-featured-soft px-2.5 py-1 text-xs font-bold text-featured-soft-foreground">
                {tDetail('featuredBadge')}
              </span>
            ) : null}
            {job.applyMode === 'internal' ? (
              <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                {t('chipEasyApply')}
              </span>
            ) : null}
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {jobEnumLabel(tEnum, 'workModel', job.workModel)}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {jobEnumLabel(tEnum, 'employmentType', job.employmentType)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
