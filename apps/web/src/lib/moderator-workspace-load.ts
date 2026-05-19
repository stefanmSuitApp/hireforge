import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { ModeratorMeResponse } from 'contracts';

import { STAFF_ACCESS_COOKIE } from '@/lib/moderator-session';
import { fetchModeratorMe } from '@/lib/fetch-moderator';

type ModeratorSession = {
  accessToken: string;
  me: ModeratorMeResponse;
};

export const loadModeratorSessionOrRedirect = cache(
  async (): Promise<ModeratorSession> => {
    const cookieStore = await cookies();
    const access = cookieStore.get(STAFF_ACCESS_COOKIE)?.value;
    const locale = await getLocale();
    if (!access) {
      redirect(`/${locale}/moderator/login`);
    }
    const me = await fetchModeratorMe(access);
    if (!me.ok) {
      redirect(`/${locale}/moderator/login`);
    }
    return {
      accessToken: access,
      me: me.data,
    };
  },
);

export const loadModeratorOrRedirect = cache(async () => {
  const session = await loadModeratorSessionOrRedirect();
  return session.me;
});
