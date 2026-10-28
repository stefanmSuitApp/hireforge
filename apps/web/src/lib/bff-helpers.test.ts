// T5.3 BFF helpers: the Nest URL, the JSON POST proxy (forwards client IP and
// token, relays status/body unchanged), job URL segments, search folding.
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
import { isUuidString, publicJobUrlSegment } from './job-public-segment';
import {
  nestApiUrl,
  resolveNestPublicOrigin,
  resolveNestServerOrigin,
} from './nest-api-url';
import { proxyNestPost } from './proxy-nest-post';
import { foldSerbianLatinSearchKey } from './serbian-latin-search-fold';

let nest: StubServer;
beforeAll(async () => {
  nest = await startStubServer({
    status: 409,
    body: '{"error":{"code":"AUTH_EMAIL_EXISTS"}}',
    headers: { 'content-type': 'application/json' },
  });
});
afterAll(() => nest.close());
afterEach(() => vi.unstubAllEnvs());

describe('nestApiUrl', () => {
  it.each([
    ['http://api:4000', 'public/jobs', 'http://api:4000/api/public/jobs'],
    ['http://api:4000/', '/public/jobs', 'http://api:4000/api/public/jobs'],
    ['http://api:4000/api', 'integration', 'http://api:4000/api/integration'],
    [' https://x.rs/api/ ', 'a', 'https://x.rs/api/a'],
  ])('%j + %j → %j', (base, path, url) => {
    expect(nestApiUrl(base, path)).toBe(url);
  });

  it('no base is no URL', () => {
    expect(nestApiUrl(undefined, 'x')).toBeNull();
    expect(nestApiUrl('  ', 'x')).toBeNull();
  });
});

describe('Nest origin resolution', () => {
  it('the server prefers the internal URL, fixing a :3000 slip', () => {
    vi.stubEnv('NEST_API_URL', 'http://localhost:3000');
    expect(resolveNestServerOrigin()).toBe('http://localhost:4000');
    vi.stubEnv('NEST_API_URL', '');
    vi.stubEnv('INTERNAL_API_URL', 'http://api:4000');
    expect(resolveNestServerOrigin()).toBe('http://api:4000');
  });

  it('the public URL has a dev default but none in production', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    vi.stubEnv('NODE_ENV', 'development');
    expect(resolveNestPublicOrigin()).toBe('http://localhost:4000');
    vi.stubEnv('NODE_ENV', 'production');
    expect(resolveNestPublicOrigin()).toBeNull();
  });
});

describe('proxyNestPost', () => {
  it('forwards the JSON body, client IP and bearer token, and relays status and body unchanged', async () => {
    vi.stubEnv('NEST_API_URL', nest.url);
    const req = new Request('http://127.0.0.1:3000/api/auth/x', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '198.51.100.4',
        cookie: 'hf_access=secret',
      },
      body: JSON.stringify({ email: 'a@b.rs' }),
    });
    const res = await proxyNestPost(req, 'auth/candidate/register', 'tok');
    expect(res.status).toBe(409);
    expect(await res.text()).toBe('{"error":{"code":"AUTH_EMAIL_EXISTS"}}');
    const call = nest.requests.at(-1);
    expect(call?.path).toBe('/api/auth/candidate/register');
    expect(JSON.parse(call?.body ?? '')).toEqual({ email: 'a@b.rs' });
    expect(call?.headers['authorization']).toBe('Bearer tok');
    expect(call?.headers['x-forwarded-for']).toContain('198.51.100.4');
    // Browser cookies are never passed through to Nest.
    expect(call?.headers['cookie']).toBeUndefined();
  });

  it('a non-JSON body is sent as {}; without a token there is no Authorization', async () => {
    vi.stubEnv('NEST_API_URL', nest.url);
    await proxyNestPost(
      new Request('http://x/', { method: 'POST', body: 'not json' }),
      'auth/refresh',
    );
    expect(nest.requests.at(-1)?.body).toBe('{}');
    expect(nest.requests.at(-1)?.headers['authorization']).toBeUndefined();
  });

  it('without a configured API it answers 503', async () => {
    vi.stubEnv('NEST_API_URL', '');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    vi.stubEnv('NODE_ENV', 'production');
    const res = await proxyNestPost(
      new Request('http://x/', { method: 'POST', body: '{}' }),
      'auth/refresh',
    );
    expect(res.status).toBe(503);
  });
});

describe('job URL segments and search folding', () => {
  it('a job URL prefers the slug', () => {
    expect(publicJobUrlSegment({ slug: 'pekar-nis-x7k2', id: 'u' })).toBe(
      'pekar-nis-x7k2',
    );
    expect(publicJobUrlSegment({ slug: null, id: 'u' })).toBe('u');
  });

  it('only real UUIDs count as ids', () => {
    expect(isUuidString('30ff897a-bd6e-4e98-871a-69baf000ee37')).toBe(true);
    expect(isUuidString('pekar-nis-x7k2')).toBe(false);
  });

  it('Serbian Latin letters fold to ASCII for client-side matching', () => {
    expect(
      foldSerbianLatinSearchKey('ČAĆAK Šabac Žitište Đurđevo Džep ǅ'),
    ).toBe('cacak sabac zitiste durdevo dzep dz');
  });
});
