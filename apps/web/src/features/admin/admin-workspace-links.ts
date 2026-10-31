export type AdminWorkspaceNavKey =
  | 'overview'
  | 'users'
  | 'taxonomy'
  | 'promoCodes'
  | 'campaigns'
  | 'billing'
  | 'audit';

export type AdminWorkspaceMessageKey =
  | 'navOverview'
  | 'navUsers'
  | 'navTaxonomy'
  | 'navPromoCodes'
  | 'navCampaigns'
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
    href: '/admin/campaigns',
    navKey: 'campaigns',
    messageKey: 'navCampaigns',
  },
  {
    href: '/admin/billing/enterprise-pending',
    navKey: 'billing',
    messageKey: 'navBillingEnterprise',
  },
  { href: '/admin/audit', navKey: 'audit', messageKey: 'navAudit' },
];

/**
 * `null` outside `/admin`: admins also see the moderator links, and use the
 * moderator Kompanije screens (with the admin-only owner change there).
 */
export function getAdminWorkspaceNavKey(
  pathname: string,
): AdminWorkspaceNavKey | null {
  if (pathname !== '/admin' && !pathname.startsWith('/admin/')) {
    return null;
  }
  if (pathname.startsWith('/admin/users')) {
    return 'users';
  }
  if (pathname.startsWith('/admin/taxonomy')) {
    return 'taxonomy';
  }
  if (pathname.startsWith('/admin/promo-codes')) {
    return 'promoCodes';
  }
  if (pathname.startsWith('/admin/campaigns')) {
    return 'campaigns';
  }
  if (pathname.startsWith('/admin/billing/')) {
    return 'billing';
  }
  if (pathname.startsWith('/admin/audit')) {
    return 'audit';
  }
  return 'overview';
}
