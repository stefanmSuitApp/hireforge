import {
  expect,
  request,
  test,
  type APIRequestContext,
} from '@playwright/test';

import {
  createPublishedJob,
  jobContactTaps,
  SEED_EMPLOYER_VERIFIED,
  SEED_MODERATOR,
  SEED_PASSWORD,
  setJobApplyPhone,
} from './support/db';
import { API_ORIGIN } from './support/ports';
import { resetRateLimits, seedNbsRateCache } from './support/redis';
import { gotoHydrated } from './support/ui';

const API = `${API_ORIGIN}/api/`;

test.beforeEach(async () => {
  await resetRateLimits();
});

// Hospitality hires by phone: the ad needs a call button, no account needed.
test('a guest taps "Pozovi" on a phone job; the number appears and the tap is counted', async ({
  page,
}) => {
  const job = await createPublishedJob({ featured: true });
  await setJobApplyPhone(job.id, '+381641234567');

  await gotoHydrated(page, `/sr/jobs/${job.slug}`, 'h1');
  // Not in the page until someone taps (harvesting bots don't).
  expect(await page.content()).not.toContain('641234567');
  await expect(
    page.getByRole('button', { name: 'Viber' }).first(),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Pozovi' }).first().click();
  await expect(page.getByTestId('contact-revealed').first()).toHaveText(
    '064 123 4567',
  );
  await expect
    .poll(() => jobContactTaps(job.id))
    .toEqual({
      calls: 1,
      viber: 0,
      emails: 0,
    });
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

test('the employer chooses phone apply in the job form and the number is saved', async ({
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
      title: 'Pomoćni kuvar',
      description: 'Rad u kuhinji, dve smene.',
      citySlug: 'beograd',
      workModel: 'onsite',
      employmentType: 'full_time',
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

  await gotoHydrated(page, `/sr/employer/jobs/${id}/edit`, '#job-apply-mode');
  await page.locator('#job-apply-mode').click();
  await page.getByRole('option', { name: 'Telefonom ili Viberom' }).click();
  await page.locator('#job-apply-phone').fill('064 1');
  await expect(page.getByText('Upiši srpski broj')).toBeVisible();
  await page.locator('#job-apply-phone').fill('064/123-4567');
  await page.getByRole('button', { name: 'Sačuvaj nacrt' }).click();

  await expect
    .poll(async () => {
      const res = await employer.get(`employer/jobs/${id}`);
      const body = (await res.json()) as {
        applyMode: string;
        applyPhone: string | null;
      };
      return [body.applyMode, body.applyPhone];
    })
    .toEqual(['phone', '+381641234567']);
  await Promise.all([employer.dispose(), moderator.dispose()]);
});
