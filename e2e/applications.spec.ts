import { randomInt } from 'node:crypto';

import {
  expect,
  request,
  test,
  type APIRequestContext,
} from '@playwright/test';

import { SEED_JOB_ID, SEED_PASSWORD } from './support/db';
import { expectEmails, linkFrom } from './support/mail';
import { API_ORIGIN } from './support/ports';
import { resetRateLimits } from './support/redis';

const API = `${API_ORIGIN}/api/`;
const SEED_JOB_EMPLOYER = 'employer@hireforge.local';

test.beforeEach(async () => {
  await resetRateLimits();
});

async function withToken(token: string): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: API,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
}

/** Registers, verifies via the emailed link, uploads a primary CV. */
async function readyCandidate(): Promise<{
  api: APIRequestContext;
  email: string;
}> {
  const anon = await request.newContext({ baseURL: API });
  const email = `apply-${randomInt(1e6, 9e6)}@example.com`;
  const reg = await anon.post('auth/candidate/register', {
    data: { email, password: 'Lozinka123!' },
  });
  expect(reg.ok(), await reg.text()).toBeTruthy();
  const { accessToken } = (await reg.json()) as { accessToken: string };

  const [mail] = await expectEmails(email, /potvrdite e-poštu/, 1);
  const token = new URL(
    linkFrom(mail, '/verify-email?token='),
  ).searchParams.get('token');
  const verified = await anon.post('auth/verify-email', { data: { token } });
  expect(verified.ok(), await verified.text()).toBeTruthy();
  await anon.dispose();

  const api = await withToken(accessToken);
  const upload = await api.post('candidate/resumes', {
    multipart: {
      file: {
        name: 'cv.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n% e2e test CV\n%%EOF\n'),
      },
    },
  });
  expect(upload.ok(), await upload.text()).toBeTruthy();
  return { api, email };
}

test('a double-submitted application is a clean 409, never a 500', async () => {
  const { api } = await readyCandidate();
  const [a, b] = await Promise.all([
    api.post('candidate/applications', { data: { jobId: SEED_JOB_ID } }),
    api.post('candidate/applications', { data: { jobId: SEED_JOB_ID } }),
  ]);
  const statuses = [a.status(), b.status()].sort();
  expect(statuses[0]).toBeLessThan(300);
  expect(statuses[1]).toBe(409);
  await api.dispose();
});

test('employers do not see applications the candidate withdrew', async () => {
  const { api, email } = await readyCandidate();
  const applied = await api.post('candidate/applications', {
    data: { jobId: SEED_JOB_ID },
  });
  expect(applied.ok(), await applied.text()).toBeTruthy();
  const { id } = (await applied.json()) as { id: string };

  const anon = await request.newContext({ baseURL: API });
  const login = await anon.post('auth/employer/login', {
    data: { email: SEED_JOB_EMPLOYER, password: SEED_PASSWORD },
  });
  expect(login.ok(), await login.text()).toBeTruthy();
  const employer = await withToken(
    ((await login.json()) as { accessToken: string }).accessToken,
  );
  const list = async () =>
    (
      (await (
        await employer.get(`employer/jobs/${SEED_JOB_ID}/applications`)
      ).json()) as { candidateEmail: string }[]
    ).map((r) => r.candidateEmail);

  expect(await list()).toContain(email);

  const withdrawn = await api.patch(`candidate/applications/${id}`, {
    data: { status: 'withdrawn' },
  });
  expect(withdrawn.ok(), await withdrawn.text()).toBeTruthy();
  expect(await list()).not.toContain(email);

  // Withdrawing twice is refused, not silently re-applied.
  const again = await api.patch(`candidate/applications/${id}`, {
    data: { status: 'withdrawn' },
  });
  expect(again.status()).toBe(400);

  await Promise.all([api.dispose(), employer.dispose(), anon.dispose()]);
});
