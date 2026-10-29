// E (docs/plans/EMPTY_SITE_AND_CAMPAIGNS.md): a new employer gets a clear
// path to the first job ad, and an empty search still blames the filters
// when the site does have jobs (the e2e seed always has one).
import { randomInt } from 'node:crypto';

import { expect } from '@playwright/test';

import { test } from './support/fixtures';
import { gotoHydrated } from './support/ui';

test('a new employer sees the first-job checklist, starting with the email', async ({
  page,
}) => {
  const email = `prvi-oglas-${randomInt(100000, 999999)}@firma.example`;
  await gotoHydrated(page, '/sr/employer/register', '#reg-email');
  await page.locator('#reg-name').fill('Ana Anić');
  await page.locator('#reg-email').fill(email);
  await page.locator('#reg-password').fill('Lozinka123!');
  await page.getByRole('button', { name: 'Dalje' }).click();
  await page
    .locator('#reg-legal')
    .fill(`Prvi Oglas ${email.split('@')[0]} d.o.o.`);
  await page.locator('#reg-pib').fill(String(randomInt(100000000, 999999999)));
  await page.locator('#reg-mb').fill(String(randomInt(10000000, 99999999)));
  await page.locator('#reg-a1').fill('Bulevar 1');
  await page.locator('#reg-zip').fill('11000');
  await page.locator('#reg-city').fill('Beograd');
  await page.getByRole('button', { name: 'Napravi nalog' }).click();

  const checklist = page.getByRole('region', { name: 'Tvoj prvi oglas' });
  await expect(checklist).toBeVisible();
  await expect(checklist.getByRole('listitem')).toHaveCount(6);
  await expect(checklist.locator('[aria-current="step"]')).toContainText(
    'Potvrdi e-adresu',
  );
});

test('with jobs on the site, an empty search still points at the filters', async ({
  page,
}) => {
  await page.goto('/sr/jobs?q=nepostojeci-posao-zzz');
  await expect(
    page.getByRole('heading', { name: 'Nema oglasa za ove filtere' }),
  ).toBeVisible();
  await expect(page.getByText('Šljakam tek počinje')).toHaveCount(0);
});

// Stefan, 2026-10-29: the list/preview split only when there is a list; an
// empty state (and the launch panel) spans the page instead of half of it.
test('an empty result spans the full width on a desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/sr/jobs?q=nepostojeci-posao-zzz');
  const empty = page
    .getByRole('heading', { name: 'Nema oglasa za ove filtere' })
    .locator('..');
  // The page header spans the content column; the old split gave ~half.
  const header = page.getByRole('heading', { level: 1 }).locator('..');
  const [emptyBox, headerBox] = [
    await empty.boundingBox(),
    await header.boundingBox(),
  ];
  expect(emptyBox!.width).toBeGreaterThan(headerBox!.width - 4);
});
