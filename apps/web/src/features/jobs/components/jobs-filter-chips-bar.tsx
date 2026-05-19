'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';

import { humanizeEnum } from '../lib/humanize-enum';
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

export function JobsFilterChipsBar() {
  const t = useTranslations('Jobs');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function push(patch: Record<string, string | undefined>) {
    const n = mergeJobsSearchParams(searchParams, patch);
    router.replace(`${pathname}?${n.toString()}`, { scroll: false });
  }

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

  return (
    <div className="mb-4 space-y-3 border-b border-gray-200 pb-4">
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
              className="h-8 rounded-full px-2.5 text-xs"
              onClick={() => push({ workModel: wm === v ? undefined : v })}
            >
              {humanizeEnum(v)}
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
              className="h-8 rounded-full px-2.5 text-xs"
              onClick={() => push({ employmentType: et === v ? undefined : v })}
            >
              {humanizeEnum(v)}
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
              className="h-8 rounded-full px-2.5 text-xs"
              onClick={() => push({ postedWithin: pw === v ? undefined : v })}
            >
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
          className="h-8 rounded-full px-2.5 text-xs"
          onClick={() => push({ easyApply: ez ? undefined : '1' })}
        >
          {t('chipEasyApply')}
        </Button>
      </div>
    </div>
  );
}
