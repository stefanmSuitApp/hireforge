import { expect, test } from '@playwright/test';

import { SEED_ADMIN_EMAIL, SEED_PASSWORD } from './support/db';
import { resetRateLimits } from './support/redis';
import { gotoHydrated, waitHydrated } from './support/ui';

test.beforeEach(async () => {
  await resetRateLimits();
});

// An admin sees the moderator tabs and the admin tabs in one bar; each group
// used to fall back to its first tab (Red / Pregled) for the other group's
// pages, so two tabs looked selected (Stefan, 2026-10-29).
test('admin nav marks only the tab of the page you are on', async ({
  page,
}) => {
  await gotoHydrated(page, '/sr/moderator/login', '#mod-email');
  await page.locator('#mod-email').fill(SEED_ADMIN_EMAIL);
  await page.locator('#mod-password').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/sr\/(moderator|admin)$/);

  // The bar with both groups (the admin group has the audit log link).
  const nav = page
    .getByRole('navigation')
    .filter({ has: page.locator('a[href="/sr/admin/audit"]') })
    .first();
  await waitHydrated(page, 'a[href="/sr/admin/audit"]');

  for (const href of [
    '/sr/admin/promo-codes',
    '/sr/admin/taxonomy',
    '/sr/moderator/employers',
    '/sr/admin/users',
    '/sr/moderator/companies',
    '/sr/moderator',
    '/sr/admin',
  ]) {
    await nav.locator(`a[href="${href}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    const current = nav.locator('a[aria-current="page"]');
    await expect(current, `on ${href}`).toHaveCount(1);
    await expect(current).toHaveAttribute('href', href);
  }
});

test('phone menu marks only the current page too', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await gotoHydrated(page, '/sr/moderator/login', '#mod-email');
  await page.locator('#mod-email').fill(SEED_ADMIN_EMAIL);
  await page.locator('#mod-password').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/sr\/(moderator|admin)$/);

  for (const href of ['/sr/admin/promo-codes', '/sr/moderator/employers']) {
    await gotoHydrated(page, href, 'div.md\\:hidden button');
    await page.locator('div.md\\:hidden button').click();
    // The staff links sit under the main navigation, in the same sheet.
    const current = page.getByRole('dialog').locator('a[aria-current="page"]');
    await expect(current, `on ${href}`).toHaveCount(1);
    await expect(current).toHaveAttribute('href', href);
    await page.keyboard.press('Escape');
  }
});
