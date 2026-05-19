import { describe, expect, it } from 'vitest';

import {
  getAuthRedirectPathname,
  isPublicAuthPath,
} from '@/middleware/auth-gate';
import { isEmployerSessionPath } from '@/middleware/employer-refresh';
import { getLocaleFromPathname } from '@/middleware/locale-path';
import { isModeratorSessionPath } from '@/middleware/staff-refresh';

describe('locale-aware session path helpers', () => {
  it('extracts supported locales from localized paths', () => {
    expect(getLocaleFromPathname('/sr/employer')).toBe('sr');
    expect(getLocaleFromPathname('/en/moderator/jobs')).toBe('en');
    expect(getLocaleFromPathname('/de/employer')).toBeNull();
  });

  it('matches employer session paths but excludes public auth pages', () => {
    expect(isEmployerSessionPath('/sr/employer')).toBe(true);
    expect(isEmployerSessionPath('/en/employer/jobs/123/edit')).toBe(true);
    expect(isEmployerSessionPath('/sr/employer/login')).toBe(false);
    expect(isEmployerSessionPath('/en/employer/register')).toBe(false);
  });

  it('matches moderator session paths but excludes login', () => {
    expect(isModeratorSessionPath('/sr/moderator')).toBe(true);
    expect(isModeratorSessionPath('/en/moderator/jobs/123')).toBe(true);
    expect(isModeratorSessionPath('/sr/moderator/login')).toBe(false);
    expect(isModeratorSessionPath('/foo/moderator')).toBe(false);
  });

  it('matches admin dashboard paths for staff cookie refresh', () => {
    expect(isModeratorSessionPath('/sr/admin')).toBe(true);
    expect(isModeratorSessionPath('/en/admin/users')).toBe(true);
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
