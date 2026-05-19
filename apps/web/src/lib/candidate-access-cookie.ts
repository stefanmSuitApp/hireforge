import { cookies } from 'next/headers';

import { CANDIDATE_ACCESS_COOKIE } from '@/lib/candidate-session';

export async function getCandidateAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(CANDIDATE_ACCESS_COOKIE)?.value;
}
