'use client';

import { Lock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';

import { jobEnumLabel } from '../lib/job-enum-label';
import {
  JOBS_LIST_PAGE_SIZE,
  mergeJobsSearchParams,
} from '../lib/jobs-list-query';

const WORK_MODELS = ['onsite', 'remote', 'hybrid'] as const;
const EMP_TYPES = [
  'full_time',
  'part_time',
  'contract',
  'internship',
  'temporary',
] as const;
const POSTED = ['1d', '7d', '30d'] as const;

type Props = {
  /** Not signed in: these filters ask for an account (option B). */
  guest?: boolean;
};

export function JobsFilterChipsBar({ guest = false }: Props) {
  const t = useTranslations('Jobs');
  const tEnum = useTranslations('Enums');
  const tNav = useTranslations('Nav');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  /** The filter a guest picked; signing in comes back with it applied. */
  const [pendingFilter, setPendingFilter] = React.useState<Record<
    string,
    string | undefined
  > | null>(null);

  function push(patch: Record<string, string | undefined>) {
    const n = mergeJobsSearchParams(searchParams, patch);
    router.replace(`${pathname}?${n.toString()}`, { scroll: false });
  }

  function choose(patch: Record<string, string | undefined>) {
    if (guest) setPendingFilter(patch);
    else push(patch);
  }

  const pendingReturnTo = pendingFilter
    ? encodeURIComponent(
        `/${locale}${pathname}?${mergeJobsSearchParams(searchParams, pendingFilter).toString()}`,
      )
    : '';
  const lockIcon = guest ? <Lock className="size-3" aria-hidden /> : null;

  const wm = searchParams.get('workModel') ?? '';
  const et = searchParams.get('employmentType') ?? '';
  const pw = searchParams.get('postedWithin') ?? '';
  const ez =
    searchParams.get('easyApply') === '1' ||
    searchParams.get('easyApply') === 'true';

  async function saveAlert() {
    const query: Record<string, string> = {};
    searchParams.forEach((v, k) => {
      if (k === 'job') return;
      query[k] = v;
    });
    try {
      const res = await fetch('/api/candidate/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (res.status === 401) {
        toast.error(t('saveJobLogin'));
        return;
      }
      if (!res.ok) {
        toast.error(t('jobAlertError'));
        return;
      }
      toast.success(t('jobAlertSaved'));
    } catch {
      toast.error(t('jobAlertError'));
    }
  }

  const hasChipFilters = Boolean(wm) || Boolean(et) || Boolean(pw) || ez;
  const hasTextFilters =
    Boolean(searchParams.get('q')?.trim()) ||
    Boolean(searchParams.get('city')) ||
    Boolean(searchParams.get('category'));

  function clearAllFilters() {
    router.replace(
      `${pathname}?page=1&pageSize=${searchParams.get('pageSize') ?? String(JOBS_LIST_PAGE_SIZE)}`,
      { scroll: false },
    );
  }

  const signInSheet = (
    <Sheet
      open={pendingFilter !== null}
      onOpenChange={(open) => {
        if (!open) setPendingFilter(null);
      }}
    >
      <SheetContent side="bottom" closeLabel={tNav('closeMenu')}>
        <SheetTitle className="pr-12">{t('guestFiltersTitle')}</SheetTitle>
        <SheetDescription className="m-0 text-sm text-muted-foreground">
          {t('guestBrowseBody')}
        </SheetDescription>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/sign-in?returnTo=${pendingReturnTo}`}
            className={buttonVariants({ size: 'lg' })}
          >
            {t('guestSignIn')}
          </Link>
          <Link
            href={`/candidate/register?returnTo=${pendingReturnTo}`}
            className={buttonVariants({ size: 'lg', variant: 'outline' })}
          >
            {t('guestRegister')}
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );

  // Guests: one locked button instead of a dozen locked chips (Stefan,
  // 2026-10-29); signing in comes back to the same search.
  if (guest) {
    return (
      <div className="border-b border-border pb-4">
        {signInSheet}
        <Button
          type="button"
          variant="outline"
          className="min-h-11 rounded-full px-4 md:h-9 md:min-h-0"
          onClick={() => setPendingFilter({})}
        >
          <Lock className="size-3.5" aria-hidden />
          {t('guestMoreFilters')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-b border-border pb-4">
      {signInSheet}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('filtersChipBarLabel')}
        </span>
        {hasChipFilters || hasTextFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => clearAllFilters()}
          >
            {t('chipClearAll')}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => void saveAlert()}
        >
          {t('jobAlertCreate')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-y-2 gap-x-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {t('chipWorkModel')}:
          </span>
          {WORK_MODELS.map((v) => (
            <Button
              key={v}
              type="button"
              size="sm"
              variant={wm === v ? 'default' : 'outline'}
              aria-pressed={wm === v}
              className="min-h-11 rounded-full px-3 text-sm md:h-8 md:min-h-0 md:px-2.5 md:text-xs"
              onClick={() => choose({ workModel: wm === v ? undefined : v })}
            >
              {lockIcon}
              {jobEnumLabel(tEnum, 'workModel', v)}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {t('chipEmploymentType')}:
          </span>
          {EMP_TYPES.map((v) => (
            <Button
              key={v}
              type="button"
              size="sm"
              variant={et === v ? 'default' : 'outline'}
              aria-pressed={et === v}
              className="min-h-11 rounded-full px-3 text-sm md:h-8 md:min-h-0 md:px-2.5 md:text-xs"
              onClick={() =>
                choose({ employmentType: et === v ? undefined : v })
              }
            >
              {lockIcon}
              {jobEnumLabel(tEnum, 'employmentType', v)}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {t('chipPostedWithin')}:
          </span>
          {POSTED.map((v) => (
            <Button
              key={v}
              type="button"
              size="sm"
              variant={pw === v ? 'default' : 'outline'}
              aria-pressed={pw === v}
              className="min-h-11 rounded-full px-3 text-sm md:h-8 md:min-h-0 md:px-2.5 md:text-xs"
              onClick={() => choose({ postedWithin: pw === v ? undefined : v })}
            >
              {lockIcon}
              {v === '1d'
                ? t('posted1d')
                : v === '7d'
                  ? t('posted7d')
                  : t('posted30d')}
            </Button>
          ))}
        </div>

        <Button
          type="button"
          size="sm"
          variant={ez ? 'default' : 'outline'}
          aria-pressed={ez}
          className="min-h-11 rounded-full px-3 text-sm md:h-8 md:min-h-0 md:px-2.5 md:text-xs"
          onClick={() => choose({ easyApply: ez ? undefined : '1' })}
        >
          {lockIcon}
          {t('chipEasyApply')}
        </Button>
      </div>
    </div>
  );
}
