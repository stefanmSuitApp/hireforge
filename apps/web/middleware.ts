import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  getEmployersAuthRedirectUrl,
  getAuthRedirectPathname,
  getJobsAuthRedirectUrl,
} from './src/middleware/auth-gate';
import { mergeCandidateRefreshIntoResponse } from './src/middleware/candidate-refresh';
import { mergeEmployerRefreshIntoResponse } from './src/middleware/employer-refresh';
import { mergeStaffRefreshIntoResponse } from './src/middleware/staff-refresh';
import { pickLocaleFromAcceptLanguage } from './src/i18n/locale-negotiation';
import { routing } from './src/i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  // Redirect logged-in users away from login pages
  const authRedirect = getAuthRedirectPathname(request);
  if (authRedirect) {
    const url = request.nextUrl.clone();
    url.pathname = authRedirect;
    return NextResponse.redirect(url);
  }

  // Protect /jobs routes - redirect unauthenticated users to sign-in
  const jobsAuthRedirect = getJobsAuthRedirectUrl(request);
  if (jobsAuthRedirect) {
    const url = request.nextUrl.clone();
    url.pathname = jobsAuthRedirect.split('?')[0];
    url.search = jobsAuthRedirect.includes('?')
      ? '?' + jobsAuthRedirect.split('?')[1]
      : '';
    return NextResponse.redirect(url);
  }

  // Protect /employers route - redirect unauthenticated users to sign-in
  const employersAuthRedirect = getEmployersAuthRedirectUrl(request);
  if (employersAuthRedirect) {
    const url = request.nextUrl.clone();
    url.pathname = employersAuthRedirect.split('?')[0];
    url.search = employersAuthRedirect.includes('?')
      ? '?' + employersAuthRedirect.split('?')[1]
      : '';
    return NextResponse.redirect(url);
  }

  if (request.nextUrl.pathname === '/') {
    const locale = pickLocaleFromAcceptLanguage(
      request.headers.get('accept-language'),
      routing.locales,
      routing.defaultLocale,
    );
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url);
  }

  const response = intlMiddleware(request);
  await mergeEmployerRefreshIntoResponse(request, response);
  await mergeCandidateRefreshIntoResponse(request, response);
  await mergeStaffRefreshIntoResponse(request, response);
  return response;
}

export const config = {
  // Include `/` explicitly — the catch-all below can miss the bare root in some setups,
  // so `/` never hit next-intl and fell through with no `app/page.tsx` → 404.
  matcher: ['/', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
