import { unstable_noStore as noStore } from 'next/cache';
import { getLocale, getTranslations } from 'next-intl/server';

import { fetchCmsNavigation } from '@/lib/cms-content';
import { getUnifiedAuthSession } from '@/lib/unified-auth';

import { Link } from '@/i18n/navigation';

import { BrandWordmark } from './brand-wordmark';
import { LocaleSwitcher } from './locale-switcher';
import { SiteMobileNav } from './site-mobile-nav';
import { SiteMainNav, type SiteNavItem } from './site-main-nav';
import { UserProfileDropdown } from './user-profile-dropdown';

export async function SiteHeader() {
  noStore();
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const authSession = await getUnifiedAuthSession();
  const cmsNav = await fetchCmsNavigation(locale);
  const navItems = cmsNav && cmsNav.length > 0 ? cmsNav : null;
  const brandText = t('brand');

  const fallbackNav: SiteNavItem[] = [
    { href: '/', label: t('home') },
    { href: '/jobs', label: t('jobs') },
    { href: '/employers', label: t('employer') },
  ];
  const shouldHideForGuests = (href: string) =>
    href === '/jobs' ||
    href.startsWith('/jobs/') ||
    href === '/employers' ||
    href.startsWith('/employers/');
  const visibleNavItems = (navItems ?? fallbackNav).filter(
    (item) => authSession.isAuthenticated || !shouldHideForGuests(item.href),
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        {/* Left: Logo */}
        <Link
          href="/"
          locale={locale}
          className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80"
        >
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-sm">
            <span className="text-lg font-bold text-primary-foreground">Š</span>
          </div>
          <BrandWordmark text={brandText} size="md" className="hidden sm:block" />
        </Link>

        {/* Center: Navigation */}
        <nav className="hidden flex-1 justify-center md:flex">
          <SiteMainNav
            ariaLabel={t('mainNav')}
            items={visibleNavItems}
          />
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <LocaleSwitcher />

          <div className="hidden md:block">
            {authSession.isAuthenticated &&
            authSession.role &&
            authSession.dashboardPath &&
            authSession.logoutEndpoint ? (
              <UserProfileDropdown
                displayName={authSession.displayName ?? 'User'}
                email={authSession.email ?? ''}
                role={authSession.role}
                dashboardPath={authSession.dashboardPath}
                logoutEndpoint={authSession.logoutEndpoint}
              />
            ) : (
              <Link
                href="/sign-in"
                locale={locale}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
              >
                {t('signIn')}
              </Link>
            )}
          </div>

          <SiteMobileNav
            locale={locale}
            ariaLabel={t('mainNav')}
            items={visibleNavItems}
            isAuthenticated={authSession.isAuthenticated}
            signInLabel={t('signIn')}
            dashboardPath={authSession.dashboardPath}
            dashboardLabel={t('dashboard')}
            authRole={authSession.role}
          />
        </div>
      </div>
    </header>
  );
}
