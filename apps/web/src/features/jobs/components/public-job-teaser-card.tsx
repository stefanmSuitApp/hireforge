'use client';

import type { PublicJobListItem } from 'contracts';

import { ArrowUpRight, Lock, MapPin, Tag } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { publicJobCardHref } from '@/lib/job-public-segment';

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
  const t = useTranslations('Jobs');
  const tEnum = useTranslations('Enums');
  const city = localizedCityLine(locale, job.city);
  const cat = localizedCategoryLine(locale, job.category);

  const isFeatured = Boolean(
    featuredRibbonLabel?.trim() && (spotlight || job.featured),
  );

  const href = publicJobCardHref(
    { ...job, locked: job.locked || !isAuthenticated },
    locale,
  );

  return (
    <Link
      href={href}
      locale={locale}
      className={cn(
        'group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card no-underline transition-all duration-250',
        'hf-primary-glow-hover',
        isFeatured
          ? 'border-primary/40 ring-1 ring-primary/20'
          : 'border-border/60',
      )}
    >
      {/* Top accent bar */}
      <div
        className={cn(
          'h-1.5 w-full',
          isFeatured ? 'bg-primary' : 'bg-muted/60',
        )}
        aria-hidden
      />

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          {job.company ? (
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {job.company.name}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <Lock className="size-3" aria-hidden />
              {t('lockedCompany')}
            </span>
          )}
          {isFeatured && featuredRibbonLabel && (
            <span className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
              {featuredRibbonLabel}
            </span>
          )}
        </div>

        <h3 className="m-0 mb-3 text-[1.0625rem] font-bold leading-snug text-foreground group-hover:text-primary">
          {job.title}
        </h3>

        <p className="m-0 mb-3 text-xs text-muted-foreground">
          {jobEnumLabel(tEnum, 'workModel', job.workModel)} ·{' '}
          {jobEnumLabel(tEnum, 'employmentType', job.employmentType)}
        </p>

        <div className="mt-auto flex items-end justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {city && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted/80 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <MapPin className="size-3" aria-hidden />
                {city}
              </span>
            )}
            {cat && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted/80 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <Tag className="size-3" aria-hidden />
                {cat}
              </span>
            )}
          </div>

          <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <ArrowUpRight className="size-4" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
