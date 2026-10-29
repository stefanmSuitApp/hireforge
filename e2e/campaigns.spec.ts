// P (docs/plans/EMPTY_SITE_AND_CAMPAIGNS.md): an admin starts a public
// campaign and the home page advertises it at once; pausing takes it down.
// Limited to ŠLJAKA, a package no other e2e test buys, and paused at the end
// because a running campaign applies to every purchase.
import { expect } from '@playwright/test';

import { SEED_ADMIN_EMAIL, SEED_PASSWORD } from './support/db';
import { test } from './support/fixtures';
import { gotoHydrated } from './support/ui';

test('an admin starts a free week; the home banner shows it; pausing removes it', async ({
  page,
}) => {
  await gotoHydrated(page, '/sr/moderator/login', '#mod-email');
  await page.locator('#mod-email').fill(SEED_ADMIN_EMAIL);
  await page.locator('#mod-password').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login/);

  await gotoHydrated(page, '/sr/admin/campaigns', 'h2');
  const form = page.getByRole('form', { name: 'Nova kampanja' });
  await form.getByLabel('Besplatno').check();
  await form.getByLabel('7 dana').check();
  await form.getByLabel('SLJAKA').check();
  await expect(page.getByTestId('campaign-window')).toContainText('Traje od');
  await form.getByRole('button', { name: 'Pokreni kampanju' }).click();

  const row = page.getByRole('listitem').filter({ hasText: 'Traje' });
  await expect(row).toBeVisible();

  try {
    await page.goto('/sr');
    await expect(
      page.getByRole('link', { name: /Besplatno objavljivanje oglasa do/ }),
    ).toBeVisible();
    // Redesign A (2026-10-29): the promo bar is site-wide, above the header.
    await page.goto('/sr/jobs');
    await expect(
      page
        .getByRole('region', { name: 'Promocija' })
        .getByRole('link', { name: /Besplatno objavljivanje oglasa do/ }),
    ).toBeVisible();
  } finally {
    await page.goto('/sr/admin/campaigns');
    await page
      .getByRole('listitem')
      .filter({ hasText: 'Traje' })
      .getByRole('button', { name: 'Pauziraj' })
      .click();
    await expect(
      page.getByRole('listitem').filter({ hasText: 'Pauzirana' }),
    ).toBeVisible();
  }

  await page.goto('/sr');
  await expect(
    page.getByRole('link', { name: /Besplatno objavljivanje oglasa do/ }),
  ).toHaveCount(0);
});
