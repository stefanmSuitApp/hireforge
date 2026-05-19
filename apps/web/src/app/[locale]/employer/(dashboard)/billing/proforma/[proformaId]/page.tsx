import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Link } from '@/i18n/navigation';
import { loadEmployerSessionOrRedirect } from '@/lib/employer-workspace-load';
import { fetchEmployerProforma } from '@/lib/fetch-employer-catalog';

export default async function EmployerProformaPage({
  params,
}: {
  params: Promise<{ locale: string; proformaId: string }>;
}) {
  const { locale, proformaId } = await params;
  setRequestLocale(locale);

  const session = await loadEmployerSessionOrRedirect();
  const t = await getTranslations('Employer.packages.proforma');
  const res = await fetchEmployerProforma(session.accessToken, proformaId);

  if (!res.ok) {
    if (res.status === 404) {
      notFound();
    }
    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
          <p className="text-sm text-destructive" role="alert">
            {t('loadError')}
          </p>
          <p className="mt-4">
            <Link
              href="/employer/packages"
              locale={locale}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('backToPackages')}
            </Link>
          </p>
        </section>
      </div>
    );
  }

  const p = res.data;
  let money: string;
  try {
    money = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: p.currency,
      minimumFractionDigits: 2,
    }).format(p.totalMinor / 100);
  } catch {
    money = `${(p.totalMinor / 100).toFixed(2)} ${p.currency}`;
  }

  let issuedFmt: string;
  try {
    issuedFmt = new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(p.issuedAt));
  } catch {
    issuedFmt = p.issuedAt;
  }

  let paidFmt: string | null = null;
  if (p.paidAt) {
    try {
      paidFmt = new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(p.paidAt));
    } catch {
      paidFmt = p.paidAt;
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <p>
          <Link
            href="/employer/packages"
            locale={locale}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t('backToPackages')}
          </Link>
        </p>
        <h2 className="mt-2 text-xl font-semibold text-foreground">
          {t('heading', { number: p.number })}
        </h2>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <dl className="grid max-w-md gap-3 text-sm">
          <div className="flex flex-col gap-0.5 border-b border-border pb-3">
            <dt className="text-muted-foreground">{t('totalLabel')}</dt>
            <dd className="text-lg font-medium tabular-nums text-foreground">
              {money}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 border-b border-border pb-3">
            <dt className="text-muted-foreground">{t('issuedLabel')}</dt>
            <dd className="text-foreground">{issuedFmt}</dd>
          </div>
          <div className="flex flex-col gap-0.5 border-b border-border pb-3">
            <dt className="text-muted-foreground">{t('paidLabel')}</dt>
            <dd className="text-foreground">{paidFmt ?? t('notPaidYet')}</dd>
          </div>
          <div className="flex flex-col gap-0.5 border-b border-border pb-3">
            <dt className="text-muted-foreground">{t('statusLabel')}</dt>
            <dd className="text-foreground">
              {t(`status.${p.subscriptionStatus}`)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="max-w-xl rounded-2xl border border-border/70 bg-card p-6 text-sm shadow-sm">
        <h3 className="font-medium text-foreground">{t('paymentHeading')}</h3>
        {p.paymentInstructionsHtml ? (
          <div
            className="prose prose-sm mt-3 max-w-none dark:prose-invert [&_p]:my-1"
            dangerouslySetInnerHTML={{ __html: p.paymentInstructionsHtml }}
          />
        ) : (
          <>
            <p className="mt-2 text-muted-foreground">{t('paymentLead')}</p>
            <p className="mt-2 text-muted-foreground">{t('paymentDetail')}</p>
          </>
        )}
        <p className="mt-2 text-muted-foreground">{t('paymentContact')}</p>
        {p.refundPolicyExcerpt ? (
          <p className="mt-4 text-xs text-muted-foreground">
            {p.refundPolicyExcerpt}
          </p>
        ) : null}
        <p className="mt-4">
          {p.pdfStorageKey ? (
            <a
              href={`/api/employer/billing/proformas/${proformaId}/pdf`}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('downloadPdf')}
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">{t('pdfSoon')}</span>
          )}
        </p>
      </section>
    </div>
  );
}
