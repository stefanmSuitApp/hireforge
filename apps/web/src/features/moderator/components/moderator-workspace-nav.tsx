'use client';

import { useTranslations } from 'next-intl';

import { WorkspaceNav } from '@/components/workspace-nav';
import {
  ADMIN_WORKSPACE_LINKS,
  getAdminWorkspaceNavKey,
} from '@/features/admin/admin-workspace-links';
import {
  getModeratorWorkspaceNavKey,
  MODERATOR_WORKSPACE_LINKS,
} from '@/features/moderator/moderator-workspace-links';
import { usePathname } from '@/i18n/navigation';

type Props = {
  staffRole: 'moderator' | 'admin';
  /** Admin area labels its nav as admin. */
  ariaLabel?: string;
};

/** Staff nav: moderator links, plus the admin links for admins. */
export function ModeratorWorkspaceNav({ staffRole, ariaLabel }: Props) {
  const tModerator = useTranslations('Moderator');
  const tAdmin = useTranslations('Admin');
  const pathname = usePathname();
  const moderatorCurrent = getModeratorWorkspaceNavKey(pathname);
  const adminCurrent = getAdminWorkspaceNavKey(pathname);
  const groups = [
    MODERATOR_WORKSPACE_LINKS.map(({ href, navKey, messageKey }) => ({
      href,
      label: tModerator(messageKey),
      active: moderatorCurrent === navKey,
    })),
  ];
  if (staffRole === 'admin') {
    groups.push(
      ADMIN_WORKSPACE_LINKS.map(({ href, navKey, messageKey }) => ({
        href,
        label: tAdmin(messageKey),
        active: adminCurrent === navKey,
      })),
    );
  }
  return (
    <WorkspaceNav
      ariaLabel={ariaLabel ?? tModerator('navAria')}
      groups={groups}
    />
  );
}
