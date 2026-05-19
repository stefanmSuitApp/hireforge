'use client';

import type {
  AdminJobCategoryItem,
  PackageCode,
  PromoCodeResponse,
  PromoDiscountType,
} from 'contracts';
import { packageCodeSchema, packageCodes } from 'contracts';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import {
  getAdminPromoCodesList,
  patchAdminPromoCode,
  postAdminPromoCode,
} from '@/api/staff-client';
import {
  Button,
  Input,
  IsoDatePicker,
  Label,
  MultiCombobox,
  type ComboboxOption,
} from '@/components/ui';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';

type Props = {
  items: PromoCodeResponse[];
  categories: AdminJobCategoryItem[];
  locale: string;
};

function dateYmdFromIso(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function utcBoundaryIso(dateYmd: string, endOfDay: boolean): string | null {
  const v = dateYmd.trim();
  if (!v) return null;
  const [ys, ms, ds] = v.split('-');
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!y || !m || !d) return null;
  if (endOfDay) {
    return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999)).toISOString();
  }
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)).toISOString();
}

function normalizeApplicablePackagesForApi(
  codes: string[],
): PackageCode[] | null {
  const out: PackageCode[] = [];
  const seen = new Set<string>();
  for (const c of codes) {
    const r = packageCodeSchema.safeParse(c);
    if (r.success && !seen.has(r.data)) {
      seen.add(r.data);
      out.push(r.data);
    }
  }
  return out.length > 0 ? out : null;
}

function normalizeApplicableCategories(slugs: string[]): string[] | null {
  const cleaned = slugs.map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (cleaned.length === 0) return null;
  return cleaned;
}

function buildCategoryComboboxOptions(
  categories: AdminJobCategoryItem[],
  locale: string,
  extraSelectedSlugs: string[],
): ComboboxOption[] {
  const opts: ComboboxOption[] = categories.map((c) => ({
    value: c.slug,
    label:
      locale === 'en'
        ? (c.nameEn?.trim() || c.nameSr)
        : c.nameSr,
    keywords: [c.slug, c.nameSr, c.nameEn ?? ''].filter(Boolean),
  }));
  const known = new Set(opts.map((o) => o.value));
  for (const slug of extraSelectedSlugs) {
    if (slug && !known.has(slug)) {
      known.add(slug);
      opts.push({ value: slug, label: slug, keywords: [slug] });
    }
  }
  const collator = new Intl.Collator(locale === 'en' ? 'en' : 'sr-Latn');
  opts.sort((a, b) => collator.compare(a.label, b.label));
  return opts;
}

