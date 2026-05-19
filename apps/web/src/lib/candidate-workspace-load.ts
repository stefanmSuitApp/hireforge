import type { CandidateMeResponse } from 'contracts';
import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { CANDIDATE_ACCESS_COOKIE } from '@/lib/candidate-session';
import { fetchCandidateMe } from '@/lib/fetch-candidate-me';

type CandidateSession = {
  accessToken: string;
  me: CandidateMeResponse;
};

export const loadCandidateSessionOrRedirect = cache(
  async (): Promise<CandidateSession> => {
    const cookieStore = await cookies();
    const access = cookieStore.get(CANDIDATE_ACCESS_COOKIE)?.value;
    const locale = await getLocale();
    if (!access) {
      redirect(`/${locale}/candidate/login`);
    }
    const me = await fetchCandidateMe(access);
    if (!me.ok) {
      redirect(`/${locale}/candidate/login`);
    }
    return {
      accessToken: access,
      me: me.data,
    };
  },
);

export const loadCandidateMeOrRedirect = cache(async () => {
  const session = await loadCandidateSessionOrRedirect();
  return session.me;
});
