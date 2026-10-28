// T5.3 the per-role refresh middlewares: refresh on every localized page but
// the sign-in pages, only when the access token is missing or about to
// expire, set the new cookies HttpOnly, SameSite=Lax, Secure in production,
// and drop them when Nest refuses the refresh. Which paths refresh:
// session-paths.test.ts.
import { NextRequest, NextResponse } from 'next/server';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { startStubServer, type StubServer } from 'testing';
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
import { mergeCandidateRefreshIntoResponse } from './candidate-refresh';
import { mergeEmployerRefreshIntoResponse } from './employer-refresh';
import { mergeStaffRefreshIntoResponse } from './staff-refresh';

const jwt = (expSecondsFromNow: number) =>
  `h.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expSecondsFromNow })).toString('base64url')}.s`;

let nest: StubServer;
beforeAll(async () => {
  nest = await startStubServer();
  process.env['NEST_API_URL'] = nest.url;
});
afterAll(async () => {
  delete process.env['NEST_API_URL'];
  await nest.close();
});
afterEach(() => {
  vi.unstubAllEnvs();
  nest.reply({
    status: 201,
    body: JSON.stringify({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    }),
  });
});

const ROLES = [
  {
    role: 'candidate',
    page: '/sr/candidate/applications',
    signIn: '/sr/candidate/login',
    merge: mergeCandidateRefreshIntoResponse,
    access: CANDIDATE_ACCESS_COOKIE,
    refresh: CANDIDATE_REFRESH_COOKIE,
  },
  {
    role: 'employer',
    page: '/en/employer/jobs',
    signIn: '/en/employer/login',
    merge: mergeEmployerRefreshIntoResponse,
    access: EMPLOYER_ACCESS_COOKIE,
    refresh: EMPLOYER_REFRESH_COOKIE,
  },
  {
    role: 'staff',
    page: '/sr/moderator/jobs',
    signIn: '/sr/moderator/login',
    merge: mergeStaffRefreshIntoResponse,
    access: STAFF_ACCESS_COOKIE,
    refresh: STAFF_REFRESH_COOKIE,
  },
] as const;

function request(path: string, cookies: Record<string, string>) {
  const req = new NextRequest(`http://127.0.0.1:3000${path}`, {
    headers: { 'x-forwarded-for': '203.0.113.9' },
  });
  for (const [k, v] of Object.entries(cookies)) req.cookies.set(k, v);
  return req;
}

describe.each(ROLES)(
  '$role refresh',
  ({ page, signIn, merge, access, refresh }) => {
    it('an expiring access token is refreshed; the new cookies are HttpOnly, Lax, path /', async () => {
      nest.reply({
        status: 201,
        body: JSON.stringify({
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
        }),
      });
      const res = NextResponse.next();
      await merge(
        request(page, { [access]: jwt(30), [refresh]: 'old-refresh' }),
        res,
      );
      const set = res.cookies.get(access);
      expect(set).toMatchObject({
        value: 'new-access',
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false,
      });
      expect(res.cookies.get(refresh)?.value).toBe('new-refresh');
      const call = nest.requests.at(-1);
      expect(call?.path).toBe('/api/auth/refresh');
      expect(JSON.parse(call?.body ?? '{}')).toEqual({
        refreshToken: 'old-refresh',
      });
      expect(call?.headers['x-forwarded-for']).toContain('203.0.113.9');
    });

    it('in production the cookies are Secure', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const res = NextResponse.next();
      await merge(request(page, { [refresh]: 'old-refresh' }), res);
      expect(res.cookies.get(access)?.secure).toBe(true);
      expect(res.cookies.get(refresh)?.secure).toBe(true);
    });

    it('a fresh access token is left alone (no call to Nest)', async () => {
      const before = nest.requests.length;
      const res = NextResponse.next();
      await merge(request(page, { [access]: jwt(600), [refresh]: 'r' }), res);
      expect(nest.requests.length).toBe(before);
      expect(res.cookies.get(access)).toBeUndefined();
    });

    it('public pages refresh too (the header shows who is signed in)', async () => {
      const res = NextResponse.next();
      await merge(request('/sr/jobs', { [refresh]: 'r' }), res);
      expect(res.cookies.get(access)?.value).toBe('new-access');
    });

    it('without a refresh cookie, on sign-in pages or outside a locale, nothing happens', async () => {
      const before = nest.requests.length;
      const res = NextResponse.next();
      await merge(request(page, {}), res);
      await merge(request(signIn, { [refresh]: 'r' }), res);
      await merge(request('/robots.txt', { [refresh]: 'r' }), res);
      expect(nest.requests.length).toBe(before);
      expect(res.cookies.get(access)).toBeUndefined();
    });

    it('a refused refresh drops both cookies, so pages stop retrying', async () => {
      nest.reply({
        status: 401,
        body: '{"error":{"code":"AUTH_REFRESH_INVALID"}}',
      });
      const res = NextResponse.next();
      await merge(
        request(page, { [access]: 'not-a-jwt', [refresh]: 'r' }),
        res,
      );
      expect(res.cookies.get(access)?.value).toBe('');
      expect(res.cookies.get(refresh)?.value).toBe('');
    });

    it('a malformed refresh answer sets no cookies', async () => {
      for (const reply of [
        { status: 201, body: 'not json' },
        { status: 201, body: '{"accessToken":"only-one"}' },
      ]) {
        nest.reply(reply);
        const res = NextResponse.next();
        await merge(
          request(page, { [access]: 'not-a-jwt', [refresh]: 'r' }),
          res,
        );
        expect(res.cookies.get(access)).toBeUndefined();
      }
    });
  },
);
