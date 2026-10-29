import { randomInt } from 'node:crypto';

import { expect, expectNoA11yViolations, test } from './support/fixtures';
import { createPublishedJob, employerCompanyIdsForEmail } from './support/db';
import { resetRateLimits } from './support/redis';
import { gotoHydrated } from './support/ui';

// Design review 01 "Later": shorter employer signup, one workspace shell,
// dark mode.

test.beforeEach(async () => {
  await resetRateLimits();
});

test('a Serbian company signs up in two steps', async ({ page }) => {
  const email = `dva-koraka-${randomInt(1e6, 9e6)}@example.com`;
  await gotoHydrated(page, '/sr/employer/register', '#reg-email');
  await expect(page.getByText('1. Nalog')).toBeVisible();
  await expect(page.getByText('2. Kompanija')).toBeVisible();
  await expect(page.getByText('3.', { exact: false })).toHaveCount(0);

  await page.locator('#reg-name').fill('Jelena Vlasnik');
  await page.locator('#reg-email').fill(email);
  await page.locator('#reg-password').fill('Lozinka123!');
  await page.getByRole('button', { name: 'Dalje' }).click();

  await page.locator('#reg-legal').fill(`Pekara ${randomInt(1e6, 9e6)} d.o.o.`);
  await page.locator('#reg-pib').fill(String(randomInt(100000000, 999999999)));
  await page.locator('#reg-mb').fill(String(randomInt(10000000, 99999999)));
  await page.locator('#reg-a1').fill('Kralja Petra 5');
  await page.locator('#reg-zip').fill('21000');
  await page.locator('#reg-city').fill('Novi Sad');
  await expect(page.locator('#reg-bille')).toHaveValue(email);
  await page.getByRole('button', { name: 'Napravi nalog' }).click();

  await expect(page).toHaveURL(/\/sr\/employer$/);
  expect(await employerCompanyIdsForEmail(email)).toHaveLength(1);
  // One shell for every signed-in area: the current section is announced.
  await expect(
    page
      .getByRole('navigation', { name: 'Radni prostor poslodavca' })
      .locator('a[aria-current="page"]'),
  ).toHaveCount(1);
  await expect(page.getByRole('main')).toHaveCount(1);
});

test('a foreign company also gets the bank details step', async ({ page }) => {
  await gotoHydrated(page, '/sr/employer/register', '#reg-email');
  await page.locator('#reg-name').fill('Hans Firma');
  await page
    .locator('#reg-email')
    .fill(`gmbh-${randomInt(1e6, 9e6)}@example.com`);
  await page.locator('#reg-password').fill('Lozinka123!');
  await page.getByRole('button', { name: 'Dalje' }).click();
  await page.locator('#reg-country').click();
  await page.getByRole('option', { name: 'DE', exact: true }).click();
  await expect(page.getByText('3. Banka i fakturisanje')).toBeVisible();
});

test.describe('dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test('follows the system setting before the first paint', async ({
    page,
  }) => {
    await page.goto('/sr');
    expect(
      await page.evaluate(() =>
        document.documentElement.classList.contains('dark'),
      ),
    ).toBe(true);
  });

  for (const path of [
    '/sr',
    '/sr/jobs',
    '/sr/sign-in',
    '/sr/employer/register',
  ]) {
    test(`${path} has no WCAG A/AA violations in dark mode`, async ({
      page,
    }) => {
      await createPublishedJob();
      await page.goto(path);
      await expectNoA11yViolations(page);
    });
  }

  test('the theme button switches to light and remembers it', async ({
    page,
  }) => {
    await gotoHydrated(page, '/sr', 'header button[aria-label^="Tema"]');
    const toggle = page
      .locator('header')
      .getByRole('button', { name: /^Tema/ });
    await expect(toggle).toHaveAccessibleName(/sistem/);
    await toggle.click();
    await expect(toggle).toHaveAccessibleName(/svetla/);
    await page.reload();
    expect(
      await page.evaluate(() =>
        document.documentElement.classList.contains('dark'),
      ),
    ).toBe(false);
  });
});
