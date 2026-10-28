import { randomInt } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';

import { emailVerifiedAt, SEED_JOB_ID } from './support/db';
import { expectEmails, linkFrom } from './support/mail';
import { resetRateLimits } from './support/redis';
import { gotoHydrated, waitHydrated } from './support/ui';

test.beforeEach(async () => {
  await resetRateLimits();
});

async function registerCandidate(page: Page, email: string, password: string) {
  await gotoHydrated(page, '/sr/candidate/register', '#candidate-reg-email');
  await page.locator('#candidate-reg-email').fill(email);
  await page.locator('#candidate-reg-password').fill(password);
  await page.getByRole('button', { name: 'Napravi nalog' }).click();
  await expect(page).toHaveURL(/\/sr\/candidate$/);
}

test('candidate verifies email from the emailed link and can then apply', async ({
  page,
}) => {
  const email = `cand-${randomInt(1e6, 9e6)}@example.com`;
  await registerCandidate(page, email, 'Lozinka123!');

  // Signup sent a confirmation email.
  await expectEmails(email, /potvrdite e-poštu/, 1);

  // Apply is gated, with a way to get a new email.
  await gotoHydrated(page, `/sr/jobs/${SEED_JOB_ID}/apply`, 'form');
  await expect(
    page.getByText('Potvrdi e-poštu pre konkurisanja'),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Pošalji ponovo e-poruku za potvrdu' })
    .click();
  await expect(page.getByText('Poslato.', { exact: false })).toBeVisible();
  const [first, latest] = await expectEmails(email, /potvrdite e-poštu/, 2);

  // Only the newest link works: resending voids the earlier one.
  await page.goto(linkFrom(first, '/verify-email?token='));
  await expect(
    page.getByRole('heading', { name: 'Link nije važeći' }),
  ).toBeVisible();

  // Clicking the link in the newest email confirms the address.
  const link = linkFrom(latest, '/verify-email?token=');
  await page.goto(link);
  await expect(
    page.getByRole('heading', { name: 'E-pošta je potvrđena' }),
  ).toBeVisible();
  expect(await emailVerifiedAt(email)).not.toBeNull();

  // The same link does not work twice.
  await page.goto(link);
  await expect(
    page.getByRole('heading', { name: 'Link nije važeći' }),
  ).toBeVisible();

  // Gate is gone on the apply page.
  await page.goto(`/sr/jobs/${SEED_JOB_ID}/apply`);
  await expect(page.getByText('Potvrdi e-poštu pre konkurisanja')).toHaveCount(
    0,
  );
});

test('forgotten password can be reset from the login page', async ({
  browser,
}) => {
  const email = `reset-${randomInt(1e6, 9e6)}@example.com`;
  const signup = await browser.newContext();
  await registerCandidate(await signup.newPage(), email, 'StaraLozinka1!');
  await signup.close();

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/sr/candidate/login');
  await page.getByRole('link', { name: 'Zaboravljena lozinka?' }).click();
  await expect(page).toHaveURL(/\/sr\/forgot-password$/);
  await waitHydrated(page, '#forgot-email');
  await page.getByLabel('E-pošta').fill(email);
  await page.getByRole('button', { name: 'Pošalji link' }).click();
  await expect(
    page.getByText('Ako nalog sa tom adresom postoji', { exact: false }),
  ).toBeVisible();
  const [resetMail] = await expectEmails(email, /promena lozinke/, 1);

  await gotoHydrated(
    page,
    linkFrom(resetMail, '/reset-password?token='),
    '#reset-password',
  );
  await page.getByLabel('Nova lozinka').fill('NovaLozinka9!');
  await page.getByLabel('Ponovi lozinku').fill('NovaLozinka9!');
  await page.getByRole('button', { name: 'Sačuvaj lozinku' }).click();
  await expect(
    page.getByText('Lozinka je promenjena', { exact: false }),
  ).toBeVisible();
  // Using the emailed link also proves the mailbox.
  expect(await emailVerifiedAt(email)).not.toBeNull();

  // Old password no longer works; the new one does.
  await gotoHydrated(page, '/sr/candidate/login', '#candidate-email');
  await page.locator('#candidate-email').fill(email);
  await page.locator('#candidate-password').fill('StaraLozinka1!');
  await page.getByRole('button', { name: 'Prijavi se' }).click();
  await expect(page.getByRole('alert')).toBeVisible();

  await page.locator('#candidate-password').fill('NovaLozinka9!');
  await page.getByRole('button', { name: 'Prijavi se' }).click();
  await expect(page).toHaveURL(/\/sr\/candidate$/);
  await ctx.close();
});

test('reset request does not reveal whether an account exists', async ({
  page,
}) => {
  await gotoHydrated(page, '/sr/forgot-password', '#forgot-email');
  await page
    .getByLabel('E-pošta')
    .fill(`nobody-${randomInt(1e6, 9e6)}@example.com`);
  await page.getByRole('button', { name: 'Pošalji link' }).click();
  await expect(
    page.getByText('Ako nalog sa tom adresom postoji', { exact: false }),
  ).toBeVisible();
});
