import { describe, expect, it } from 'vitest';

import {
  getAuthRedirectPathname,
  isPublicAuthPath,
  isSessionRefreshPath,
} from '@/middleware/auth-gate';
import { getLocaleFromPathname } from '@/middleware/locale-path';

describe('locale-aware session path helpers', () => {
  it('extracts supported locales from localized paths', () => {
    expect(getLocaleFromPathname('/sr/employer')).toBe('sr');
    expect(getLocaleFromPathname('/en/moderator/jobs')).toBe('en');
    expect(getLocaleFromPathname('/de/employer')).toBeNull();
  });

  it('renews sessions on every localized page except the auth pages', () => {
    // Public pages show the session in the header too.
    expect(isSessionRefreshPath('/sr')).toBe(true);
    expect(isSessionRefreshPath('/sr/jobs')).toBe(true);
    expect(isSessionRefreshPath('/en/companies/devlegion')).toBe(true);
    expect(isSessionRefreshPath('/sr/employer/jobs/123/edit')).toBe(true);
    expect(isSessionRefreshPath('/en/moderator/jobs/123')).toBe(true);
    expect(isSessionRefreshPath('/sr/admin/users')).toBe(true);
    expect(isSessionRefreshPath('/sr/employer/login')).toBe(false);
    expect(isSessionRefreshPath('/en/candidate/register')).toBe(false);
    expect(isSessionRefreshPath('/sr/moderator/login')).toBe(false);
    expect(isSessionRefreshPath('/foo/moderator')).toBe(false);
  });

  it('identifies localized public auth pages', () => {
    expect(isPublicAuthPath('/sr/candidate/login')).toBe(true);
    expect(isPublicAuthPath('/en/employer/register')).toBe(true);
    expect(isPublicAuthPath('/en/moderator/login')).toBe(true);
    expect(isPublicAuthPath('/en/employer')).toBe(false);
  });

  it('redirects authenticated users away from auth pages by role priority', () => {
    const request = {
      nextUrl: { pathname: '/sr/employer/login' },
      cookies: {
        has: (name: string) =>
          name === 'hf_staff_access' || name === 'hf_candidate_refresh',
      },
    } as never;
    expect(getAuthRedirectPathname(request)).toBe('/sr/moderator');
  });
});
