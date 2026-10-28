import { randomInt } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';

import {
  companyBillingEmail,
  createOwnedCompany,
  employerCompanyIdsForEmail,
  type ExistingCompany,
  SEED_MODERATOR,
  SEED_PASSWORD,
} from './support/db';
import { expectEmail } from './support/mail';
import { resetRateLimits } from './support/redis';
import { gotoHydrated } from './support/ui';

test.beforeEach(async () => {
  await resetRateLimits();
});

/** Fills the 4-step employer signup with an existing company's PIB + MB. */
async function registerEmployerClaiming(
  page: Page,
  email: string,
  company: ExistingCompany,
): Promise<void> {
  await gotoHydrated(page, '/sr/employer/register', '#reg-email');

  await page.locator('#reg-email').fill(email);
  await page.locator('#reg-password').fill('Lozinka123!');
  await page.getByRole('button', { name: 'Dalje' }).click();

  // Unique per signup: the server also matches companies by legal name.
  await page.locator('#reg-legal').fill(`Firma ${email.split('@')[0]} d.o.o.`);
  await page.locator('#reg-pib').fill(company.pib);
  await page.locator('#reg-mb').fill(company.mb);
  await page.getByRole('button', { name: 'Dalje' }).click();

  await page.locator('#reg-a1').fill('Bulevar 1');
  await page.locator('#reg-zip').fill('11000');
  await page.locator('#reg-city').fill('Beograd');
  await page.getByRole('button', { name: 'Dalje' }).click();

  await page.locator('#reg-bille').fill(`billing-${email}`);
  await page.locator('#reg-billn').fill('Napadač');
  await page.getByRole('button', { name: 'Napravi nalog' }).click();
}

async function loginModerator(page: Page): Promise<void> {
  await gotoHydrated(page, '/sr/moderator/login', '#mod-email');
  await page.locator('#mod-email').fill(SEED_MODERATOR.email);
  await page.locator('#mod-password').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();
  // Exact match: a looser pattern also matches /sr/moderator/login itself.
  await expect(page).toHaveURL(/\/sr\/moderator$/);
}

test('employer signup with a new company goes straight to the workspace', async ({
  page,
}) => {
  const suffix = randomInt(1e6, 9e6);
  const email = `newco-${suffix}@example.com`;
  await registerEmployerClaiming(page, email, {
    id: '',
    legalName: '',
    pib: String(randomInt(100000000, 999999999)),
    mb: String(randomInt(10000000, 99999999)),
  });
  await expect(page).toHaveURL(/\/sr\/employer$/);
  expect(await employerCompanyIdsForEmail(email)).toHaveLength(1);
});

test.describe('employer signup matching an existing company', () => {
  test('waits for moderator approval instead of joining the company', async ({
    browser,
  }) => {
    const company = await createOwnedCompany();
    const email = `claimant-${randomInt(1e6, 9e6)}@example.com`;

    const employerCtx = await browser.newContext();
    const employer = await employerCtx.newPage();
    await registerEmployerClaiming(employer, email, company);

    // Lands on the pending screen, not inside the company's workspace.
    await expect(employer).toHaveURL(/\/sr\/employer\/pending/);
    await expect(
      employer.getByRole('heading', { name: 'Zahtev čeka odobrenje' }),
    ).toBeVisible();
    await expect(employer.getByText(company.legalName)).toBeVisible();
    expect(await employerCompanyIdsForEmail(email)).toEqual([]);
    // The unapproved signup must not write into the existing company row.
    expect(await companyBillingEmail(company.id)).toBe(
      'billing@victim.example',
    );

    // Workspace routes stay closed while pending.
    await employer.goto('/sr/employer/jobs');
    await expect(employer).toHaveURL(/\/sr\/employer\/pending/);

    // Assigned moderator approves from the companies screen.
    const modCtx = await browser.newContext();
    const moderator = await modCtx.newPage();
    await loginModerator(moderator);
    await moderator.goto('/sr/moderator/companies');
    const row = moderator
      .getByTestId('join-request-row')
      .filter({ hasText: email });
    await expect(row).toContainText(company.legalName);
    await row.getByRole('button', { name: 'Odobri' }).click();
    await expect(row).toHaveCount(0);

    // The requester is told by email, with a link back in.
    await expectEmail(email, /pristup kompaniji .* je odobren/);

    // Employer now gets the workspace.
    await employer.goto('/sr/employer');
    await expect(employer).toHaveURL(/\/sr\/employer$/);
    await expect(employer.getByText(company.legalName).first()).toBeVisible();
    expect(await employerCompanyIdsForEmail(email)).toEqual([company.id]);
  });

  test('rejected request never grants access', async ({ browser }) => {
    const company = await createOwnedCompany();
    const email = `rejected-${randomInt(1e6, 9e6)}@example.com`;

    const employerCtx = await browser.newContext();
    const employer = await employerCtx.newPage();
    await registerEmployerClaiming(employer, email, company);
    await expect(employer).toHaveURL(/\/sr\/employer\/pending/);

    const modCtx = await browser.newContext();
    const moderator = await modCtx.newPage();
    await loginModerator(moderator);
    await moderator.goto('/sr/moderator/companies');
    const row = moderator
      .getByTestId('join-request-row')
      .filter({ hasText: email });
    await row.getByRole('button', { name: 'Odbij' }).click();
    await expect(row).toHaveCount(0);

    await expectEmail(email, /pristup kompaniji .* nije odobren/);

    await employer.goto('/sr/employer');
    await expect(employer).toHaveURL(/\/sr\/employer\/pending/);
    await expect(
      employer.getByRole('heading', { name: 'Zahtev je odbijen' }),
    ).toBeVisible();
    expect(await employerCompanyIdsForEmail(email)).toEqual([]);
  });
});
