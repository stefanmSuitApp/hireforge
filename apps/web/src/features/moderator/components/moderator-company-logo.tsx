'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import {
  deleteStaffCompanyLogo,
  postStaffCompanyLogo,
} from '@/api/staff-client';
import { Button, Label } from '@/components/ui';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';

/** Staff add the company's logo (companies don't manage their own). */
export function ModeratorCompanyLogo({
  companyId,
  logoUrl: initialUrl,
}: {
  companyId: string;
  logoUrl: string | null;
}) {
  const t = useTranslations('Moderator.companies.logo');
  const tErrors = useTranslations('Errors');
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState(initialUrl);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(call: () => Promise<string | null>) {
    setPending(true);
    setError(null);
    try {
      setLogoUrl(await call());
      router.refresh();
    } catch (err) {
      setError(getTranslatedApiErrorMessage(err, tErrors as ErrorsTranslator));
    } finally {
      setPending(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <h3 className="text-base font-semibold text-foreground">
        {t('heading')}
      </h3>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/40">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={t('current')}
              className="size-full object-contain"
            />
          ) : (
            <span className="px-2 text-center text-xs text-muted-foreground">
              {t('none')}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="company-logo-file"
            className="inline-flex h-9 cursor-pointer items-center rounded-full border border-border px-4 text-sm font-medium hover:bg-muted/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
          >
            {pending ? t('uploading') : t('upload')}
            <input
              id="company-logo-file"
              ref={input}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              disabled={pending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  void run(
                    async () =>
                      (await postStaffCompanyLogo(companyId, file)).logoUrl,
                  );
                }
              }}
            />
          </Label>
          {logoUrl ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  await deleteStaffCompanyLogo(companyId);
                  return null;
                })
              }
            >
              {t('remove')}
            </Button>
          ) : null}
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-muted-foreground">{t('hint')}</p>
    </section>
  );
}
