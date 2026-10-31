import {
  expect,
  request,
  test,
  type APIRequestContext,
} from '@playwright/test';

import {
  createPublishedJob,
  SEED_EMPLOYER_VERIFIED,
  SEED_MODERATOR,
  SEED_PASSWORD,
} from './support/db';
import { API_ORIGIN } from './support/ports';
import { resetRateLimits, seedNbsRateCache } from './support/redis';
import { gotoHydrated } from './support/ui';

const API = `${API_ORIGIN}/api/`;

test.beforeEach(async () => {
  await resetRateLimits();
});

// Ads had no salary at all, though it's the first thing candidates look for.
test('candidates see the salary on the list card and on the job page', async ({
  page,
}) => {
  const job = await createPublishedJob({
    salary: { min: 60000, max: 80000 },
  });
  await page.goto(`/sr/jobs/${job.slug}`);
  await expect(page.getByTestId('job-salary').first()).toHaveText(
    '60.000–80.000 RSD neto mesečno',
  );
  await page.goto(`/sr/jobs?q=${encodeURIComponent(job.title)}`);
  await expect(
    page
      .getByRole('article')
      .filter({ hasText: job.title })
      .getByTestId('job-salary'),
  ).toHaveText('60.000–80.000 RSD neto mesečno');
});

async function as(path: string, email: string): Promise<APIRequestContext> {
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

test('the employer enters a salary in the job form and it is saved', async ({
  page,
}) => {
  await seedNbsRateCache();
  const employer = await as(
    'auth/employer/login',
    SEED_EMPLOYER_VERIFIED.email,
  );
  const moderator = await as('auth/staff/login', SEED_MODERATOR.email);
  const purchase = await employer.post('employer/subscriptions', {
    data: {
      companyId: SEED_EMPLOYER_VERIFIED.companyId,
      packageCode: 'tezga',
      durationDays: 30,
      currency: 'EUR',
    },
  });
  expect(purchase.ok(), await purchase.text()).toBeTruthy();
  const { subscription } = (await purchase.json()) as {
    subscription: { id: string };
  };
  const paid = await moderator.post(
    `moderator/subscriptions/${subscription.id}/mark-paid`,
    { data: {} },
  );
  expect(paid.ok(), await paid.text()).toBeTruthy();
  const draft = await employer.post('employer/jobs', {
    data: {
      title: 'Konobar za letnju baštu',
      description: 'Rad u smenama, iskustvo poželjno.',
      citySlug: 'beograd',
      workModel: 'onsite',
      employmentType: 'part_time',
      seniority: 'junior',
      subscriptionId: subscription.id,
    },
  });
  expect(draft.ok(), await draft.text()).toBeTruthy();
  const { id } = (await draft.json()) as { id: string };

  await gotoHydrated(page, '/sr/employer/login', '#employer-email');
  await page.locator('#employer-email').fill(SEED_EMPLOYER_VERIFIED.email);
  await page.locator('#employer-password').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/sr\/employer$/);

  await gotoHydrated(page, `/sr/employer/jobs/${id}/edit`, '#job-salary-min');
  await page.locator('#job-salary-min').fill('80.000');
  await page.locator('#job-salary-max').fill('70.000');
  await expect(page.getByText('„Do” ne sme biti manji')).toBeVisible();
  await page.locator('#job-salary-max').fill('95.000');
  await expect(page.getByText('„Do” ne sme biti manji')).toBeHidden();
  await page.getByRole('button', { name: 'Sačuvaj nacrt' }).click();

  await expect
    .poll(async () => {
      const res = await employer.get(`employer/jobs/${id}`);
      return ((await res.json()) as { salary: unknown }).salary;
    })
    .toEqual({ min: 80000, max: 95000, period: 'month', basis: 'net' });
  await Promise.all([employer.dispose(), moderator.dispose()]);
});
