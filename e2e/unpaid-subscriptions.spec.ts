import { randomInt } from 'node:crypto';

import {
  expect,
  request,
  test,
  type APIRequestContext,
} from '@playwright/test';

import {
  backdateSubscription,
  promoRedemptionsCounter,
  SEED_ADMIN_EMAIL,
  SEED_EMPLOYER_VERIFIED,
  SEED_PASSWORD,
  subscriptionState,
} from './support/db';
import { resetRateLimits } from './support/redis';

const API = 'http://127.0.0.1:4100/api/';

test.beforeEach(async () => {
  await resetRateLimits();
});

async function as(
  path: 'auth/employer/login' | 'auth/staff/login',
  email: string,
): Promise<APIRequestContext> {
  const anon = await request.newContext({ baseURL: API });
  const res = await anon.post(path, {
    data: { email, password: SEED_PASSWORD },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const { accessToken } = (await res.json()) as { accessToken: string };
  await anon.dispose();
  return request.newContext({
    baseURL: API,
    extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` },
  });
}

async function buy(
  employer: APIRequestContext,
  promoCode?: string,
): Promise<string> {
  const res = await employer.post('employer/subscriptions', {
    data: {
      companyId: SEED_EMPLOYER_VERIFIED.companyId,
      packageCode: 'tezga',
      durationDays: 30,
      currency: 'EUR',
      ...(promoCode ? { promoCode } : {}),
    },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  return ((await res.json()) as { subscription: { id: string } }).subscription
    .id;
}

test('an unpaid checkout is cancelled after 14 days and gives its promo back', async () => {
  const admin = await as('auth/staff/login', SEED_ADMIN_EMAIL);
  const employer = await as(
    'auth/employer/login',
    SEED_EMPLOYER_VERIFIED.email,
  );
  const code = `LAST${randomInt(1e5, 9e5)}`;
  const created = await admin.post('admin/promo-codes', {
    data: { code, discountType: 'percent', value: 20, maxRedemptions: 1 },
  });
  expect(created.ok(), await created.text()).toBeTruthy();

  const abandoned = await buy(employer, code);
  const fresh = await buy(employer);
  expect(await promoRedemptionsCounter(code)).toBe(1);

  await backdateSubscription(abandoned, 15);

  // The worker's scheduled sweep picks it up.
  await expect
    .poll(async () => (await subscriptionState(abandoned)).status, {
      timeout: 20_000,
    })
    .toBe('cancelled');
  const state = await subscriptionState(abandoned);
  expect(state.proformaVoided).toBe(true);
  expect(state.promoRedemptions).toBe(0);
  expect(await promoRedemptionsCounter(code)).toBe(0);

  // A recent unpaid checkout is left alone.
  expect((await subscriptionState(fresh)).status).toBe('pending_payment');

  await Promise.all([admin.dispose(), employer.dispose()]);
});
