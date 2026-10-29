'use client';

import type { PublicJobListItem } from 'contracts';

import { ArrowUpRight, MapPin, Tag } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CompanyInitials } from '@/components/company-initials';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { publicJobUrlSegment } from '@/lib/job-public-segment';

import {
  localizedCategoryLine,
  localizedCityLine,
} from '../lib/bilingual-label';
import { jobEnumLabel } from '../lib/job-enum-label';

type Props = {
  job: PublicJobListItem;
  locale: string;
  spotlight?: boolean;
  featuredRibbonLabel?: string;
  isAuthenticated?: boolean;
};

export function PublicJobTeaserCard({
  job,
  locale,
  spotlight,
  featuredRibbonLabel,
  isAuthenticated = true,
}: Props) {
  const tEnum = useTranslations('Enums');
  const city = localizedCityLine(locale, job.city);
  const cat = localizedCategoryLine(locale, job.category);

  const isFeatured = Boolean(
    featuredRibbonLabel?.trim() && (spotlight || job.featured),
  );

  // `isAuthenticated` is false only under the full wall (`PUBLIC_JOBS=false`).
  const jobPath = `/jobs/${publicJobUrlSegment(job)}`;
  const href = isAuthenticated
    ? jobPath
    : `/sign-in?returnTo=${encodeURIComponent(`/${locale}${jobPath}`)}`;

  return (
    <Link
      href={href}
      locale={locale}
      className={cn(
        'hf-lift hf-reveal group flex h-full cursor-pointer flex-col rounded-[22px] border bg-card p-5 no-underline',
        isFeatured ? 'border-featured/60' : 'border-border',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <CompanyInitials name={job.company.name} />
        {isFeatured && featuredRibbonLabel ? (
          <span className="shrink-0 rounded-full bg-featured-soft px-2.5 py-1 text-xs font-bold text-featured-soft-foreground">
            {featuredRibbonLabel}
          </span>
        ) : (
          <span className="flex size-8 items-center justify-center rounded-full bg-accent text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <ArrowUpRight className="size-4" aria-hidden />
          </span>
        )}
      </div>

      <h3 className="m-0 mt-4 text-[1.1875rem] font-bold leading-snug text-foreground group-hover:text-primary">
        {job.title}
      </h3>
      <p className="m-0 mt-1 text-sm text-muted-foreground">
        {job.company.name}
        {city ? (
          <>
            {' · '}
            <MapPin className="inline size-3.5 align-[-2px]" aria-hidden />{' '}
            {city}
          </>
        ) : null}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
        <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
          {jobEnumLabel(tEnum, 'workModel', job.workModel)}
        </span>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {jobEnumLabel(tEnum, 'employmentType', job.employmentType)}
        </span>
        {cat ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <Tag className="size-3" aria-hidden />
            {cat}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
