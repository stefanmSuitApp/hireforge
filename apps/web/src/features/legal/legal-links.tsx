'use client';

import * as React from 'react';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import type { LegalPageKind } from '@/lib/cms-content';

const PublishedLegalPages = React.createContext<readonly LegalPageKind[]>([]);

/** Which legal pages are published, so nothing links to a 404. */
export function LegalLinksProvider({
  published,
  children,
}: {
  published: readonly LegalPageKind[];
  children: React.ReactNode;
}) {
  return (
    <PublishedLegalPages.Provider value={published}>
      {children}
    </PublishedLegalPages.Provider>
  );
}

const linkClass = 'font-medium text-primary underline-offset-2 hover:underline';

/** Refund policy and terms next to the package purchase. */
export function CheckoutLegalNotice() {
  const published = React.useContext(PublishedLegalPages);
  const t = useTranslations('Legal');
  if (!published.includes('refunds') || !published.includes('terms')) {
    return null;
  }
  return (
    <p className="m-0 text-xs text-muted-foreground">
      {t.rich('checkoutNotice', {
        refunds: (chunks) => (
          <Link href="/refunds" target="_blank" className={linkClass}>
            {chunks}
          </Link>
        ),
        terms: (chunks) => (
          <Link href="/terms" target="_blank" className={linkClass}>
            {chunks}
          </Link>
        ),
      })}
    </p>
  );
}

/**
 * "By creating an account you accept the terms…" under the register forms.
 * Shown only once terms and privacy are published; the BFF records the
 * accepted terms version on the same condition.
 */
export function SignUpLegalNotice() {
  const published = React.useContext(PublishedLegalPages);
  const t = useTranslations('Legal');
  if (!published.includes('terms') || !published.includes('privacy')) {
    return null;
  }
  return (
    <p className="m-0 text-xs leading-relaxed text-muted-foreground">
      {t.rich('signUpNotice', {
        terms: (chunks) => (
          <Link href="/terms" target="_blank" className={linkClass}>
            {chunks}
          </Link>
        ),
        privacy: (chunks) => (
          <Link href="/privacy" target="_blank" className={linkClass}>
            {chunks}
          </Link>
        ),
      })}
    </p>
  );
}
