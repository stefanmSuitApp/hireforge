export type CandidateWorkspaceNavKey =
  | 'home'
  | 'applications'
  | 'profile'
  | 'cvBuild';

export type CandidateWorkspaceMessageKey =
  | 'workspaceNavHome'
  | 'workspaceNavApplications'
  | 'workspaceNavProfile'
  | 'workspaceNavCvBuild';

export const CANDIDATE_WORKSPACE_LINKS: ReadonlyArray<{
  href: string;
  navKey: CandidateWorkspaceNavKey;
  messageKey: CandidateWorkspaceMessageKey;
}> = [
  { href: '/candidate', navKey: 'home', messageKey: 'workspaceNavHome' },
  {
    href: '/candidate/applications',
    navKey: 'applications',
    messageKey: 'workspaceNavApplications',
  },
  {
    href: '/candidate/profile',
    navKey: 'profile',
    messageKey: 'workspaceNavProfile',
  },
  {
    href: '/candidate/cv/build',
    navKey: 'cvBuild',
    messageKey: 'workspaceNavCvBuild',
  },
];

export function getCandidateWorkspaceNavKey(
  pathname: string,
): CandidateWorkspaceNavKey {
  if (pathname.includes('/candidate/applications')) {
    return 'applications';
  }
  if (pathname.includes('/candidate/cv/build')) {
    return 'cvBuild';
  }
  if (pathname.includes('/candidate/profile')) {
    return 'profile';
  }
  return 'home';
}
