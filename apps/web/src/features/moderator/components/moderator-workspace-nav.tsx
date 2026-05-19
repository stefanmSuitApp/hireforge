'use client';

import { useTranslations } from 'next-intl';

import {
  ADMIN_WORKSPACE_LINKS,
  getAdminWorkspaceNavKey,
} from '@/features/admin/admin-workspace-links';
import {
  getModeratorWorkspaceNavKey,
  MODERATOR_WORKSPACE_LINKS,
} from '@/features/moderator/moderator-workspace-links';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type Props = {
  staffRole: 'moderator' | 'admin';
};

export function ModeratorWorkspaceNav({ staffRole }: Props) {
  const tModerator = useTranslations('Moderator');
  const tAdmin = useTranslations('Admin');
  const pathname = usePathname();
  const moderatorCurrent = getModeratorWorkspaceNavKey(pathname);
  const adminCurrent = getAdminWorkspaceNavKey(pathname);

  return (
    <nav
      aria-label={tModerator('navAria')}
      className="sticky top-16 z-20 -mx-4 my-8 border-y border-border/70 bg-background/95 px-4 py-2 backdrop-blur"
    >
      <div className="flex flex-wrap gap-2">
        {MODERATOR_WORKSPACE_LINKS.map(({ href, navKey, messageKey }) => {
          const isActive = moderatorCurrent === navKey;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-foreground text-background'
                  : 'border border-border/70 bg-card text-foreground hover:bg-muted',
              )}
            >
              {tModerator(messageKey)}
            </Link>
          );
        })}
        {staffRole === 'admin' ? (
          <>
            <span
              aria-hidden="true"
              className="mx-1 self-stretch border-l border-border/70"
            />
            {ADMIN_WORKSPACE_LINKS.map(({ href, navKey, messageKey }) => {
              const isActive = adminCurrent === navKey;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-foreground text-background'
                      : 'border border-border/70 bg-card text-foreground hover:bg-muted',
                  )}
                >
                  {tAdmin(messageKey)}
                </Link>
              );
            })}
          </>
        ) : null}
      </div>
    </nav>
  );
}
