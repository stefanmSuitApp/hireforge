import { randomInt } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';

import {
  authTokenCount,
  emailVerifiedAt,
  plantAuthToken,
  SEED_JOB_ID,
} from './support/db';

async function registerCandidate(page: Page, email: string, password: string) {
  await page.goto('/sr/candidate/register');
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

  // Signup issued a verification link.
  expect(await authTokenCount(email, 'email_verify')).toBe(1);

  // Apply is gated, with a way to get a new email.
  await page.goto(`/sr/jobs/${SEED_JOB_ID}/apply`);
  await expect(
    page.getByText('Potvrdite e-poštu da biste se prijavili'),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Pošalji ponovo e-poruku za potvrdu' })
    .click();
  await expect(page.getByText('Poslato.', { exact: false })).toBeVisible();
  expect(await authTokenCount(email, 'email_verify')).toBe(2);

  // Clicking the link in the email confirms the address.
  const token = await plantAuthToken(email, 'email_verify');
  await page.goto(`/sr/verify-email?token=${token}`);
  await expect(
    page.getByRole('heading', { name: 'E-pošta je potvrđena' }),
  ).toBeVisible();
  expect(await emailVerifiedAt(email)).not.toBeNull();

  // The same link does not work twice.
  await page.goto(`/sr/verify-email?token=${token}`);
  await expect(
    page.getByRole('heading', { name: 'Link nije važeći' }),
  ).toBeVisible();

  // Gate is gone on the apply page.
  await page.goto(`/sr/jobs/${SEED_JOB_ID}/apply`);
  await expect(
    page.getByText('Potvrdite e-poštu da biste se prijavili'),
  ).toHaveCount(0);
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
  await page.getByRole('link', { name: 'Zaboravili ste lozinku?' }).click();
  await expect(page).toHaveURL(/\/sr\/forgot-password$/);
  await page.getByLabel('E-pošta').fill(email);
  await page.getByRole('button', { name: 'Pošalji link' }).click();
  await expect(
    page.getByText('Ako nalog sa tom adresom postoji', { exact: false }),
  ).toBeVisible();
  expect(await authTokenCount(email, 'password_reset')).toBe(1);

  const token = await plantAuthToken(email, 'password_reset');
  await page.goto(`/sr/reset-password?token=${token}`);
  await page.getByLabel('Nova lozinka').fill('NovaLozinka9!');
  await page.getByLabel('Ponovite lozinku').fill('NovaLozinka9!');
  await page.getByRole('button', { name: 'Sačuvaj lozinku' }).click();
  await expect(
    page.getByText('Lozinka je promenjena', { exact: false }),
  ).toBeVisible();
  // Using the emailed link also proves the mailbox.
  expect(await emailVerifiedAt(email)).not.toBeNull();

  // Old password no longer works; the new one does.
  await page.goto('/sr/candidate/login');
  await page.locator('#candidate-email').fill(email);
  await page.locator('#candidate-password').fill('StaraLozinka1!');
  await page.getByRole('button', { name: 'Prijavi se' }).click();
  await expect(page.getByRole('alert')).toBeVisible();

  await page.locator('#candidate-password').fill('NovaLozinka9!');
  await page.getByRole('button', { name: 'Prijavi se' }).click();
  await expect(page).toHaveURL(/\/sr\/candidate$/);
});

test('reset request does not reveal whether an account exists', async ({
  page,
}) => {
  await page.goto('/sr/forgot-password');
  await page
    .getByLabel('E-pošta')
    .fill(`nobody-${randomInt(1e6, 9e6)}@example.com`);
  await page.getByRole('button', { name: 'Pošalji link' }).click();
  await expect(
    page.getByText('Ako nalog sa tom adresom postoji', { exact: false }),
  ).toBeVisible();
});
