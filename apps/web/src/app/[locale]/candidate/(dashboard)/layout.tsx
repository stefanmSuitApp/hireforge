import type { ReactNode } from 'react';

import { CandidateWorkspaceShell } from '@/features/candidate';

export default function CandidateDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <CandidateWorkspaceShell>{children}</CandidateWorkspaceShell>;
}
