import type { NextRequest } from 'next/server';

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
import { getLocaleFromPathname } from '@/middleware/locale-path';

function hasStaffSession(request: NextRequest): boolean {
  return (
    request.cookies.has(STAFF_ACCESS_COOKIE) ||
    request.cookies.has(STAFF_REFRESH_COOKIE)
  );
}

function hasEmployerSession(request: NextRequest): boolean {
  return (
    request.cookies.has(EMPLOYER_ACCESS_COOKIE) ||
    request.cookies.has(EMPLOYER_REFRESH_COOKIE)
  );
}

function hasCandidateSession(request: NextRequest): boolean {
  return (
    request.cookies.has(CANDIDATE_ACCESS_COOKIE) ||
    request.cookies.has(CANDIDATE_REFRESH_COOKIE)
  );
}

export function isPublicAuthPath(pathname: string): boolean {
  const locale = getLocaleFromPathname(pathname);
  if (!locale) return false;
  return (
    pathname === `/${locale}/candidate/login` ||
    pathname === `/${locale}/candidate/register` ||
    pathname === `/${locale}/employer/login` ||
    pathname === `/${locale}/employer/register` ||
    pathname === `/${locale}/moderator/login`
  );
}

/**
 * Returns destination when a logged-in user opens public auth pages.
 * Priority favors staff > employer > candidate when stale mixed cookies exist.
 */
export function getAuthRedirectPathname(request: NextRequest): string | null {
  const locale = getLocaleFromPathname(request.nextUrl.pathname);
  if (!locale || !isPublicAuthPath(request.nextUrl.pathname)) {
    return null;
  }
  if (hasStaffSession(request)) return `/${locale}/moderator`;
  if (hasEmployerSession(request)) return `/${locale}/employer`;
  if (hasCandidateSession(request)) return `/${locale}/candidate`;
  return null;
}
