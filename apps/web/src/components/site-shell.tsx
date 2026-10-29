import { getTranslations } from 'next-intl/server';

import { hasAnyAuthSession } from '@/lib/unified-auth';

import { GuestSignUpBar } from './guest-sign-up-bar';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

export async function SiteShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('Nav');
  const guest = !(await hasAnyAuthSession());
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* First tab stop: past the sticky header (and workspace nav) to the page. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        {t('skipToContent')}
      </a>
      <SiteHeader />
      <div
        id="main-content"
        tabIndex={-1}
        className="w-full flex-1 outline-none"
      >
        {children}
      </div>
      <SiteFooter />
      <GuestSignUpBar guest={guest} />
    </div>
  );
}
