'use client';

import {
  campaignWindow,
  type CampaignDiscountType,
  type CampaignResponse,
  type PackageCode,
} from 'contracts';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import {
  getAdminCampaigns,
  patchAdminCampaign,
  postAdminCampaign,
} from '@/api/staff-client';
import { Button, Input, IsoDatePicker, Label } from '@/components/ui';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';

/** Self-service packages; GAZDA is never sold at checkout. */
const PACKAGES: PackageCode[] = ['tezga', 'sljaka', 'sef'];

type LengthChoice = 'weekend' | 'week' | 'days';
type Status = 'scheduled' | 'running' | 'paused' | 'ended';

function statusOf(c: CampaignResponse, now: number): Status {
  if (!c.isActive) return 'paused';
  if (now < Date.parse(c.validFrom)) return 'scheduled';
  if (now > Date.parse(c.validTo)) return 'ended';
  return 'running';
}

function todayInBelgrade(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Belgrade',
  }).format(new Date());
}

export function AdminCampaignsPanel({
  items: initial,
  locale,
}: {
  items: CampaignResponse[];
  locale: string;
}) {
  const t = useTranslations('Admin.campaigns');
  const tErrors = useTranslations('Errors');
  const [items, setItems] = React.useState(initial);
  const [discountType, setDiscountType] =
    React.useState<CampaignDiscountType>('full_free');
  const [percent, setPercent] = React.useState('20');
  const [start, setStart] = React.useState(todayInBelgrade);
  const [lengthChoice, setLengthChoice] = React.useState<LengthChoice>('week');
  const [days, setDays] = React.useState('3');
  const [packages, setPackages] = React.useState<PackageCode[]>([]);
  const [bannerSr, setBannerSr] = React.useState('');
  const [bannerEn, setBannerEn] = React.useState('');
  const [maxRedemptions, setMaxRedemptions] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const when = new Intl.DateTimeFormat(
    locale === 'sr' ? 'sr-Latn-RS' : 'en-GB',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Europe/Belgrade',
    },
  );
  const window = start
    ? campaignWindow(
        start,
        lengthChoice === 'weekend'
          ? { kind: 'weekend' }
          : {
              kind: 'days',
              days:
                lengthChoice === 'week' ? 7 : Math.max(1, Number(days) || 1),
            },
      )
    : null;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setItems((await getAdminCampaigns()).items);
    } catch (e) {
      setError(getTranslatedApiErrorMessage(e, tErrors as ErrorsTranslator));
    } finally {
      setBusy(false);
    }
  }

  function create(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!window) return;
    void run(() =>
      postAdminCampaign({
        discountType,
        value: discountType === 'percent' ? Number(percent) : 0,
        validFrom: window.validFrom,
        validTo: window.validTo,
        applicablePackages: packages.length ? packages : null,
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
        bannerSr: bannerSr.trim() || null,
        bannerEn: bannerEn.trim() || null,
      }),
    );
  }

  const now = Date.now();

  return (
    <div className="space-y-8">
      <form
        onSubmit={create}
        className="space-y-5"
        aria-label={t('createHeading')}
      >
        <h3 className="m-0 text-base font-semibold">{t('createHeading')}</h3>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t('fieldDiscount')}</legend>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="discount"
                checked={discountType === 'full_free'}
                onChange={() => setDiscountType('full_free')}
              />
              {t('discountFree')}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="discount"
                checked={discountType === 'percent'}
                onChange={() => setDiscountType('percent')}
              />
              {t('discountPercent')}
            </label>
            {discountType === 'percent' ? (
              <Input
                aria-label={t('fieldPercent')}
                type="number"
                min={1}
                max={100}
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                className="w-24"
              />
            ) : null}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>{t('fieldStart')}</Label>
            <IsoDatePicker
              value={start}
              onChange={setStart}
              placeholder={t('pickDate')}
              allowClear={false}
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t('fieldLength')}</legend>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {(['weekend', 'week', 'days'] as const).map((choice) => (
                <label key={choice} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="length"
                    checked={lengthChoice === choice}
                    onChange={() => setLengthChoice(choice)}
                  />
                  {t(`length.${choice}`)}
                </label>
              ))}
              {lengthChoice === 'days' ? (
                <Input
                  aria-label={t('fieldDays')}
                  type="number"
                  min={1}
                  max={90}
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="w-24"
                />
              ) : null}
            </div>
          </fieldset>
        </div>
        {window ? (
          <p
            className="m-0 text-sm text-muted-foreground"
            data-testid="campaign-window"
          >
            {t('windowPreview', {
              from: when.format(new Date(window.validFrom)),
              to: when.format(new Date(window.validTo)),
            })}
          </p>
        ) : null}

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t('fieldPackages')}</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            {PACKAGES.map((code) => (
              <label key={code} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={packages.includes(code)}
                  onChange={(e) =>
                    setPackages((prev) =>
                      e.target.checked
                        ? [...prev, code]
                        : prev.filter((p) => p !== code),
                    )
                  }
                />
                {code.toUpperCase()}
              </label>
            ))}
          </div>
          <p className="m-0 text-xs text-muted-foreground">
            {t('fieldPackagesHint')}
          </p>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="campaign-banner-sr">{t('fieldBannerSr')}</Label>
            <Input
              id="campaign-banner-sr"
              value={bannerSr}
              maxLength={200}
              onChange={(e) => setBannerSr(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="campaign-banner-en">{t('fieldBannerEn')}</Label>
            <Input
              id="campaign-banner-en"
              value={bannerEn}
              maxLength={200}
              onChange={(e) => setBannerEn(e.target.value)}
            />
          </div>
        </div>
        <p className="m-0 text-xs text-muted-foreground">{t('bannerHint')}</p>

        <div className="space-y-1 sm:w-60">
          <Label htmlFor="campaign-max">{t('fieldMaxRedemptions')}</Label>
          <Input
            id="campaign-max"
            type="number"
            min={1}
            value={maxRedemptions}
            onChange={(e) => setMaxRedemptions(e.target.value)}
          />
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={busy || !window}>
          {t('createSubmit')}
        </Button>
      </form>

      <section className="space-y-3">
        <h3 className="m-0 text-base font-semibold">{t('listHeading')}</h3>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {items.map((c) => {
              const status = statusOf(c, now);
              return (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 px-4 py-3 text-sm"
                >
                  <span className="font-medium">
                    {c.discountType === 'full_free'
                      ? t('discountFree')
                      : `−${c.value}%`}
                  </span>
                  <span className="text-muted-foreground">
                    {when.format(new Date(c.validFrom))} –{' '}
                    {when.format(new Date(c.validTo))}
                  </span>
                  <span className="text-muted-foreground">
                    {c.applicablePackages?.length
                      ? c.applicablePackages.join(', ').toUpperCase()
                      : t('allPackages')}
                  </span>
                  <span className="text-muted-foreground">
                    {t('redemptions', { n: c.redemptionsCount })}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {t(`status.${status}`)}
                  </span>
                  {status !== 'ended' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-auto"
                      disabled={busy}
                      onClick={() =>
                        void run(() =>
                          patchAdminCampaign(c.id, { isActive: !c.isActive }),
                        )
                      }
                    >
                      {c.isActive ? t('pause') : t('resume')}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
