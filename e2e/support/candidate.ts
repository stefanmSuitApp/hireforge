import { randomInt } from 'node:crypto';

import { expect, request, type APIRequestContext } from '@playwright/test';

import { expectEmails, linkFrom } from './mail';
import { API_ORIGIN } from './ports';

const API = `${API_ORIGIN}/api/`;

export async function withToken(token: string): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: API,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
}

/** Registers, verifies via the emailed link, uploads a primary CV. */
export async function readyCandidate(): Promise<{
  api: APIRequestContext;
  email: string;
  password: string;
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
  return { api, email, password: 'Lozinka123!' };
}
