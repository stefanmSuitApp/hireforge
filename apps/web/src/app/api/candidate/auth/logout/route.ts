import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  CANDIDATE_ACCESS_COOKIE,
  CANDIDATE_REFRESH_COOKIE,
} from '@/lib/candidate-session';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(CANDIDATE_ACCESS_COOKIE);
  cookieStore.delete(CANDIDATE_REFRESH_COOKIE);
  return NextResponse.json({ ok: true as const });
}
