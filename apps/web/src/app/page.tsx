import { redirect } from 'next/navigation';

import { routing } from '../i18n/routing';

/** Bare `/` has no `[locale]` segment; send users to the default locale explicitly. */
export default function RootRedirect() {
  redirect(`/${routing.defaultLocale}`);
}
