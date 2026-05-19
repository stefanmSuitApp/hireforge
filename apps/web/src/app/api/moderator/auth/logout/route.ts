import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  STAFF_ACCESS_COOKIE,
  STAFF_REFRESH_COOKIE,
} from '@/lib/moderator-session';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(STAFF_ACCESS_COOKIE);
  cookieStore.delete(STAFF_REFRESH_COOKIE);
  return NextResponse.json({ ok: true as const });
}
