import { cookies } from 'next/headers';

import { EMPLOYER_ACCESS_COOKIE } from '@/lib/employer-session';

export async function getEmployerAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(EMPLOYER_ACCESS_COOKIE)?.value;
}
