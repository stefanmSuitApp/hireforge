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
import { cn } from '@/lib/cn';
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

type Patch = Record<string, string | undefined>;

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
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {signInSheet}
        <Button
          type="button"
          variant="outline"
          className="hf-press min-h-11 rounded-full bg-card px-[18px] font-semibold"
          onClick={() => setPendingFilter({})}
        >
          <Lock className="size-4" aria-hidden />
          {t('guestMoreFilters')}
        </Button>
        <span className="text-sm text-muted-foreground">
          {t('guestMoreFiltersHint')}
        </span>
      </div>
    );
  }

  const rows: Array<{
    label: string;
    chips: Array<{ key: string; label: string; on: boolean; patch: Patch }>;
  }> = [
    {
      label: t('chipWorkModel'),
      chips: WORK_MODELS.map((v) => ({
        key: v,
        label: jobEnumLabel(tEnum, 'workModel', v),
        on: wm === v,
        patch: { workModel: wm === v ? undefined : v },
      })),
    },
    {
      label: t('chipEmploymentType'),
      chips: EMP_TYPES.map((v) => ({
        key: v,
        label: jobEnumLabel(tEnum, 'employmentType', v),
        on: et === v,
        patch: { employmentType: et === v ? undefined : v },
      })),
    },
    {
      label: t('chipPostedWithin'),
      chips: POSTED.map((v) => ({
        key: v,
        label:
          v === '1d'
            ? t('posted1d')
            : v === '7d'
              ? t('posted7d')
              : t('posted30d'),
        on: pw === v,
        patch: { postedWithin: pw === v ? undefined : v },
      })),
    },
    {
      label: t('chipApplyRow'),
      chips: [
        {
          key: 'easyApply',
          label: t('chipEasyApply'),
          on: ez,
          patch: { easyApply: ez ? undefined : '1' },
        },
      ],
    },
  ];

  return (
    <div className="rounded-[22px] border border-border bg-card px-5 py-4">
      {signInSheet}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
          {t('filtersChipBarLabel')}
        </span>
        <span className="flex flex-wrap gap-1">
          {hasChipFilters || hasTextFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hf-press rounded-full font-semibold text-primary"
              onClick={() => clearAllFilters()}
            >
              {t('chipClearAll')}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hf-press rounded-full font-semibold text-primary"
            onClick={() => void saveAlert()}
          >
            {t('jobAlertCreate')}
          </Button>
        </span>
      </div>

      {rows.map((row) => (
        <div
          key={row.label}
          className="mt-3 flex flex-wrap items-center gap-2"
          role="group"
          aria-label={row.label}
        >
          <span className="w-full text-sm text-muted-foreground sm:w-auto sm:min-w-28">
            {row.label}
          </span>
          {row.chips.map((chip) => (
            <Button
              key={chip.key}
              type="button"
              variant={chip.on ? 'default' : 'outline'}
              aria-pressed={chip.on}
              className={cn(
                'hf-press min-h-11 rounded-full px-3.5 text-sm md:min-h-10',
                chip.on ? 'font-semibold' : 'bg-card font-medium',
              )}
              onClick={() => choose(chip.patch)}
            >
              {lockIcon}
              {chip.label}
            </Button>
          ))}
        </div>
      ))}
    </div>
  );
}
