import { getLocale, getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';

import {
  ANALYTICS_CONSENT_COOKIE,
  clarityProjectId,
  parseAnalyticsConsent,
} from '@/lib/analytics-consent';
import { LegalLinksProvider } from '@/features/legal/legal-links';
import { fetchCmsPublishedLegalPages } from '@/lib/cms-content';
import { resolvePromoBanner } from '@/lib/promo-banner';
import { getUnifiedAuthSession, hasAnyAuthSession } from '@/lib/unified-auth';

import { AnalyticsConsentBanner } from './analytics-consent';
import { GuestSignUpBar } from './guest-sign-up-bar';
import { PromoBar } from './promo-bar';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

export async function SiteShell({ children }: { children: React.ReactNode }) {
  const [t, locale, session, anySession, cookieStore] = await Promise.all([
    getTranslations('Nav'),
    getLocale(),
    getUnifiedAuthSession(),
    hasAnyAuthSession(),
    cookies(),
  ]);
  const clarity = clarityProjectId();
  const guest = !anySession;
  const [legalPages, promo] = await Promise.all([
    fetchCmsPublishedLegalPages(),
    resolvePromoBanner(locale, session.role),
  ]);
  const legal = legalPages.map((p) => p.kind);
  return (
    <LegalLinksProvider published={legal}>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        {/* First tab stop: past the sticky header (and workspace nav) to the page. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-primary-foreground"
        >
          {t('skipToContent')}
        </a>
        {promo ? <PromoBar banner={promo} locale={locale} /> : null}
        <SiteHeader />
        <div
          id="main-content"
          tabIndex={-1}
          className="w-full flex-1 outline-none"
        >
          {children}
        </div>
        <SiteFooter legal={legal} analyticsConsent={clarity !== null} />
        <GuestSignUpBar guest={guest} />
        {clarity ? (
          <AnalyticsConsentBanner
            projectId={clarity}
            initialChoice={parseAnalyticsConsent(
              cookieStore.get(ANALYTICS_CONSENT_COOKIE)?.value,
            )}
          />
        ) : null}
      </div>
    </LegalLinksProvider>
  );
}
