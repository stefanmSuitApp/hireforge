import { redirect } from 'next/navigation';
import { publicJobsEnabled } from 'shared';

import { hasAnyAuthSession } from './unified-auth';

/**
 * With `PUBLIC_JOBS=false`, anonymous visitors of the job / employer pages
 * go to sign-in (the 2026-10-27 wall). With it on (default) this is a no-op
 * and the page reads no cookies, so it can be cached.
 */
export async function requireSessionUnlessPublicJobs(
  locale: string,
  returnToPath: string,
): Promise<void> {
  if (publicJobsEnabled() || (await hasAnyAuthSession())) {
    return;
  }
  redirect(
    `/${locale}/sign-in?returnTo=${encodeURIComponent(`/${locale}${returnToPath}`)}`,
  );
}
