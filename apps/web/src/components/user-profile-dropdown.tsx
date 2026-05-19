'use client';

import {
  Building2,
  Briefcase,
  FilePenLine,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  User,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CANDIDATE_WORKSPACE_LINKS,
  getCandidateWorkspaceNavKey,
} from '@/features/candidate/candidate-workspace-links';
import {
  ADMIN_WORKSPACE_LINKS,
  getAdminWorkspaceNavKey,
} from '@/features/admin/admin-workspace-links';
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
import { cn } from '@/lib/utils';
import type { AuthRole } from '@/lib/unified-auth';

type Props = {
  displayName: string;
  email: string;
  role: AuthRole;
  dashboardPath: string;
  logoutEndpoint: string;
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

const candidateNavIcon = {
  workspaceNavHome: LayoutDashboard,
  workspaceNavApplications: FileText,
  workspaceNavProfile: User,
  workspaceNavCvBuild: FilePenLine,
} as const;

const employerNavIcon = {
  workspaceNavOverview: LayoutDashboard,
  workspaceNavMyListings: Briefcase,
  workspaceNavPackages: Package,
  workspaceNavPublicCompany: Building2,
} as const;

const moderatorNavIcon = {
  navQueue: LayoutDashboard,
  navCompanies: Building2,
  navEmployers: Briefcase,
  navBillingPending: Package,
} as const;

const adminNavIcon = {
  navOverview: LayoutDashboard,
  navUsers: User,
  navTaxonomy: FileText,
  navPromoCodes: FilePenLine,
  navCompanies: Building2,
  navBillingEnterprise: Package,
  navAudit: FileText,
} as const;

function isCandidateWorkspacePathname(pathname: string): boolean {
  return pathname === '/candidate' || pathname.startsWith('/candidate/');
}

export function UserProfileDropdown({
  displayName,
  email,
  role,
  dashboardPath,
  logoutEndpoint,
}: Props) {
  const t = useTranslations('Nav');
  const tCandidate = useTranslations('Candidate');
  const tEmployer = useTranslations('Employer');
  const tModerator = useTranslations('Moderator');
  const tAdmin = useTranslations('Admin');
  const locale = useLocale();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch(logoutEndpoint, { method: 'POST' });
      window.location.href = `/${locale}`;
    } catch {
      setIsLoggingOut(false);
    }
  }

  const initials = getInitials(displayName);
  const roleLabel =
    role === 'admin'
      ? t('roleAdmin')
      : role === 'moderator'
        ? t('roleModerator')
        : role === 'employer'
          ? t('roleEmployer')
          : t('roleCandidate');

  const candidateNavCurrent =
    role === 'candidate' && isCandidateWorkspacePathname(pathname)
      ? getCandidateWorkspaceNavKey(pathname)
      : null;

  const employerNavCurrent =
    role === 'employer' && isEmployerWorkspacePathname(pathname)
      ? getEmployerWorkspaceNavKey(pathname)
      : null;

  const moderatorNavCurrent =
    role === 'moderator' || role === 'admin'
      ? getModeratorWorkspaceNavKey(pathname)
      : null;

  const adminNavCurrent = role === 'admin' ? getAdminWorkspaceNavKey(pathname) : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-border/40 bg-card/50 py-1 pl-1 pr-3 transition-all hover:border-primary/40 hover:bg-primary/5"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-xs font-bold text-primary-foreground">
            {initials || <User className="size-4" />}
          </span>
          <span className="hidden max-w-[100px] truncate text-sm font-medium text-foreground sm:inline">
            {displayName}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl border-border/60 p-2">
        <DropdownMenuLabel className="px-2 py-2 font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold leading-none text-foreground">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{email}</p>
            <span className="mt-1 inline-flex w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              {roleLabel}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-2" />
        {role === 'candidate' ? (
          CANDIDATE_WORKSPACE_LINKS.map(({ href, navKey, messageKey }) => {
            const Icon = candidateNavIcon[messageKey];
            const active = candidateNavCurrent === navKey;
            return (
              <DropdownMenuItem
                key={href}
                asChild
                className={cn('rounded-lg px-2 py-2', active && 'bg-muted/80')}
              >
                <Link
                  href={href}
                  locale={locale}
                  className="flex w-full cursor-pointer items-center gap-2"
                >
                  <Icon
                    className={cn(
                      'size-4',
                      active ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  />
                  <span className={cn(active && 'font-medium')}>
                    {tCandidate(messageKey)}
                  </span>
                </Link>
              </DropdownMenuItem>
            );
          })
        ) : role === 'employer' ? (
          EMPLOYER_WORKSPACE_LINKS.map(({ href, navKey, messageKey }) => {
            const Icon = employerNavIcon[messageKey];
            const active = employerNavCurrent === navKey;
            return (
              <DropdownMenuItem
                key={href}
                asChild
                className={cn('rounded-lg px-2 py-2', active && 'bg-muted/80')}
              >
                <Link
                  href={href}
                  locale={locale}
                  className="flex w-full cursor-pointer items-center gap-2"
                >
                  <Icon
                    className={cn(
                      'size-4',
                      active ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  />
                  <span className={cn(active && 'font-medium')}>
                    {tEmployer(messageKey)}
                  </span>
                </Link>
              </DropdownMenuItem>
            );
          })
        ) : role === 'moderator' ? (
          MODERATOR_WORKSPACE_LINKS.map(({ href, navKey, messageKey }) => {
            const Icon = moderatorNavIcon[messageKey];
            const active = moderatorNavCurrent === navKey;
            return (
              <DropdownMenuItem
                key={href}
                asChild
                className={cn('rounded-lg px-2 py-2', active && 'bg-muted/80')}
              >
                <Link
                  href={href}
                  locale={locale}
                  className="flex w-full cursor-pointer items-center gap-2"
                >
                  <Icon
                    className={cn(
                      'size-4',
                      active ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  />
                  <span className={cn(active && 'font-medium')}>
                    {tModerator(messageKey)}
                  </span>
                </Link>
              </DropdownMenuItem>
            );
          })
        ) : role === 'admin' ? (
          <>
            {MODERATOR_WORKSPACE_LINKS.map(({ href, navKey, messageKey }) => {
              const Icon = moderatorNavIcon[messageKey];
              const active = moderatorNavCurrent === navKey;
              return (
                <DropdownMenuItem
                  key={href}
                  asChild
                  className={cn('rounded-lg px-2 py-2', active && 'bg-muted/80')}
                >
                  <Link
                    href={href}
                    locale={locale}
                    className="flex w-full cursor-pointer items-center gap-2"
                  >
                    <Icon
                      className={cn(
                        'size-4',
                        active ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    />
                    <span className={cn(active && 'font-medium')}>
                      {tModerator(messageKey)}
                    </span>
                  </Link>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator className="my-2" />
            {ADMIN_WORKSPACE_LINKS.map(({ href, navKey, messageKey }) => {
              const Icon = adminNavIcon[messageKey];
              const active = adminNavCurrent === navKey;
              return (
                <DropdownMenuItem
                  key={href}
                  asChild
                  className={cn('rounded-lg px-2 py-2', active && 'bg-muted/80')}
                >
                  <Link
                    href={href}
                    locale={locale}
                    className="flex w-full cursor-pointer items-center gap-2"
                  >
                    <Icon
                      className={cn(
                        'size-4',
                        active ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    />
                    <span className={cn(active && 'font-medium')}>
                      {tAdmin(messageKey)}
                    </span>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </>
        ) : (
          <DropdownMenuItem asChild className="rounded-lg px-2 py-2">
            <Link
              href={dashboardPath}
              locale={locale}
              className="flex w-full cursor-pointer items-center gap-2"
            >
              <LayoutDashboard className="size-4 text-muted-foreground" />
              <span>{t('dashboard')}</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="my-2" />
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="cursor-pointer rounded-lg px-2 py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <LogOut className="mr-2 size-4" />
          {isLoggingOut ? t('signingOut') : t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
