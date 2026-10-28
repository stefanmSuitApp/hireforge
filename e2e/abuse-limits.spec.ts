import { randomInt } from 'node:crypto';

import {
  expect,
  request,
  test,
  type APIRequestContext,
} from '@playwright/test';

import { API_ORIGIN } from './support/ports';
import { resetRateLimits } from './support/redis';

const API = `${API_ORIGIN}/api/`;

test.beforeEach(async () => {
  await resetRateLimits();
});

async function candidateApi(): Promise<APIRequestContext> {
  const anon = await request.newContext({ baseURL: API });
  const reg = await anon.post('auth/candidate/register', {
    data: {
      email: `limits-${randomInt(1e6, 9e6)}@example.com`,
      password: 'Lozinka123!',
      fullName: 'Test Kandidat',
    },
  });
  expect(reg.ok(), await reg.text()).toBeTruthy();
  const { accessToken } = (await reg.json()) as { accessToken: string };
  await anon.dispose();
  return request.newContext({
    baseURL: API,
    extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` },
  });
}

test('the web layer does not let a URL param climb into other API routes', async ({
  request: web,
}) => {
  // Next decodes `%2F` in route params; without the guard this POST became
  // `/api/auth/staff/login` upstream.
  const res = await web.post(
    '/api/public/jobs/..%2F..%2Fauth%2Fstaff%2Flogin%3F/external-click',
    { data: { email: 'admin@hireforge.local', password: 'x' } },
  );
  expect(res.status()).not.toBe(401);
  expect(await res.text()).not.toContain('AUTH_');
});

test('CV generation is limited to 20 per hour per candidate', async () => {
  const api = await candidateApi();
  const statuses: number[] = [];
  for (let i = 0; i < 21; i++) {
    const res = await api.post('candidate/resumes/generate', {
      data: { templateCode: 'minimalan' },
    });
    statuses.push(res.status());
  }
  expect(statuses.slice(0, 20).every((s) => s < 300)).toBe(true);
  expect(statuses[20]).toBe(429);
  await api.dispose();
});

test('saving the same search twice keeps one row', async () => {
  const api = await candidateApi();
  const query = { q: 'programer', city: 'beograd' };
  const first = await api.post('candidate/saved-searches', { data: { query } });
  const second = await api.post('candidate/saved-searches', {
    data: { query },
  });
  expect(first.ok(), await first.text()).toBeTruthy();
  expect(((await second.json()) as { id: string }).id).toBe(
    ((await first.json()) as { id: string }).id,
  );
  await api.dispose();
});
