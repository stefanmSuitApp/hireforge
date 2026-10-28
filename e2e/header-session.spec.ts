import { randomInt } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';

import { loginModerator, registerEmployerClaiming } from './support/auth-ui';
import { createOwnedCompany } from './support/db';
import { resetRateLimits } from './support/redis';
import { gotoHydrated } from './support/ui';

// The header lives in the shared layout: it must follow the session after
// client-side auth flows, on public pages, and for every account state.

test.beforeEach(async () => {
  await resetRateLimits();
});

async function registerCandidate(page: Page, fullName: string) {
  const email = `header-${randomInt(1e6, 9e6)}@example.com`;
  await gotoHydrated(page, '/sr/candidate/register', '#candidate-reg-email');
  await page.locator('#candidate-reg-name').fill(fullName);
  await page.locator('#candidate-reg-email').fill(email);
  await page.locator('#candidate-reg-password').fill('Lozinka123!');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/sr\/candidate$/);
  return email;
}

async function expectSignedIn(page: Page, accountName: string) {
  const header = page.locator('header').first();
  await expect(header.getByRole('button', { name: accountName })).toBeVisible();
  await expect(
    header.getByRole('link', { name: 'Prijava', exact: true }),
  ).toHaveCount(0);
}

test('the header shows the account right after candidate signup', async ({
  page,
}) => {
  await registerCandidate(page, 'Ana Header');
  await expectSignedIn(page, 'Ana Header');
});

test('the header shows the account right after candidate login', async ({
  page,
  context,
}) => {
  const email = await registerCandidate(page, 'Bora Login');
  await context.clearCookies();

  await gotoHydrated(page, '/sr/candidate/login', '#candidate-email');
  await page.locator('#candidate-email').fill(email);
  await page.locator('#candidate-password').fill('Lozinka123!');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/sr\/candidate$/);
  await expectSignedIn(page, 'Bora Login');
});

test('the header shows the account right after staff login', async ({
  page,
}) => {
  await loginModerator(page);
  await expectSignedIn(page, 'moderator');
});

test('an expired access cookie is renewed on public pages too', async ({
  page,
  context,
}) => {
  await registerCandidate(page, 'Ceca Expired');
  // The access cookie lives 14 minutes; the refresh cookie two weeks.
  await context.clearCookies({ name: 'hf_candidate_access' });

  await page.goto('/sr/jobs');
  await expectSignedIn(page, 'Ceca Expired');
});

test('an employer waiting for company approval is shown as signed in', async ({
  page,
}) => {
  const company = await createOwnedCompany();
  await registerEmployerClaiming(
    page,
    `pending-${randomInt(1e6, 9e6)}@example.com`,
    company,
  );
  await expect(page).toHaveURL(/\/sr\/employer\/pending$/);
  await expectSignedIn(page, company.legalName);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('the menu has a sign-out that ends the session', async ({
    page,
    context,
  }) => {
    await registerCandidate(page, 'Dara Phone');
    const menu = page.getByRole('button', { name: 'Glavna navigacija' });

    await menu.click();
    await page.getByRole('button', { name: 'Odjavi se' }).click();

    await expect(page).toHaveURL(/\/sr$/);
    const names = (await context.cookies()).map((c) => c.name);
    expect(names).not.toContain('hf_candidate_refresh');
    await page.getByRole('button', { name: 'Glavna navigacija' }).click();
    // The menu is a dialog (rendered outside the header).
    await expect(
      page
        .getByRole('dialog', { name: 'Glavna navigacija' })
        .getByRole('link', { name: 'Prijava', exact: true }),
    ).toBeVisible();
  });
});
