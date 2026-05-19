import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { EMPLOYER_ACCESS_COOKIE } from '@/lib/employer-session';
import {
  fetchEmployerWorkspace,
  type EmployerWorkspacePayload,
} from '@/lib/fetch-employer-workspace';

type EmployerSession = {
  accessToken: string;
  workspace: EmployerWorkspacePayload;
};

/**
 * Per-request memoization keyed by access token so different employer sessions
 * never share a cached `GET employer/workspace` payload.
 */
const loadWorkspaceForAccessToken = cache(
  async (
    accessToken: string,
  ): Promise<
    | { ok: true; data: EmployerWorkspacePayload }
    | { ok: false; status: number; body: string }
  > => {
    return fetchEmployerWorkspace(accessToken);
  },
);

export async function loadEmployerSessionOrRedirect(): Promise<EmployerSession> {
  const cookieStore = await cookies();
  const access = cookieStore.get(EMPLOYER_ACCESS_COOKIE)?.value;
  const locale = await getLocale();
  if (!access) {
    redirect(`/${locale}/employer/login`);
  }
  const workspace = await loadWorkspaceForAccessToken(access);
  if (!workspace.ok) {
    redirect(`/${locale}/employer/login`);
  }
  return {
    accessToken: access,
    workspace: workspace.data,
  };
}

export async function loadEmployerWorkspaceOrRedirect() {
  const session = await loadEmployerSessionOrRedirect();
  return session.workspace;
}
