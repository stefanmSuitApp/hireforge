import { cookies } from 'next/headers';

import { STAFF_ACCESS_COOKIE } from '@/lib/moderator-session';

export async function getStaffAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(STAFF_ACCESS_COOKIE)?.value;
}
