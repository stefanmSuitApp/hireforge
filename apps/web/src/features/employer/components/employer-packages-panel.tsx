'use client';

import type { EmployerPackageCatalogItem } from 'contracts';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/ui/select';
import { Link, useRouter } from '@/i18n/navigation';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';
import { webHttp } from '@/lib/http/web-axios';

import { packageCardUpgradeRowsForPicker } from '../lib/package-card-upgrade-features';

type Props = {
  companyId: string;
  emailVerified: boolean;
  items: EmployerPackageCatalogItem[];
};

function pickDefaultPrice(pkg: EmployerPackageCatalogItem) {
  const eur = pkg.prices.find((p) => p.currency === 'EUR');
  return eur ?? pkg.prices[0];
}

function formatMinor(
  amountMinor: number,
  currency: string,
  locale: string,
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currency}`;
  }
}

export function EmployerPackagesPanel({
  companyId,
  emailVerified,
  items,
}: Props) {
  const t = useTranslations('Employer.packages');
  const tFeat = useTranslations('Employer.packages.upgradeFeatures');
  const tErrors = useTranslations('Errors');
  const locale = useLocale();
  const router = useRouter();
  const [selected, setSelected] = React.useState<
    Record<
      string,
      { durationDays: number; currency: string; amountMinor: number }
    >
  >(() => {
    const init: Record<
      string,
      { durationDays: number; currency: string; amountMinor: number }
    > = {};
    for (const it of items) {
      const d = pickDefaultPrice(it);
      init[it.code] = {
        durationDays: d.durationDays,
        currency: d.currency,
        amountMinor: d.amountMinor,
      };
    }
    return init;
  });
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [promoCode, setPromoCode] = React.useState('');

  async function subscribe(code: string, isEnterprise: boolean) {
    if (isEnterprise) return;
    if (!emailVerified) {
      setError(t('verifyToPurchase'));
      return;
    }
    const sel = selected[code];
    if (!sel) return;
    setBusy(code);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        companyId,
        packageCode: code,
        durationDays: sel.durationDays,
        currency: sel.currency,
      };
      const trimmedPromo = promoCode.trim().toUpperCase();
      if (trimmedPromo.length >= 4) {
        body['promoCode'] = trimmedPromo;
      }

      const { data } = await webHttp.post<{
        subscription: { id: string };
        proforma: { id: string };
      }>('/api/employer/subscriptions', body);
      void data.subscription.id;
      router.push(`/employer/billing/proforma/${data.proforma.id}`);
    } catch (e) {
      setError(getTranslatedApiErrorMessage(e, tErrors as ErrorsTranslator));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
        <Label htmlFor="promo" className="text-muted-foreground">
          {t('promoLabel')}
        </Label>
        <Input
          id="promo"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
          placeholder={t('promoPlaceholder')}
          className="mt-1 max-w-md bg-background font-mono uppercase"
          autoCapitalize="characters"
          spellCheck={false}
        />
        <p className="mt-1 text-xs text-muted-foreground">{t('promoHint')}</p>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div
        id="employer-package-cards"
        className="scroll-mt-24 grid gap-4 md:grid-cols-1"
      >
        {items.map((pkg) => {
          const cmsTitle =
            locale === 'en'
              ? (pkg.titleEn ?? pkg.titleSr)
              : (pkg.titleSr ?? pkg.titleEn);
          const title =
            cmsTitle && cmsTitle.trim().length > 0
              ? cmsTitle
              : t(`codes.${pkg.code}.title`);
          const cmsBlurb =
            locale === 'en'
              ? (pkg.marketingDescriptionEn ?? pkg.marketingDescriptionSr)
              : (pkg.marketingDescriptionSr ?? pkg.marketingDescriptionEn);
          const blurb =
            cmsBlurb && cmsBlurb.trim().length > 0
              ? cmsBlurb
              : t(`codes.${pkg.code}.blurb`);
          const sel = selected[pkg.code] ?? pickDefaultPrice(pkg);
          const priceOptions = pkg.prices;
          const isEnterprise = pkg.isEnterprise;
          const upgradeRows = packageCardUpgradeRowsForPicker(pkg);

          return (
            <Card key={pkg.code} className="p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between h-full">
                <div className="min-w-0 space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{blurb}</p>
                  <ul className="list-inside list-disc text-xs text-muted-foreground">
                    <li>
                      {t('featureMaxJobs', {
                        count: pkg.entitlements.max_active_jobs,
                      })}
                    </li>
                    <li>
                      {t('featureMaxCities', {
                        value:
                          pkg.entitlements.max_cities === 'unlimited'
                            ? t('unlimited')
                            : String(pkg.entitlements.max_cities),
                      })}
                    </li>
                  </ul>
                  {upgradeRows.length ? (
                    <ul className="mt-2 space-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
                      {upgradeRows.map((row) => {
                        const fk = row.featureKey;
                        const label = (tFeat as (key: string) => string)(
                          `${fk}.label`,
                        );
                        const cmsMsg =
                          locale === 'en'
                            ? (row.cmsMessageEn ?? row.cmsMessageSr)
                            : (row.cmsMessageSr ?? row.cmsMessageEn);
                        const body =
                          cmsMsg?.trim() ||
                          (tFeat as (key: string) => string)(
                            `${fk}.hintLocked`,
                          );
                        return (
                          <li key={row.featureKey}>
                            <span className="font-medium text-foreground/90">
                              {label}
                            </span>
                            {' — '}
                            {body}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                  <p className="text-xs">
                    <Link
                      href="/employer/packages#employer-package-cards"
                      locale={locale}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {t('compareFeatures')}
                    </Link>
                  </p>
                </div>
                <div className="flex w-full flex-col justify-between h-full border-t border-border pt-3 md:w-56 md:border-t-0 md:pl-4 md:pt-0">
                  <div>
                    <p className="text-lg font-bold tabular-nums text-right">
                      {isEnterprise
                        ? t('enterprisePrice')
                        : formatMinor(sel.amountMinor, sel.currency, locale)}
                    </p>
                    {/* Fixed slot so price + CTA align when this package has no duration picker */}
                    <div className="flex flex-col justify-start space-y-1">
                      {!isEnterprise && priceOptions.length > 1 ? (
                        <>
                          <Label className="text-xs">{t('durationLabel')}</Label>
                          <SelectField
                            options={priceOptions.map((p) => ({
                              value: `${String(p.durationDays)}|${p.currency}`,
                              label: `${p.durationDays} d — ${formatMinor(
                                p.amountMinor,
                                p.currency,
                                locale,
                              )}`,
                            }))}
                            value={`${String(sel.durationDays)}|${sel.currency}`}
                            onValueChange={(v) => {
                              const [d, c] = v.split('|');
                              const hit = pkg.prices.find(
                                (p) =>
                                  p.durationDays === Number(d) &&
                                  p.currency === c,
                              );
                              if (hit) {
                                setSelected((prev) => ({
                                  ...prev,
                                  [pkg.code]: {
                                    durationDays: hit.durationDays,
                                    currency: hit.currency,
                                    amountMinor: hit.amountMinor,
                                  },
                                }));
                              }
                            }}
                            classNames={{ trigger: 'h-9 w-full font-normal' }}
                          />
                        </>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    type="button"
                    size="sm"
                    disabled={isEnterprise || Boolean(busy) || !emailVerified}
                    onClick={() => void subscribe(pkg.code, isEnterprise)}
                  >
                    {busy === pkg.code
                      ? t('subscribing')
                      : isEnterprise
                        ? t('enterpriseCta')
                        : t('subscribe')}
                  </Button>
                  {!emailVerified && !isEnterprise ? (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      {t('verifyToPurchase')}
                    </p>
                  ) : null}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
