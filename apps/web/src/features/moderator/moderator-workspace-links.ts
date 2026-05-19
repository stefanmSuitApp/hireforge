export type ModeratorWorkspaceNavKey =
  | 'queue'
  | 'companies'
  | 'employers'
  | 'billing';

export type ModeratorWorkspaceMessageKey =
  | 'navQueue'
  | 'navCompanies'
  | 'navEmployers'
  | 'navBillingPending';

export const MODERATOR_WORKSPACE_LINKS: ReadonlyArray<{
  href: string;
  navKey: ModeratorWorkspaceNavKey;
  messageKey: ModeratorWorkspaceMessageKey;
}> = [
  { href: '/moderator', navKey: 'queue', messageKey: 'navQueue' },
  {
    href: '/moderator/companies',
    navKey: 'companies',
    messageKey: 'navCompanies',
  },
  {
    href: '/moderator/employers',
    navKey: 'employers',
    messageKey: 'navEmployers',
  },
  {
    href: '/moderator/billing/pending-payments',
    navKey: 'billing',
    messageKey: 'navBillingPending',
  },
];

export function getModeratorWorkspaceNavKey(
  pathname: string,
): ModeratorWorkspaceNavKey {
  if (pathname.startsWith('/moderator/billing/')) {
    return 'billing';
  }
  if (pathname.startsWith('/moderator/employers')) {
    return 'employers';
  }
  if (
    pathname.startsWith('/moderator/companies') ||
    pathname.startsWith('/moderator/jobs/new')
  ) {
    return 'companies';
  }
  return 'queue';
}
