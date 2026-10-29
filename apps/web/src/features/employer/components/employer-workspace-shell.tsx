import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { WorkspaceShell } from '@/components/workspace-shell';
import { ResendVerificationButton } from '@/features/auth';
import { Link } from '@/i18n/navigation';
import { loadEmployerWorkspaceOrRedirect } from '@/lib/employer-workspace-load';

import { EmployerWorkspaceNav } from './employer-workspace-nav';

type Props = { children: ReactNode };

/** Authenticated employer area: workspace header + outlet (server; auth enforced here). */
export async function EmployerWorkspaceShell({ children }: Props) {
  const workspace = await loadEmployerWorkspaceOrRedirect();
  const t = await getTranslations('Employer');

  return (
    <WorkspaceShell
      label={t('workspaceLabel')}
      badge={t('workspaceStatus')}
      title={workspace.company.legalName}
      subtitle={workspace.user.email}
      meta={
        <Link
          href={`/companies/${workspace.company.slug}`}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t('viewPublicProfile')}
        </Link>
      }
      banner={
        !workspace.user.emailVerified ? (
          <div
            className="my-6 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-foreground"
            role="status"
          >
            {t('emailVerificationBanner')}
            <ResendVerificationButton />
          </div>
        ) : null
      }
      nav={<EmployerWorkspaceNav />}
    >
      {children}
    </WorkspaceShell>
  );
}