function multiSelectSummary(
  values: string[],
  options: ComboboxOption[],
  tMany: (count: number) => string,
): string {
  if (values.length === 0) return '';
  const labels = values.map(
    (s) => options.find((o) => o.value === s)?.label ?? s,
  );
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]}, ${labels[1]}`;
  return tMany(values.length);
}

function buildPackageComboboxOptions(
  packageLabels: Record<PackageCode, string>,
  locale: string,
): ComboboxOption[] {
  const collator = new Intl.Collator(locale === 'en' ? 'en' : 'sr-Latn');
  return [...packageCodes]
    .map((code) => ({
      value: code,
      label: packageLabels[code],
      keywords: [code, packageLabels[code]],
    }))
    .sort((a, b) => collator.compare(a.label, b.label));
}
export function AdminPromoCodesPanel({
  items: initial,
  categories,
  locale,
}: Props) {
  const t = useTranslations('Admin.promoCodes');
  const tEmployerPkg = useTranslations('Employer.packages');
  const tErrors = useTranslations('Errors');
  const [items, setItems] = React.useState(initial);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<string | null>(null);

  const [createCode, setCreateCode] = React.useState('');
  const [createDiscountType, setCreateDiscountType] =
    React.useState<PromoDiscountType>('percent');
  const [createValue, setCreateValue] = React.useState('0');
  const [createValidFrom, setCreateValidFrom] = React.useState('');
  const [createValidTo, setCreateValidTo] = React.useState('');
  const [createPackageCodes, setCreatePackageCodes] = React.useState<string[]>(
    [],
  );
  const [createCategorySlugs, setCreateCategorySlugs] = React.useState<
    string[]
  >([]);
  const [createMaxR, setCreateMaxR] = React.useState('');
  const [createMaxC, setCreateMaxC] = React.useState('');

  const [editId, setEditId] = React.useState<string | null>(null);
  const [editDiscountType, setEditDiscountType] =
    React.useState<PromoDiscountType>('percent');
  const [editValue, setEditValue] = React.useState('0');
  const [editValidFrom, setEditValidFrom] = React.useState('');
  const [editValidTo, setEditValidTo] = React.useState('');
  const [editPackageCodes, setEditPackageCodes] = React.useState<string[]>([]);
  const [editCategorySlugs, setEditCategorySlugs] = React.useState<string[]>(
    [],
  );
  const [editMaxR, setEditMaxR] = React.useState('');
  const [editMaxC, setEditMaxC] = React.useState('');

  function beginEdit(row: PromoCodeResponse) {
    setEditId(row.id);
    setEditDiscountType(row.discountType);
    setEditValue(String(row.value));
    setEditValidFrom(dateYmdFromIso(row.validFrom));
    setEditValidTo(dateYmdFromIso(row.validTo));
    setEditPackageCodes([...(row.applicablePackages ?? [])]);
    setEditCategorySlugs([...(row.applicableCategories ?? [])]);
    setEditMaxR(row.maxRedemptions != null ? String(row.maxRedemptions) : '');
    setEditMaxC(row.maxPerCompany != null ? String(row.maxPerCompany) : '');
    setError(null);
  }

  const categoryOptions = React.useMemo(
    () =>
      buildCategoryComboboxOptions(categories, locale, [
        ...createCategorySlugs,
        ...editCategorySlugs,
      ]),
    [categories, locale, createCategorySlugs, editCategorySlugs],
  );

  const packageLabelByCode = React.useMemo((): Record<PackageCode, string> => {
    const rec = {} as Record<PackageCode, string>;
    for (const code of packageCodes) {
      rec[code] = tEmployerPkg(`codes.${code}.title`);
    }
    return rec;
  }, [tEmployerPkg]);

  const packageOptions = React.useMemo(
    () => buildPackageComboboxOptions(packageLabelByCode, locale),
    [packageLabelByCode, locale],
  );

  const summarizeCategories = React.useCallback(
    (slugs: string[]) =>
      multiSelectSummary(slugs, categoryOptions, (n) =>
        t('categoriesSummaryMany', { count: n }),
      ),
    [categoryOptions, t],
  );

  const summarizePackages = React.useCallback(
    (codes: string[]) =>
      multiSelectSummary(codes, packageOptions, (n) =>
        t('packagesSummaryMany', { count: n }),
      ),
    [packageOptions, t],
  );

  async function refreshList() {
    const data = await getAdminPromoCodesList();
    setItems(data.items);
  }

  async function onCreate(e: React.SyntheticEvent) {
    e.preventDefault();
    setPending('create');
    setError(null);
    try {
      const applicablePackages =
        normalizeApplicablePackagesForApi(createPackageCodes) ?? undefined;
      const applicableCategories =
        normalizeApplicableCategories(createCategorySlugs);

      const parsedValue = Number(createValue);
      await postAdminPromoCode({
        code: createCode.trim().toUpperCase(),
        discountType: createDiscountType,
        value:
          createDiscountType === 'full_free'
            ? 0
            : Number.isFinite(parsedValue)
              ? Math.max(0, Math.floor(parsedValue))
              : 0,
        validFrom: utcBoundaryIso(createValidFrom, false) ?? undefined,
        validTo: utcBoundaryIso(createValidTo, true) ?? undefined,
        applicablePackages,
        applicableCategories,
        maxRedemptions: createMaxR.trim()
          ? Number(createMaxR)
          : undefined,
        maxPerCompany: createMaxC.trim()
          ? Number(createMaxC)
          : undefined,
      });
      setCreateCode('');
      setCreateDiscountType('percent');
      setCreateValue('0');
      setCreateValidFrom('');
      setCreateValidTo('');
      setCreatePackageCodes([]);
      setCreateCategorySlugs([]);
      setCreateMaxR('');
      setCreateMaxC('');
      await refreshList();
    } catch (err) {
      setError(getTranslatedApiErrorMessage(err, tErrors as ErrorsTranslator));
    } finally {
      setPending(null);
    }
  }

  async function onPatch(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!editId) return;
    setPending('patch');
    setError(null);
    try {
      const applicablePackages =
        normalizeApplicablePackagesForApi(editPackageCodes);
      const applicableCategories =
        normalizeApplicableCategories(editCategorySlugs);

      const parsedValue = Number(editValue);
      await patchAdminPromoCode(editId, {
        discountType: editDiscountType,
        value:
          editDiscountType === 'full_free'
            ? 0
            : Number.isFinite(parsedValue)
              ? Math.max(0, Math.floor(parsedValue))
              : 0,
        validFrom: utcBoundaryIso(editValidFrom, false),
        validTo: utcBoundaryIso(editValidTo, true),
        applicablePackages,
        applicableCategories,
        maxRedemptions: editMaxR.trim() ? Number(editMaxR) : null,
        maxPerCompany: editMaxC.trim() ? Number(editMaxC) : null,
      });
      setEditId(null);
      await refreshList();
    } catch (err) {
      setError(getTranslatedApiErrorMessage(err, tErrors as ErrorsTranslator));
    } finally {
      setPending(null);
    }
  }

  const editingRow = editId ? items.find((x) => x.id === editId) : undefined;

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-border/70 bg-background p-5">
        <h3 className="text-base font-semibold text-foreground">
          {t('createHeading')}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{t('dateHint')}</p>
        <form onSubmit={onCreate} className="mt-4 max-w-xl space-y-3">
          <div className="space-y-1">
            <Label htmlFor="promo-code">{t('fieldCode')}</Label>
            <Input
              id="promo-code"
              value={createCode}
              onChange={(e) => setCreateCode(e.target.value)}
              className="font-mono uppercase"
              required
              maxLength={32}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="promo-discount">{t('fieldDiscountType')}</Label>
              <select
                id="promo-discount"
                className="flex h-10 w-full rounded-[var(--radius-3xl,1.125rem)] border border-input bg-background px-3 py-2 text-sm"
                value={createDiscountType}
                onChange={(e) =>
                  setCreateDiscountType(e.target.value as PromoDiscountType)
                }
              >
                <option value="percent">{t('discountPercent')}</option>
                <option value="fixed">{t('discountFixed')}</option>
                <option value="full_free">{t('discountFullFree')}</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="promo-value">{t('fieldValue')}</Label>
              <Input
                id="promo-value"
                type="number"
                min={0}
                disabled={createDiscountType === 'full_free'}
                value={createValue}
                onChange={(e) => setCreateValue(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t('fieldValidFrom')}</Label>
              <IsoDatePicker
                value={createValidFrom}
                onChange={setCreateValidFrom}
                placeholder={t('pickDate')}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('fieldValidTo')}</Label>
              <IsoDatePicker
                value={createValidTo}
                onChange={setCreateValidTo}
                placeholder={t('pickDate')}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="promo-packages">{t('fieldPackages')}</Label>
            <p className="text-xs text-muted-foreground">
              {t('fieldPackagesHint')}
            </p>
            <MultiCombobox
              id="promo-packages"
              values={createPackageCodes}
              onValuesChange={setCreatePackageCodes}
              options={packageOptions}
              placeholder={t('packagesPlaceholder')}
              triggerLabel={summarizePackages(createPackageCodes)}
              searchPlaceholder={t('packagesSearch')}
              emptyText={t('packagesEmpty')}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="promo-categories">{t('fieldCategories')}</Label>
            <p className="text-xs text-muted-foreground">
              {t('fieldCategoriesHint')}
            </p>
            <MultiCombobox
              id="promo-categories"
              values={createCategorySlugs}
              onValuesChange={setCreateCategorySlugs}
              options={categoryOptions}
              placeholder={t('categoriesPlaceholder')}
              triggerLabel={summarizeCategories(createCategorySlugs)}
              searchPlaceholder={t('categoriesSearch')}
              emptyText={t('categoriesEmpty')}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="promo-max-r">{t('fieldMaxRedemptions')}</Label>
              <Input
                id="promo-max-r"
                type="number"
                min={1}
                value={createMaxR}
                onChange={(e) => setCreateMaxR(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="promo-max-c">{t('fieldMaxPerCompany')}</Label>
              <Input
                id="promo-max-c"
                type="number"
                min={1}
                value={createMaxC}
                onChange={(e) => setCreateMaxC(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" disabled={pending === 'create'}>
            {pending === 'create' ? t('creating') : t('create')}
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-border/70 bg-background p-5">
        <h3 className="text-base font-semibold text-foreground">
          {t('listHeading')}
        </h3>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">{t('colCode')}</th>
                <th className="px-3 py-2 font-medium">{t('colType')}</th>
                <th className="px-3 py-2 font-medium">{t('colValue')}</th>
                <th className="px-3 py-2 font-medium">{t('colRedemptions')}</th>
                <th className="px-3 py-2 font-medium">{t('colWindow')}</th>
                <th className="px-3 py-2 font-medium">{''}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{row.code}</td>
                  <td className="px-3 py-2">{row.discountType}</td>
                  <td className="px-3 py-2 tabular-nums">{row.value}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {row.redemptionsCount}
                    {row.maxRedemptions != null
                      ? ` / ${row.maxRedemptions}`
                      : ''}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {dateYmdFromIso(row.validFrom) || '—'} →{' '}
                    {dateYmdFromIso(row.validTo) || '—'}
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => beginEdit(row)}
                    >
                      {t('edit')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editingRow ? (
        <section className="rounded-2xl border border-border/70 bg-background p-5">
          <h3 className="text-base font-semibold text-foreground">
            {t('editHeading', { code: editingRow.code })}
          </h3>
          <form onSubmit={onPatch} className="mt-4 max-w-xl space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="edit-discount">{t('fieldDiscountType')}</Label>
                <select
                  id="edit-discount"
                  className="flex h-10 w-full rounded-[var(--radius-3xl,1.125rem)] border border-input bg-background px-3 py-2 text-sm"
                  value={editDiscountType}
                  onChange={(e) =>
                    setEditDiscountType(e.target.value as PromoDiscountType)
                  }
                >
                  <option value="percent">{t('discountPercent')}</option>
                  <option value="fixed">{t('discountFixed')}</option>
                  <option value="full_free">{t('discountFullFree')}</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-value">{t('fieldValue')}</Label>
                <Input
                  id="edit-value"
                  type="number"
                  min={0}
                  disabled={editDiscountType === 'full_free'}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>{t('fieldValidFrom')}</Label>
                <IsoDatePicker
                  value={editValidFrom}
                  onChange={setEditValidFrom}
                  placeholder={t('pickDate')}
                />
              </div>
              <div className="space-y-1">
                <Label>{t('fieldValidTo')}</Label>
                <IsoDatePicker
                  value={editValidTo}
                  onChange={setEditValidTo}
                  placeholder={t('pickDate')}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-packages">{t('fieldPackages')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('fieldPackagesHint')}
              </p>
              <MultiCombobox
                id="edit-packages"
                values={editPackageCodes}
                onValuesChange={setEditPackageCodes}
                options={packageOptions}
                placeholder={t('packagesPlaceholder')}
                triggerLabel={summarizePackages(editPackageCodes)}
                searchPlaceholder={t('packagesSearch')}
                emptyText={t('packagesEmpty')}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-categories">{t('fieldCategories')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('fieldCategoriesHint')}
              </p>
              <MultiCombobox
                id="edit-categories"
                values={editCategorySlugs}
                onValuesChange={setEditCategorySlugs}
                options={categoryOptions}
                placeholder={t('categoriesPlaceholder')}
                triggerLabel={summarizeCategories(editCategorySlugs)}
                searchPlaceholder={t('categoriesSearch')}
                emptyText={t('categoriesEmpty')}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="edit-max-r">{t('fieldMaxRedemptions')}</Label>
                <Input
                  id="edit-max-r"
                  type="number"
                  min={1}
                  value={editMaxR}
                  onChange={(e) => setEditMaxR(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-max-c">{t('fieldMaxPerCompany')}</Label>
                <Input
                  id="edit-max-c"
                  type="number"
                  min={1}
                  value={editMaxC}
                  onChange={(e) => setEditMaxC(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={pending === 'patch'}>
                {pending === 'patch' ? t('saving') : t('save')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditId(null)}
              >
                {t('cancel')}
              </Button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
