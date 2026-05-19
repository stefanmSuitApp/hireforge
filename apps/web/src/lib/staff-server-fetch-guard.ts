import { redirect } from 'next/navigation';

/**
 * After a failed server-side fetch to Nest with the staff JWT, only **401** means the session
 * is invalid. Other codes (503 unreachable API, 500, etc.) must not send the user to login.
 */
export function redirectToModeratorLoginIfUnauthorized(
  locale: string,
  status: number,
): void {
  if (status === 401) {
    redirect(`/${locale}/moderator/login`);
  }
}
