'use client';

import { useTranslations } from 'next-intl';

import {
  EMPLOYER_WORKSPACE_LINKS,
  getEmployerWorkspaceNavKey,
} from '@/features/employer/employer-workspace-links';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export function EmployerWorkspaceNav() {
  const t = useTranslations('Employer');
  const pathname = usePathname();
  const current = getEmployerWorkspaceNavKey(pathname);

  return (
    <nav
      aria-label={t('workspaceLabel')}
      className="sticky top-16 z-20 -mx-4 mb-8 border-y border-border/70 bg-background/95 px-4 py-2 backdrop-blur my-8"
    >
      <div className="flex flex-wrap gap-2">
        {EMPLOYER_WORKSPACE_LINKS.map(({ href, navKey, messageKey }) => {
          const isActive = current === navKey;
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
              {t(messageKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
