import { expect, test } from '@playwright/test';

import { readyCandidate } from './support/candidate';
import { createPublishedJob } from './support/db';
import { resetRateLimits } from './support/redis';
import { gotoHydrated, waitHydrated } from './support/ui';

// Design review 01 "Next": apply button, filters on phones, field errors,
// confirmations, branded 404, hero search, web font.

test.beforeEach(async () => {
  await resetRateLimits();
});

// Redesign A: above the description, or beside it in the apply box on a
// wide screen; either way not below the text.
test('the apply button is not below the job description', async ({ page }) => {
  const job = await createPublishedJob();
  await page.goto(`/sr/jobs/${job.slug}`);
  const apply = page
    .getByRole('link', { name: 'Konkuriši za ovaj posao' })
    .filter({ visible: true })
    .first();
  const description = page.getByRole('heading', { name: 'Opis pozicije' });
  const [a, d] = [await apply.boundingBox(), await description.boundingBox()];
  expect(a && d && a.y < d.y + 120).toBe(true);
});

test('a missing page is a branded 404 inside the site', async ({
  page,
  request,
}) => {
  expect((await request.get('/sr/nema/takve-stranice')).status()).toBe(404);
  await page.goto('/sr/nema/takve-stranice');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Ova stranica ne postoji' }),
  ).toBeVisible();
  await expect(page.locator('header').first()).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Pogledaj oglase' }),
  ).toHaveAttribute('href', '/sr/jobs');
});

test('the hero searches by what and where at once', async ({ page }) => {
  await gotoHydrated(page, '/sr', 'main form input[name="q"]');
  // Both fields are on screen at once (no tabs hiding one of them).
  await expect(page.getByRole('combobox', { name: 'Grad' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Reči' }).fill('konobar');
  await page.getByRole('button', { name: 'Pretraži' }).click();
  await page.waitForURL((url) => url.pathname === '/sr/jobs');
  expect(new URL(page.url()).searchParams.get('q')).toBe('konobar');
});

test('pages use the Inter web font', async ({ page }) => {
  await page.goto('/sr');
  const family = await page.evaluate(
    () => getComputedStyle(document.body).fontFamily,
  );
  expect(family).toMatch(/Inter/);
});

test('employer signup marks the field to fix and moves focus to it', async ({
  page,
}) => {
  await gotoHydrated(page, '/sr/employer/register', '#reg-email');
  await page.getByRole('button', { name: 'Dalje' }).click();
  const email = page.locator('#reg-email');
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  // Focus goes to the first field to fix (the name, above the email).
  await expect(page.locator('#reg-name')).toBeFocused();
  await expect(page.getByText('Unesi ispravnu adresu e-pošte.')).toBeVisible();
  await expect(page.locator('#reg-password')).toHaveAttribute(
    'aria-invalid',
    'true',
  );

  await page.locator('#reg-name').fill('Mira Firma');
  await email.fill('firma@example.com');
  await page.locator('#reg-password').fill('Lozinka123!');
  await page.getByRole('button', { name: 'Dalje' }).click();
  await expect(page.locator('#reg-email')).toHaveCount(0);
});

test('withdrawing an application asks first', async ({ page }) => {
  const job = await createPublishedJob();
  const { api, email, password } = await readyCandidate();
  const applied = await api.post('candidate/applications', {
    data: { jobId: job.id },
  });
  expect(applied.ok(), await applied.text()).toBeTruthy();
  await api.dispose();

  await gotoHydrated(page, '/sr/candidate/login', '#candidate-email');
  await page.locator('#candidate-email').fill(email);
  await page.locator('#candidate-password').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname === '/sr/candidate');
  await page.goto('/sr/candidate/applications');

  const row = page.getByRole('row', { name: new RegExp(job.title) });
  await waitHydrated(page, 'button[aria-label="Akcije"]');
  await row.getByRole('button', { name: 'Akcije' }).click();
  await page.getByRole('menuitem', { name: 'Povuci' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Povući prijavu?' });
  await expect(dialog).toContainText(job.title);
  await dialog.getByRole('button', { name: 'Otkaži' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(row.getByText('Povučeno')).toHaveCount(0);

  await row.getByRole('button', { name: 'Akcije' }).click();
  await page.getByRole('menuitem', { name: 'Povuci' }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Povuci prijavu' })
    .click();
  await expect(row.getByText('Povučeno')).toBeVisible();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('the apply button stays on screen at the bottom of a job page', async ({
    page,
  }) => {
    const job = await createPublishedJob();
    await page.goto(`/sr/jobs/${job.slug}`);
    const sticky = page
      .getByRole('link', { name: 'Konkuriši za ovaj posao' })
      .last();
    // At the very bottom (past the footer) only a sticky bar is still on screen.
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    await expect(sticky).toBeInViewport();
    await expect(sticky).toHaveAttribute('href', `/sr/jobs/${job.slug}/apply`);
  });

  // Stefan, 2026-10-29: the keyword search stays visible on phones; a
  // guest's extra filters are one locked button, not a dozen chips.
  test('the search and the first result share the first screen; a guest gets one filter button', async ({
    page,
  }) => {
    await createPublishedJob();
    await gotoHydrated(page, '/sr/jobs', 'main input[name="q"]');
    await expect(page.locator('main input[name="q"]')).toBeVisible();
    const card = page.locator('main article').first();
    await expect(card).toBeVisible();
    expect((await card.boundingBox())?.y ?? 9999).toBeLessThan(812);
    await expect(page.getByRole('button', { name: 'Na lokaciji' })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole('button', { name: 'Više filtera' }),
    ).toBeVisible();
  });
});
