import { randomInt } from 'node:crypto';

import { expect, request, test } from '@playwright/test';

import { expectEmails, linkFrom } from './support/mail';
import { resetRateLimits } from './support/redis';
import { API_ORIGIN } from './support/ports';

const API = `${API_ORIGIN}/api/`;

test.beforeEach(async () => {
  await resetRateLimits();
});

test('a password reset signs out every existing session', async () => {
  const api = await request.newContext({ baseURL: API });
  const email = `revoke-${randomInt(1e6, 9e6)}@example.com`;
  const register = await api.post('auth/candidate/register', {
    data: { email, password: 'StaraLozinka1!' },
  });
  expect(register.ok(), await register.text()).toBeTruthy();
  const { refreshToken: stolen } = (await register.json()) as {
    refreshToken: string;
  };

  // The session works before the reset.
  const before = await api.post('auth/refresh', {
    data: { refreshToken: stolen },
  });
  expect(before.ok(), await before.text()).toBeTruthy();

  // Owner resets the password through the emailed link.
  const requested = await api.post('auth/password-reset/request', {
    data: { email },
  });
  expect(requested.ok()).toBeTruthy();
  const [mail] = await expectEmails(email, /promena lozinke/, 1);
  const token = new URL(
    linkFrom(mail, '/reset-password?token='),
  ).searchParams.get('token');
  const confirmed = await api.post('auth/password-reset/confirm', {
    data: { token, password: 'NovaLozinka9!' },
  });
  expect(confirmed.ok(), await confirmed.text()).toBeTruthy();

  // The old session (e.g. a stolen refresh token) is dead.
  const after = await api.post('auth/refresh', {
    data: { refreshToken: stolen },
  });
  expect(after.status()).toBe(401);

  // Signing in again with the new password works.
  const login = await api.post('auth/candidate/login', {
    data: { email, password: 'NovaLozinka9!' },
  });
  expect(login.ok()).toBeTruthy();
  const { refreshToken: fresh } = (await login.json()) as {
    refreshToken: string;
  };
  const refreshed = await api.post('auth/refresh', {
    data: { refreshToken: fresh },
  });
  expect(refreshed.ok()).toBeTruthy();

  await api.dispose();
});
