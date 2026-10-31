'use client';

import * as React from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { usePublishedLegalPages } from '@/features/legal/legal-links';
import { Link, usePathname } from '@/i18n/navigation';
import {
  ANALYTICS_CONSENT_COOKIE,
  ANALYTICS_CONSENT_MAX_AGE_S,
  OPEN_ANALYTICS_CONSENT_EVENT,
  analyticsRecordsPath,
  type AnalyticsConsent,
} from '@/lib/analytics-consent';

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][] };

declare global {
  interface Window {
    clarity?: ClarityFn;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/** Microsoft's tag snippet, inserted only after "Prihvatam". */
function loadClarity(projectId: string) {
  if (window.clarity) return;
  const queue: ClarityFn = (...args) => {
    (queue.q ??= []).push(args);
  };
  window.clarity = queue;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${projectId}`;
  document.head.appendChild(script);
  // We run no ads, so ad storage stays denied.
  window.clarity('consentv2', {
    ad_Storage: 'denied',
    analytics_Storage: 'granted',
  });
}

/**
 * Google's gtag snippet, inserted only after "Prihvatam". Page views are sent
 * by us (public pages only), not by gtag or enhanced measurement's history
 * tracking, which would also count dashboards.
 */
function loadGoogleAnalytics(measurementId: string) {
  if (window.gtag) return;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // gtag.js reads the `arguments` object itself; an array is ignored.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };
  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'granted',
  });
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
}

/** Google's documented switch: while set, gtag sends nothing for that id. */
function setGoogleAnalyticsDisabled(measurementId: string, off: boolean) {
  (window as unknown as Record<string, unknown>)[
    `ga-disable-${measurementId}`
  ] = off;
}

function writeChoice(choice: AnalyticsConsent) {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${ANALYTICS_CONSENT_COOKIE}=${choice}; Path=/; Max-Age=${ANALYTICS_CONSENT_MAX_AGE_S}; SameSite=Lax${secure}`;
}

/** Withdrawal: tell both tools, drop their cookies, reload without them. */
function withdraw() {
  window.clarity?.('consentv2', {
    ad_Storage: 'denied',
    analytics_Storage: 'denied',
  });
  window.clarity?.('consent', false);
  window.gtag?.('consent', 'update', { analytics_storage: 'denied' });
  const names = document.cookie
    .split(';')
    .map((c) => c.split('=')[0]?.trim() ?? '')
    .filter((n) => n === '_clck' || n === '_clsk' || n.startsWith('_ga'));
  for (const name of names) {
    for (const domain of ['', `; Domain=.${location.hostname}`]) {
      document.cookie = `${name}=; Path=/; Max-Age=0${domain}`;
    }
  }
  location.reload();
}

/**
 * Consent banner and the analytics loaders. Mounted only when Clarity or
 * Google Analytics is configured. The banner appears on recorded pages until
 * the visitor chooses; the footer link reopens it anywhere.
 */
export function AnalyticsConsentBanner({
  clarityId,
  gaId,
  initialChoice,
}: {
  clarityId: string | null;
  gaId: string | null;
  initialChoice: AnalyticsConsent | null;
}) {
  const t = useTranslations('Consent');
  const pathname = usePathname();
  const legal = usePublishedLegalPages();
  const [choice, setChoice] = React.useState(initialChoice);
  const [reopened, setReopened] = React.useState(false);
  const recorded = analyticsRecordsPath(pathname);

  React.useEffect(() => {
    const open = () => setReopened(true);
    globalThis.addEventListener(OPEN_ANALYTICS_CONSENT_EVENT, open);
    return () =>
      globalThis.removeEventListener(OPEN_ANALYTICS_CONSENT_EVENT, open);
  }, []);

  // A layout effect runs before Clarity's mutation observer sees the new
  // page, so a private page reached by client navigation is masked from its
  // first frame (the body attribute covers dialogs and menus in portals too),
  // and before any gtag event (scrolls, clicks) can fire there.
  React.useLayoutEffect(() => {
    if (recorded) {
      document.body.removeAttribute('data-clarity-mask');
      window.clarity?.('resume');
    } else {
      document.body.setAttribute('data-clarity-mask', 'true');
      window.clarity?.('pause');
    }
    if (gaId) setGoogleAnalyticsDisabled(gaId, !recorded);
  }, [recorded, gaId]);

  React.useEffect(() => {
    if (choice !== 'granted' || !recorded) return;
    if (clarityId) loadClarity(clarityId);
    if (gaId) {
      loadGoogleAnalytics(gaId);
      window.gtag?.('event', 'page_view', {
        page_location: location.href,
      });
    }
  }, [choice, recorded, pathname, clarityId, gaId]);

  const decide = (next: AnalyticsConsent) => {
    writeChoice(next);
    setReopened(false);
    if (next === 'denied' && (window.clarity || window.gtag)) {
      withdraw();
      return;
    }
    setChoice(next);
  };

  if (!reopened && (choice !== null || !recorded)) return null;

  const tools = [
    gaId ? 'Google Analytics' : null,
    clarityId ? 'Microsoft Clarity' : null,
  ]
    .filter(Boolean)
    .join(t('and'));

  return (
    <aside
      aria-label={t('label')}
      className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-xl flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-lg"
    >
      <h2 className="m-0 text-sm font-semibold text-foreground">
        {t('title')}
      </h2>
      <p className="m-0 text-sm text-muted-foreground">
        {t('text', { tools })}{' '}
        {legal.includes('privacy') ? (
          <Link
            href="/privacy"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {t('privacyLink')}
          </Link>
        ) : null}
      </p>
      {/* Equal weight: declining is as easy as accepting. */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 rounded-full"
          onClick={() => decide('denied')}
        >
          {t('decline')}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 rounded-full"
          onClick={() => decide('granted')}
        >
          {t('accept')}
        </Button>
      </div>
    </aside>
  );
}

/** Footer link: change the analytics choice at any time. */
export function AnalyticsConsentSettingsButton({
  className,
}: {
  className?: string;
}) {
  const t = useTranslations('Consent');
  return (
    <button
      type="button"
      className={className}
      onClick={() =>
        globalThis.dispatchEvent(new Event(OPEN_ANALYTICS_CONSENT_EVENT))
      }
    >
      {t('settings')}
    </button>
  );
}
