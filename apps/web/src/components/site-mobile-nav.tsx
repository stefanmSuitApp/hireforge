'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

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

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={ariaLabel}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/70 text-foreground transition-colors hover:bg-muted/70"
      >
        <span className="sr-only">{ariaLabel}</span>
        <span className="text-lg leading-none">☰</span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setOpen(false)}
            aria-label={ariaLabel}
          />
          <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-border/60 bg-background p-3 shadow-xl">
            <nav aria-label={ariaLabel} className="flex flex-col gap-1">
              {items.map((item) => {
                const active = isNavActive(pathname, item.href);
                return item.external ? (
                  <a
                    key={`${item.label}-${item.href}`}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-foreground text-background'
                        : 'text-foreground hover:bg-muted',
                    )}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={`${item.label}-${item.href}`}
                    href={item.href}
                    locale={locale}
                    className={cn(
                      'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-foreground text-background'
                        : 'text-foreground hover:bg-muted',
                    )}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-3 border-t border-border/60 pt-3">
              {isAuthenticated &&
              authRole === 'candidate' &&
              inCandidateContext ? (
                <div className="flex flex-col gap-1">
                  {CANDIDATE_WORKSPACE_LINKS.map(
                    ({ href, navKey, messageKey }) => {
                      const active = candidateNavCurrent === navKey;
                      return (
                        <Link
                          key={href}
                          href={href}
                          locale={locale}
                          className={cn(
                            'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                            active
                              ? 'bg-foreground text-background'
                              : 'text-foreground hover:bg-muted',
                          )}
                          onClick={() => setOpen(false)}
                        >
                          {tCandidate(messageKey)}
                        </Link>
                      );
                    },
                  )}
                </div>
              ) : isAuthenticated &&
                authRole === 'employer' &&
                !awaitingApproval &&
                inEmployerContext ? (
                <div className="flex flex-col gap-1">
                  {EMPLOYER_WORKSPACE_LINKS.map(
                    ({ href, navKey, messageKey }) => {
                      const active = employerNavCurrent === navKey;
                      return (
                        <Link
                          key={href}
                          href={href}
                          locale={locale}
                          className={cn(
                            'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                            active
                              ? 'bg-foreground text-background'
                              : 'text-foreground hover:bg-muted',
                          )}
                          onClick={() => setOpen(false)}
                        >
                          {tEmployer(messageKey)}
                        </Link>
                      );
                    },
                  )}
                </div>
              ) : isAuthenticated && authRole === 'moderator' ? (
                <div className="flex flex-col gap-1">
                  {MODERATOR_WORKSPACE_LINKS.map(
                    ({ href, navKey, messageKey }) => {
                      const active = moderatorNavCurrent === navKey;
                      return (
                        <Link
                          key={href}
                          href={href}
                          locale={locale}
                          className={cn(
                            'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                            active
                              ? 'bg-foreground text-background'
                              : 'text-foreground hover:bg-muted',
                          )}
                          onClick={() => setOpen(false)}
                        >
                          {tModerator(messageKey)}
                        </Link>
                      );
                    },
                  )}
                </div>
              ) : isAuthenticated && authRole === 'admin' ? (
                <div className="flex flex-col gap-1">
                  {MODERATOR_WORKSPACE_LINKS.map(
                    ({ href, navKey, messageKey }) => {
                      const active = moderatorNavCurrent === navKey;
                      return (
                        <Link
                          key={href}
                          href={href}
                          locale={locale}
                          className={cn(
                            'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                            active
                              ? 'bg-foreground text-background'
                              : 'text-foreground hover:bg-muted',
                          )}
                          onClick={() => setOpen(false)}
                        >
                          {tModerator(messageKey)}
                        </Link>
                      );
                    },
                  )}
                  <div className="my-2 border-t border-border/60" />
                  {ADMIN_WORKSPACE_LINKS.map(({ href, navKey, messageKey }) => {
                    const active = adminNavCurrent === navKey;
                    return (
                      <Link
                        key={href}
                        href={href}
                        locale={locale}
                        className={cn(
                          'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                          active
                            ? 'bg-foreground text-background'
                            : 'text-foreground hover:bg-muted',
                        )}
                        onClick={() => setOpen(false)}
                      >
                        {tAdmin(messageKey)}
                      </Link>
                    );
                  })}
                </div>
              ) : isAuthenticated && dashboardPath ? (
                <Link
                  href={dashboardPath}
                  locale={locale}
                  className="block rounded-xl bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  onClick={() => setOpen(false)}
                >
                  {dashboardLabel}
                </Link>
              ) : (
                <Link
                  href="/sign-in"
                  locale={locale}
                  className="block rounded-xl bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  onClick={() => setOpen(false)}
                >
                  {signInLabel}
                </Link>
              )}
              {isAuthenticated && logoutEndpoint ? (
                <button
                  type="button"
                  disabled={signingOut}
                  onClick={async () => {
                    setSigningOut(true);
                    if (await signOut(logoutEndpoint, locale)) return;
                    setSigningOut(false);
                  }}
                  className="mt-2 w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
                >
                  {signingOut ? tNav('signingOut') : tNav('signOut')}
                </button>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
