import { expect, test } from '@playwright/test';

import { gotoHydrated } from './support/ui';

const RESTORED = /Vraćen je sačuvan nacrt/;

// A first visit used to save the empty form as a draft and then "restore" it
// with this message (Stefan, 2026-10-29).
test('a first-time visitor sees no "draft restored" message', async ({
  page,
}) => {
  await gotoHydrated(page, '/sr/employer/register', '#reg-email');
  await expect(page.getByText(RESTORED)).toHaveCount(0);
  await page.reload();
  await gotoHydrated(page, '/sr/employer/register', '#reg-email');
  await expect(page.getByText(RESTORED)).toHaveCount(0);
});

test('what was typed is still restored after a reload', async ({ page }) => {
  await gotoHydrated(page, '/sr/employer/register', '#reg-email');
  await page.locator('#reg-email').fill('nacrt@firma.example');
  await page.reload();
  await gotoHydrated(page, '/sr/employer/register', '#reg-email');
  await expect(page.getByText(RESTORED)).toBeVisible();
  await expect(page.locator('#reg-email')).toHaveValue('nacrt@firma.example');
});
