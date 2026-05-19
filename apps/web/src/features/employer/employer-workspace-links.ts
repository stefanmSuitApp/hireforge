export type EmployerWorkspaceNavKey =
  | 'overview'
  | 'listings'
  | 'packages'
  | 'company';

export type EmployerWorkspaceMessageKey =
  | 'workspaceNavOverview'
  | 'workspaceNavMyListings'
  | 'workspaceNavPackages'
  | 'workspaceNavPublicCompany';

export const EMPLOYER_WORKSPACE_LINKS: ReadonlyArray<{
  href: string;
  navKey: EmployerWorkspaceNavKey;
  messageKey: EmployerWorkspaceMessageKey;
}> = [
  { href: '/employer', navKey: 'overview', messageKey: 'workspaceNavOverview' },
  {
    href: '/employer/jobs',
    navKey: 'listings',
    messageKey: 'workspaceNavMyListings',
  },
  {
    href: '/employer/packages',
    navKey: 'packages',
    messageKey: 'workspaceNavPackages',
  },
  {
    href: '/employer/company',
    navKey: 'company',
    messageKey: 'workspaceNavPublicCompany',
  },
];

export function getEmployerWorkspaceNavKey(
  pathname: string,
): EmployerWorkspaceNavKey {
  if (pathname === '/employer/company') {
    return 'company';
  }
  if (
    pathname === '/employer/packages' ||
    pathname.startsWith('/employer/billing/')
  ) {
    return 'packages';
  }
  if (pathname === '/employer/jobs' || pathname.startsWith('/employer/jobs/')) {
    return 'listings';
  }
  return 'overview';
}

export function isEmployerWorkspacePathname(pathname: string): boolean {
  return pathname === '/employer' || pathname.startsWith('/employer/');
}
