import { NextResponse } from 'next/server';

import { getCandidateAccessToken } from '@/lib/candidate-access-cookie';
import { getEmployerAccessToken } from '@/lib/employer-access-cookie';
import { getStaffAccessToken } from '@/lib/moderator-access-cookie';
import { proxyNestPost } from '@/lib/proxy-nest-post';

/** Resends the verification email for whichever session is signed in. */
export async function POST(req: Request) {
  const access =
    (await getCandidateAccessToken()) ??
    (await getEmployerAccessToken()) ??
    (await getStaffAccessToken());
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return proxyNestPost(req, 'auth/verify-email/resend', access);
}
