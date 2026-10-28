'use client';

import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';

import {
  ADMIN_WORKSPACE_LINKS,
  getAdminWorkspaceNavKey,
} from '@/features/admin/admin-workspace-links';
import {
  CANDIDATE_WORKSPACE_LINKS,
  getCandidateWorkspaceNavKey,
} from '@/features/candidate/candidate-workspace-links';
import {
  EMPLOYER_WORKSPACE_LINKS,
  getEmployerWorkspaceNavKey,
  isEmployerWorkspacePathname,
} from '@/features/employer/employer-workspace-links';
import {
  getModeratorWorkspaceNavKey,
  MODERATOR_WORKSPACE_LINKS,
} from '@/features/moderator/moderator-workspace-links';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { signOut } from '@/lib/sign-out';
import type { AuthRole } from '@/lib/unified-auth';

import type { SiteNavItem } from './site-main-nav';

type Props = {
  locale: string;
  ariaLabel: string;
  items: SiteNavItem[];
  isAuthenticated: boolean;
  signInLabel: string;
  dashboardPath: string | null;
  dashboardLabel: string;
  authRole: AuthRole | null;
  /** Employer awaiting company approval: no workspace links yet. */
  awaitingApproval: boolean;
  logoutEndpoint: string | null;
};

function isNavActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isCandidateWorkspaceRoute(pathname: string): boolean {
  if (pathname === '/candidate' || pathname.startsWith('/candidate/')) {
    return true;
  }
  return /^\/jobs\/[^/]+\/apply$/.test(pathname);
}

const rowClass = (active: boolean) =>
  cn(
    'flex min-h-11 items-center rounded-xl px-3 text-base font-medium transition-colors',
    active ? 'bg-foreground text-background' : 'text-foreground hover:bg-muted',
  );

export function SiteMobileNav({
  locale,
  ariaLabel,
  items,
  isAuthenticated,
  signInLabel,
  dashboardPath,
  dashboardLabel,
  authRole,
  awaitingApproval,
  logoutEndpoint,
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const tNav = useTranslations('Nav');
  const tCandidate = useTranslations('Candidate');
  const tEmployer = useTranslations('Employer');
  const tModerator = useTranslations('Moderator');
  const tAdmin = useTranslations('Admin');
  const inCandidateContext = isCandidateWorkspaceRoute(pathname);
  const inEmployerContext = isEmployerWorkspacePathname(pathname);
  const candidateNavCurrent =
    authRole === 'candidate' && pathname.startsWith('/candidate')
      ? getCandidateWorkspaceNavKey(pathname)
      : null;
  const employerNavCurrent =
    authRole === 'employer' && pathname.startsWith('/employer')
      ? getEmployerWorkspaceNavKey(pathname)
      : null;
  const moderatorNavCurrent =
    authRole === 'moderator' || authRole === 'admin'
      ? getModeratorWorkspaceNavKey(pathname)
      : null;
  const adminNavCurrent =
    authRole === 'admin' ? getAdminWorkspaceNavKey(pathname) : null;

  const close = () => setOpen(false);
  const row = (href: string, label: ReactNode, active: boolean) => (
    <Link
      key={href}
      href={href}
      locale={locale}
      className={rowClass(active)}
      aria-current={active ? 'page' : undefined}
      onClick={close}
    >
      {label}
    </Link>
  );

  let workspaceLinks: ReactNode = null;
  if (isAuthenticated && authRole === 'candidate' && inCandidateContext) {
    workspaceLinks = CANDIDATE_WORKSPACE_LINKS.map(
      ({ href, navKey, messageKey }) =>
        row(href, tCandidate(messageKey), candidateNavCurrent === navKey),
    );
  } else if (
    isAuthenticated &&
    authRole === 'employer' &&
    !awaitingApproval &&
    inEmployerContext
  ) {
    workspaceLinks = EMPLOYER_WORKSPACE_LINKS.map(
      ({ href, navKey, messageKey }) =>
        row(href, tEmployer(messageKey), employerNavCurrent === navKey),
    );
  } else if (
    isAuthenticated &&
    (authRole === 'moderator' || authRole === 'admin')
  ) {
    workspaceLinks = (
      <>
        {MODERATOR_WORKSPACE_LINKS.map(({ href, navKey, messageKey }) =>
          row(href, tModerator(messageKey), moderatorNavCurrent === navKey),
        )}
        {authRole === 'admin' ? (
          <>
            <div className="my-2 border-t border-border/60" />
            {ADMIN_WORKSPACE_LINKS.map(({ href, navKey, messageKey }) =>
              row(href, tAdmin(messageKey), adminNavCurrent === navKey),
            )}
          </>
        ) : null}
      </>
    );
  }

  const primaryClass =
    'flex min-h-11 items-center justify-center rounded-xl bg-primary px-3 text-base font-semibold text-primary-foreground hover:bg-primary/90';

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          aria-label={ariaLabel}
          className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Menu className="size-5" aria-hidden />
        </SheetTrigger>
        <SheetContent side="right" closeLabel={tNav('closeMenu')}>
          <SheetTitle className="pr-12 leading-[2.75rem]">
            {ariaLabel}
          </SheetTitle>
          <nav aria-label={ariaLabel} className="flex flex-col gap-1">
            {items.map((item) =>
              item.external ? (
                <a
                  key={`${item.label}-${item.href}`}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className={rowClass(false)}
                  onClick={close}
                >
                  {item.label}
                </a>
              ) : (
                row(item.href, item.label, isNavActive(pathname, item.href))
              ),
            )}
          </nav>

          <div className="flex flex-col gap-1 border-t border-border/60 pt-3">
            {workspaceLinks}
            {workspaceLinks == null && isAuthenticated && dashboardPath ? (
              <Link
                href={dashboardPath}
                locale={locale}
                className={primaryClass}
                onClick={close}
              >
                {dashboardLabel}
              </Link>
            ) : null}
            {!isAuthenticated ? (
              <Link
                href="/sign-in"
                locale={locale}
                className={primaryClass}
                onClick={close}
              >
                {signInLabel}
              </Link>
            ) : null}
          </div>

          {isAuthenticated && logoutEndpoint ? (
            // Account actions sit apart from navigation, at the bottom.
            <button
              type="button"
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true);
                if (await signOut(logoutEndpoint, locale)) return;
                setSigningOut(false);
              }}
              className="mt-auto flex min-h-11 w-full items-center rounded-xl px-3 text-left text-base font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
            >
              {signingOut ? tNav('signingOut') : tNav('signOut')}
            </button>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
