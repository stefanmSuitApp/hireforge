import { cookies } from 'next/headers';

import { CANDIDATE_ACCESS_COOKIE } from './candidate-session';
import { EMPLOYER_ACCESS_COOKIE } from './employer-session';
import { STAFF_ACCESS_COOKIE } from './moderator-session';

/**
 * `Authorization` for public job reads. The API shows guests featured jobs
 * in full and the rest as teasers; any signed-in role's token unlocks them.
 */
export async function viewerAuthHeaders(): Promise<Record<string, string>> {
  const jar = await cookies();
  const token =
    jar.get(STAFF_ACCESS_COOKIE)?.value ??
    jar.get(EMPLOYER_ACCESS_COOKIE)?.value ??
    jar.get(CANDIDATE_ACCESS_COOKIE)?.value;
  return token ? { authorization: `Bearer ${token}` } : {};
}
