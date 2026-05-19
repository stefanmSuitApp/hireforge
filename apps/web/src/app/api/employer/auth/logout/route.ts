import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  EMPLOYER_ACCESS_COOKIE,
  EMPLOYER_REFRESH_COOKIE,
} from '@/lib/employer-session';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(EMPLOYER_ACCESS_COOKIE);
  cookieStore.delete(EMPLOYER_REFRESH_COOKIE);
  return NextResponse.json({ ok: true as const });
}
