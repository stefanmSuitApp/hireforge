import { getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { loadModeratorSessionOrRedirect } from '@/lib/moderator-workspace-load';

export const loadAdminSessionOrRedirect = cache(async () => {
  const session = await loadModeratorSessionOrRedirect();
  if (session.me.user.role !== 'admin') {
    const locale = await getLocale();
    redirect(`/${locale}/moderator`);
  }
  return session;
});
