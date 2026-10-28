import { randomInt } from 'node:crypto';

import {
  expect,
  request,
  test,
  type APIRequestContext,
} from '@playwright/test';

import {
  promoRedemptionCount,
  SEED_ADMIN_EMAIL,
  SEED_EMPLOYER_VERIFIED,
  SEED_PASSWORD,
} from './support/db';
import { resetRateLimits } from './support/redis';
import { API_ORIGIN } from './support/ports';

const API = `${API_ORIGIN}/api/`;

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

function purchase(employer: APIRequestContext, promoCode: string) {
  return employer.post('employer/subscriptions', {
    data: {
      companyId: SEED_EMPLOYER_VERIFIED.companyId,
      packageCode: 'tezga',
      durationDays: 30,
      currency: 'EUR',
      promoCode,
    },
  });
}

test('a fixed RSD discount cannot be applied to a EUR purchase', async () => {
  const admin = await as('auth/staff/login', SEED_ADMIN_EMAIL);
  const employer = await as(
    'auth/employer/login',
    SEED_EMPLOYER_VERIFIED.email,
  );
  const code = `RSD${randomInt(1e5, 9e5)}`;
  const created = await admin.post('admin/promo-codes', {
    data: { code, discountType: 'fixed', value: 500000, currency: 'RSD' },
  });
  expect(created.ok(), await created.text()).toBeTruthy();

  const res = await purchase(employer, code);
  expect(res.status()).toBe(400);
  expect(await res.text()).toContain('PROMO_CURRENCY_MISMATCH');
  expect(await promoRedemptionCount(code)).toBe(0);

  // Fixed codes without a currency are refused at creation.
  const noCurrency = await admin.post('admin/promo-codes', {
    data: { code: `${code}X`, discountType: 'fixed', value: 1000 },
  });
  expect(noCurrency.status()).toBe(400);

  await Promise.all([admin.dispose(), employer.dispose()]);
});

test('parallel checkouts cannot exceed a once-per-company promo', async () => {
  const admin = await as('auth/staff/login', SEED_ADMIN_EMAIL);
  const employer = await as(
    'auth/employer/login',
    SEED_EMPLOYER_VERIFIED.email,
  );
  const code = `ONCE${randomInt(1e5, 9e5)}`;
  const created = await admin.post('admin/promo-codes', {
    data: { code, discountType: 'percent', value: 50, maxPerCompany: 1 },
  });
  expect(created.ok(), await created.text()).toBeTruthy();

  const results = await Promise.all([
    purchase(employer, code),
    purchase(employer, code),
    purchase(employer, code),
  ]);
  const ok = results.filter((r) => r.ok()).length;
  expect(ok).toBe(1);
  expect(await promoRedemptionCount(code)).toBe(1);

  await Promise.all([admin.dispose(), employer.dispose()]);
});
