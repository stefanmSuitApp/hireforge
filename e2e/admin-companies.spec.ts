import { randomInt } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';

import { SEED_ADMIN_EMAIL, SEED_PASSWORD } from './support/db';
import { resetRateLimits } from './support/redis';
import { gotoHydrated } from './support/ui';

test.beforeEach(async () => {
  await resetRateLimits();
});

async function loginAdmin(page: Page) {
  await gotoHydrated(page, '/sr/moderator/login', '#mod-email');
  await page.locator('#mod-email').fill(SEED_ADMIN_EMAIL);
  await page.locator('#mod-password').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login/);
}

test('an admin works companies like a moderator, plus reassigning the owner', async ({
  page,
}) => {
  await loginAdmin(page);
  await gotoHydrated(page, '/sr/admin', 'h2');

  // One "Kompanije" in the staff nav, and it has everything.
  const nav = page.getByRole('navigation', { name: 'Admin odeljci' });
  await expect(nav.getByRole('link', { name: 'Kompanije' })).toHaveCount(1);
  await nav.getByRole('link', { name: 'Kompanije' }).click();
  await expect(page).toHaveURL(/\/sr\/moderator\/companies$/);

  await page.getByRole('link', { name: 'Nova kompanija' }).click();
  await expect(page).toHaveURL(/\/sr\/moderator\/companies\/new$/);
  const suffix = randomInt(1e6, 9e6);
  await page.locator('#new-legal').fill(`Admin ${suffix} d.o.o.`);
  await page.locator('#new-slug').fill(`admin-${suffix}`);
  await page.getByLabel('PIB').fill(String(randomInt(1e8, 9e8)));
  await page.getByRole('button', { name: 'Kreiraj kompaniju' }).click();
  await expect(page).toHaveURL(/\/sr\/moderator\/companies\/[0-9a-f-]{36}$/);
  const companyId = page.url().split('/').pop() as string;

  // The moderator tools and the admin-only owner change on one page.
  await expect(page.getByLabel('E-pošta za nalog')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Premesti moderatora' }),
  ).toBeVisible();

  // Old admin addresses still lead there.
  await page.goto('/sr/admin/companies');
  await expect(page).toHaveURL(/\/sr\/moderator\/companies$/);
  await page.goto(`/sr/admin/companies/${companyId}`);
  await expect(page).toHaveURL(
    new RegExp(`/sr/moderator/companies/${companyId}$`),
  );
});
