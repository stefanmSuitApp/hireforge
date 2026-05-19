import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from 'next-intl/server';
import { notFound } from 'next/navigation';

import { HtmlLang } from '../../components/html-lang';
import { SiteShell } from '../../components/site-shell';
import { AppToaster } from '../../components/app-toaster';
import { buildLocaleAlternates } from '../../i18n/metadata';
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
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  return {
    metadataBase: new URL(base),
    title: {
      default: t('title'),
      template: '%s · Šljakam',
    },
    description: t('description'),
    alternates: buildLocaleAlternates(locale, '/'),
    openGraph: {
      type: 'website',
      locale: locale === 'sr' ? 'sr_RS' : 'en_US',
      siteName: 'Šljakam',
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
    <>
      <HtmlLang locale={locale} />
      <NextIntlClientProvider locale={locale} messages={messages}>
        <AppToaster />
        <SiteShell>{children}</SiteShell>
      </NextIntlClientProvider>
    </>
  );
}
