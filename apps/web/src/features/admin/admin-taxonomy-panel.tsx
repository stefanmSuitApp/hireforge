'use client';

import type { AdminJobCategoryItem } from 'contracts';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import {
  deleteAdminJobCategory,
  postAdminJobCategory,
} from '@/api/staff-client';
import { Button, Input, Label } from '@/components/ui';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';

type Props = { categories: AdminJobCategoryItem[] };

export function AdminTaxonomyPanel({ categories: initial }: Props) {
  const t = useTranslations('Admin.taxonomy');
  const tErrors = useTranslations('Errors');
  const [categories, setCategories] = React.useState(initial);
  const [slug, setSlug] = React.useState('');
  const [nameSr, setNameSr] = React.useState('');
  const [nameEn, setNameEn] = React.useState('');
  const [pending, setPending] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function onCreate(e: React.SyntheticEvent) {
    e.preventDefault();
    setPending('create');
    setError(null);
    try {
      const res = await postAdminJobCategory({
        slug: slug.trim().toLowerCase(),
        nameSr: nameSr.trim(),
        nameEn: nameEn.trim() || undefined,
      });
      setCategories((c) => [
        ...c,
        {
          id: res.id,
          slug: slug.trim().toLowerCase(),
          nameSr: nameSr.trim(),
          nameEn: nameEn.trim() || null,
          createdAt: new Date().toISOString(),
        },
      ]);
      setSlug('');
      setNameSr('');
      setNameEn('');
    } catch (err) {
      setError(getTranslatedApiErrorMessage(err, tErrors as ErrorsTranslator));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-border/70 bg-background p-5">
        <h2 className="text-lg font-semibold text-foreground">
          {t('createHeading')}
        </h2>
        <form onSubmit={onCreate} className="mt-4 max-w-xl space-y-3">
          <div className="space-y-1">
            <Label htmlFor="cat-slug">{t('slug')}</Label>
            <Input
              id="cat-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="font-mono"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cat-sr">{t('nameSr')}</Label>
            <Input
              id="cat-sr"
              value={nameSr}
              onChange={(e) => setNameSr(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cat-en">{t('nameEn')}</Label>
            <Input
              id="cat-en"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={pending === 'create'}>
            {pending === 'create' ? t('creating') : t('create')}
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-border/70 bg-background p-5">
        <h2 className="text-lg font-semibold text-foreground">
          {t('listHeading')}
        </h2>
        <ul className="mt-4 divide-y divide-border rounded-xl border border-border/70">
          {categories.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-foreground">{c.nameSr}</p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-mono">{c.slug}</span>
                  {c.nameEn ? ` · ${c.nameEn}` : null}
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={pending === c.id}
                onClick={async () => {
                  if (!globalThis.confirm(t('deleteConfirm'))) return;
                  setPending(c.id);
                  setError(null);
                  try {
                    await deleteAdminJobCategory(c.id);
                    setCategories((prev) => prev.filter((x) => x.id !== c.id));
                  } catch (err) {
                    setError(
                      getTranslatedApiErrorMessage(
                        err,
                        tErrors as ErrorsTranslator,
                      ),
                    );
                  } finally {
                    setPending(null);
                  }
                }}
              >
                {pending === c.id ? t('deleting') : t('delete')}
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
