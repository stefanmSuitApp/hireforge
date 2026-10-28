import '../global.css';

import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from 'next-intl/server';
import { notFound } from 'next/navigation';

import { AppQueryProvider } from '../../components/providers/app-query-provider';
import { SiteShell } from '../../components/site-shell';
import { AppToaster } from '../../components/app-toaster';
import { buildLocaleAlternates, SITE_NAME } from '../../i18n/metadata';
import { absoluteSiteOrigin } from '../../lib/site-origin';
import { routing } from '../../i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    return {};
  }
  setRequestLocale(locale);
  const t = await getTranslations('Metadata');

  return {
    metadataBase: new URL(absoluteSiteOrigin()),
    applicationName: SITE_NAME,
    title: {
      default: t('title'),
      template: `%s · ${SITE_NAME}`,
    },
    description: t('description'),
    // People type the name without the diacritic; both spellings + domain.
    keywords: [SITE_NAME, 'Sljakam', 'sljakam.com'],
    // SVG for current browsers, PNG fallback, Apple touch icon (make-icons.mjs).
    icons: {
      icon: [
        { url: '/icon.svg', type: 'image/svg+xml' },
        { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      ],
      apple: '/apple-touch-icon.png',
    },
    alternates: buildLocaleAlternates(locale, '/'),
    openGraph: {
      type: 'website',
      locale: locale === 'sr' ? 'sr_RS' : 'en_US',
      siteName: SITE_NAME,
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-dvh font-sans antialiased">
        <AppQueryProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <AppToaster />
            <SiteShell>{children}</SiteShell>
          </NextIntlClientProvider>
        </AppQueryProvider>
      </body>
    </html>
  );
}
