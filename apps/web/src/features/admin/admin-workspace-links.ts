export type AdminWorkspaceNavKey =
  | 'overview'
  | 'users'
  | 'taxonomy'
  | 'promoCodes'
  | 'companies'
  | 'billing'
  | 'audit';

export type AdminWorkspaceMessageKey =
  | 'navOverview'
  | 'navUsers'
  | 'navTaxonomy'
  | 'navPromoCodes'
  | 'navCompanies'
  | 'navBillingEnterprise'
  | 'navAudit';

export const ADMIN_WORKSPACE_LINKS: ReadonlyArray<{
  href: string;
  navKey: AdminWorkspaceNavKey;
  messageKey: AdminWorkspaceMessageKey;
}> = [
  { href: '/admin', navKey: 'overview', messageKey: 'navOverview' },
  { href: '/admin/users', navKey: 'users', messageKey: 'navUsers' },
  {
    href: '/admin/taxonomy',
    navKey: 'taxonomy',
    messageKey: 'navTaxonomy',
  },
  {
    href: '/admin/promo-codes',
    navKey: 'promoCodes',
    messageKey: 'navPromoCodes',
  },
  {
    href: '/admin/companies',
    navKey: 'companies',
    messageKey: 'navCompanies',
  },
  {
    href: '/admin/billing/enterprise-pending',
    navKey: 'billing',
    messageKey: 'navBillingEnterprise',
  },
  { href: '/admin/audit', navKey: 'audit', messageKey: 'navAudit' },
];

export function getAdminWorkspaceNavKey(pathname: string): AdminWorkspaceNavKey {
  if (pathname.startsWith('/admin/users')) {
    return 'users';
  }
  if (pathname.startsWith('/admin/taxonomy')) {
    return 'taxonomy';
  }
  if (pathname.startsWith('/admin/promo-codes')) {
    return 'promoCodes';
  }
  if (pathname.startsWith('/admin/companies')) {
    return 'companies';
  }
  if (pathname.startsWith('/admin/billing/')) {
    return 'billing';
  }
  if (pathname.startsWith('/admin/audit')) {
    return 'audit';
  }
  return 'overview';
}
