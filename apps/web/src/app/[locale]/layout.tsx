import '../global.css';

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from 'next-intl/server';
import { notFound } from 'next/navigation';

import { AppQueryProvider } from '../../components/providers/app-query-provider';
import { CompanyLogosProvider } from '../../components/providers/company-logos-provider';
import { fetchCmsEmployerLogos } from '../../lib/cms-content';
import { SiteShell } from '../../components/site-shell';
import { AppToaster } from '../../components/app-toaster';
import { THEME_SCRIPT } from '../../components/theme-toggle';
import { buildLocaleAlternates, SITE_NAME } from '../../i18n/metadata';
import { absoluteSiteOrigin } from '../../lib/site-origin';
import { routing } from '../../i18n/routing';

function siteVerification(): Metadata['verification'] {
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const bing = process.env.BING_SITE_VERIFICATION?.trim();
  const yandex = process.env.YANDEX_SITE_VERIFICATION?.trim();
  return {
    ...(google ? { google } : {}),
    ...(yandex ? { yandex } : {}),
    ...(bing ? { other: { 'msvalidate.01': bing } } : {}),
  };
}

// Self-hosted at build time (no request to Google); latin-ext covers š đ č ć ž.
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
});

/** Browser UI colour: the brand teal (`--primary`, see make-icons.mjs). */
export const viewport: Viewport = { themeColor: '#007767' };

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
    // Search Console / Bing / Yandex ownership tags; unset → no tag.
    verification: siteVerification(),
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
  const [messages, companyLogos] = await Promise.all([
    getMessages(),
    fetchCmsEmployerLogos(),
  ]);

  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Before paint: no light flash for dark-mode visitors. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <AppQueryProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <AppToaster />
            <CompanyLogosProvider logos={companyLogos}>
              <SiteShell>{children}</SiteShell>
            </CompanyLogosProvider>
          </NextIntlClientProvider>
        </AppQueryProvider>
      </body>
    </html>
  );
}
