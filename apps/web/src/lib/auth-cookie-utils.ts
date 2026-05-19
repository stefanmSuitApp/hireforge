import type { ResponseCookies } from 'next/dist/compiled/@edge-runtime/cookies';

import {
  CANDIDATE_ACCESS_COOKIE,
  CANDIDATE_REFRESH_COOKIE,
} from '@/lib/candidate-session';
import {
  EMPLOYER_ACCESS_COOKIE,
  EMPLOYER_REFRESH_COOKIE,
} from '@/lib/employer-session';
import {
  STAFF_ACCESS_COOKIE,
  STAFF_REFRESH_COOKIE,
} from '@/lib/moderator-session';

export function clearEmployerSessionCookies(
  cookieStore: ResponseCookies,
): void {
  cookieStore.delete(EMPLOYER_ACCESS_COOKIE);
  cookieStore.delete(EMPLOYER_REFRESH_COOKIE);
}

export function clearCandidateSessionCookies(
  cookieStore: ResponseCookies,
): void {
  cookieStore.delete(CANDIDATE_ACCESS_COOKIE);
  cookieStore.delete(CANDIDATE_REFRESH_COOKIE);
}

export function clearStaffSessionCookies(cookieStore: ResponseCookies): void {
  cookieStore.delete(STAFF_ACCESS_COOKIE);
  cookieStore.delete(STAFF_REFRESH_COOKIE);
}

export function clearNonEmployerSessionCookies(
  cookieStore: ResponseCookies,
): void {
  clearCandidateSessionCookies(cookieStore);
  clearStaffSessionCookies(cookieStore);
}

export function clearNonCandidateSessionCookies(
  cookieStore: ResponseCookies,
): void {
  clearEmployerSessionCookies(cookieStore);
  clearStaffSessionCookies(cookieStore);
}

export function clearNonStaffSessionCookies(
  cookieStore: ResponseCookies,
): void {
  clearEmployerSessionCookies(cookieStore);
  clearCandidateSessionCookies(cookieStore);
}
