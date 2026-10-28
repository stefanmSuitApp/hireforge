import { expect, request, test } from '@playwright/test';

import {
  auditRows,
  liveInvoiceCount,
  SEED_EMPLOYER_VERIFIED,
  SEED_MODERATOR,
  SEED_PASSWORD,
} from './support/db';
import { resetRateLimits, seedNbsRateCache } from './support/redis';

test.beforeEach(async () => {
  await resetRateLimits();
});

/** Talks to Nest directly (same origin as the e2e API web server). */
const API = 'http://127.0.0.1:4100/api/';

async function login(
  path: 'auth/employer/login' | 'auth/staff/login',
  email: string,
): Promise<string> {
  const ctx = await request.newContext({ baseURL: API });
  const res = await ctx.post(path, {
    data: { email, password: SEED_PASSWORD },
  });
  expect(res.ok()).toBeTruthy();
  const { accessToken } = (await res.json()) as { accessToken: string };
  await ctx.dispose();
  return accessToken;
}

test('double "mark paid" issues exactly one invoice', async () => {
  await seedNbsRateCache();
  const employerToken = await login(
    'auth/employer/login',
    SEED_EMPLOYER_VERIFIED.email,
  );
  const employer = await request.newContext({
    baseURL: API,
    extraHTTPHeaders: { Authorization: `Bearer ${employerToken}` },
  });
  const purchase = await employer.post('employer/subscriptions', {
    data: {
      companyId: SEED_EMPLOYER_VERIFIED.companyId,
      packageCode: 'tezga',
      durationDays: 30,
      currency: 'EUR',
    },
  });
  expect(purchase.status(), await purchase.text()).toBeLessThan(300);
  const body = (await purchase.json()) as {
    subscription?: { id: string };
    id?: string;
  };
  const subscriptionId = body.subscription?.id ?? body.id ?? '';
  expect(subscriptionId).not.toBe('');

  const modToken = await login('auth/staff/login', SEED_MODERATOR.email);
  const moderator = await request.newContext({
    baseURL: API,
    extraHTTPHeaders: { Authorization: `Bearer ${modToken}` },
  });

  // Two staff clicks landing at the same time.
  const [a, b] = await Promise.all([
    moderator.post(`moderator/subscriptions/${subscriptionId}/mark-paid`, {
      data: { paymentReference: 'RS-UPLATA-0001' },
    }),
    moderator.post(`moderator/subscriptions/${subscriptionId}/mark-paid`, {
      data: { paymentReference: 'RS-UPLATA-0001' },
    }),
  ]);
  const statuses = [a.status(), b.status()].sort();
  expect(statuses[0], await a.text()).toBeLessThan(300);
  expect(statuses[1]).toBeGreaterThanOrEqual(400);
  expect(await liveInvoiceCount(subscriptionId)).toBe(1);

  // Exactly one audit entry, carrying the bank reference staff entered.
  const audit = (await auditRows(subscriptionId)).filter(
    (r) => r.action === 'subscription.mark_paid',
  );
  expect(audit).toHaveLength(1);
  expect(audit[0]?.metadata?.['paymentReference']).toBe('RS-UPLATA-0001');

  await employer.dispose();
  await moderator.dispose();
});
