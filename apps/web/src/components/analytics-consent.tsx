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

function writeChoice(choice: AnalyticsConsent) {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${ANALYTICS_CONSENT_COOKIE}=${choice}; Path=/; Max-Age=${ANALYTICS_CONSENT_MAX_AGE_S}; SameSite=Lax${secure}`;
}

/** Withdrawal: tell Clarity, drop its first-party cookies, reload without it. */
function withdraw() {
  window.clarity?.('consentv2', {
    ad_Storage: 'denied',
    analytics_Storage: 'denied',
  });
  window.clarity?.('consent', false);
  for (const name of ['_clck', '_clsk']) {
    for (const domain of ['', `; Domain=.${location.hostname}`]) {
      document.cookie = `${name}=; Path=/; Max-Age=0${domain}`;
    }
  }
  location.reload();
}

/**
 * Consent banner and Clarity loader. Mounted only when a Clarity project is
 * configured. The banner appears on recorded pages until the visitor
 * chooses; the footer link reopens it anywhere.
 */
export function AnalyticsConsentBanner({
  projectId,
  initialChoice,
}: {
  projectId: string;
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
  // first frame (the body attribute covers dialogs and menus in portals too).
  React.useLayoutEffect(() => {
    if (recorded) {
      document.body.removeAttribute('data-clarity-mask');
      window.clarity?.('resume');
    } else {
      document.body.setAttribute('data-clarity-mask', 'true');
      window.clarity?.('pause');
    }
  }, [recorded]);

  React.useEffect(() => {
    if (choice === 'granted' && recorded) loadClarity(projectId);
  }, [choice, recorded, projectId]);

  const decide = (next: AnalyticsConsent) => {
    writeChoice(next);
    setReopened(false);
    if (next === 'denied' && window.clarity) {
      withdraw();
      return;
    }
    setChoice(next);
  };

  if (!reopened && (choice !== null || !recorded)) return null;

  return (
    <aside
      aria-label={t('label')}
      className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-xl flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-lg"
    >
      <h2 className="m-0 text-sm font-semibold text-foreground">
        {t('title')}
      </h2>
      <p className="m-0 text-sm text-muted-foreground">
        {t('text')}{' '}
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
