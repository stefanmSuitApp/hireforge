import { expect, type Page } from '@playwright/test';

import { type ExistingCompany, SEED_MODERATOR, SEED_PASSWORD } from './db';
import { gotoHydrated } from './ui';

/** Fills the (domestic, 2-step) employer signup with an existing company's PIB + MB. */
export async function registerEmployerClaiming(
  page: Page,
  email: string,
  company: ExistingCompany,
): Promise<void> {
  await gotoHydrated(page, '/sr/employer/register', '#reg-email');

  await page.locator('#reg-name').fill('Napadač');
  await page.locator('#reg-email').fill(email);
  await page.locator('#reg-password').fill('Lozinka123!');
  await page.getByRole('button', { name: 'Dalje' }).click();

  // Unique per signup: the server also matches companies by legal name.
  await page.locator('#reg-legal').fill(`Firma ${email.split('@')[0]} d.o.o.`);
  await page.locator('#reg-pib').fill(company.pib);
  await page.locator('#reg-mb').fill(company.mb);
  await page.locator('#reg-a1').fill('Bulevar 1');
  await page.locator('#reg-zip').fill('11000');
  await page.locator('#reg-city').fill('Beograd');
  // Prefilled with the account email; invoices may go elsewhere.
  await expect(page.locator('#reg-bille')).toHaveValue(email);
  await page.locator('#reg-bille').fill(`billing-${email}`);
  await page.getByRole('button', { name: 'Napravi nalog' }).click();
}

export async function loginModerator(page: Page): Promise<void> {
  await gotoHydrated(page, '/sr/moderator/login', '#mod-email');
  await page.locator('#mod-email').fill(SEED_MODERATOR.email);
  await page.locator('#mod-password').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();
  // Exact match: a looser pattern also matches /sr/moderator/login itself.
  await expect(page).toHaveURL(/\/sr\/moderator$/);
}
