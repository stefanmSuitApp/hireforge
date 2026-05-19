import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { nestApiUrl, resolveNestPublicOrigin } from '../../../lib/nest-api-url';
import { routing } from '../../../i18n/routing';

type IntegrationUpstream = {
  message?: string;
  postgres?: string;
  redis?: string;
  bullmq?: string;
  bullmqJobId?: string;
  sanity?: string;
};

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function IntegrationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  const t = await getTranslations('Integration');

  const base = resolveNestPublicOrigin();
  let upstream: IntegrationUpstream | { error: string } | null = null;
  const integrationUrl = base ? nestApiUrl(base, 'integration') : null;
  if (integrationUrl) {
    try {
      const res = await fetch(integrationUrl, {
        cache: 'no-store',
        headers: { accept: 'application/json' },
      });
      const text = await res.text();
      if (!res.ok) {
        upstream = { error: `HTTP ${res.status}` };
      } else {
        upstream = JSON.parse(text) as IntegrationUpstream;
      }
    } catch (e) {
      upstream = {
        error: e instanceof Error ? e.message : 'fetch_failed',
      };
    }
  } else {
    upstream = { error: 'NEXT_PUBLIC_API_URL is not set' };
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-12 pt-8">
      <h1 className="mb-3 text-[clamp(1.875rem,4vw,2.25rem)] font-bold leading-tight tracking-tight text-gray-900">
        {t('title')}
      </h1>
      <p className="m-0 text-[1.0625rem] leading-relaxed text-gray-600">
        {t('description')}
      </p>
      <p className="mt-4 text-gray-800">
        <strong>{t('localeLabel')}</strong>{' '}
        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm">
          {locale}
        </code>{' '}
        — {routing.locales.join(', ')}
      </p>
      <h2 className="mb-2 mt-6 text-base font-semibold text-gray-700">
        {t('upstreamHeading')}
      </h2>
      <pre className="mt-3 overflow-auto rounded-lg bg-gray-900 p-4 font-mono text-[0.8125rem] leading-snug text-gray-100">
        {JSON.stringify(upstream, null, 2)}
      </pre>
      <p className="mt-3 text-sm text-gray-500">{t('hint')}</p>
    </main>
  );
}
