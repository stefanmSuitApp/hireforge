import { randomInt } from 'node:crypto';

import { expect, test } from '@playwright/test';

import {
  companyBillingEmail,
  companyIdentifiers,
  createOwnedCompany,
  employerCompanyIdsForEmail,
} from './support/db';
import { loginModerator, registerEmployerClaiming } from './support/auth-ui';
import { expectEmail } from './support/mail';
import { gotoHydrated } from './support/ui';
import { resetRateLimits } from './support/redis';

test.beforeEach(async () => {
  await resetRateLimits();
});

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
    // The header names the company too; this is the pending screen's copy.
    await expect(
      employer.locator('strong', { hasText: company.legalName }),
    ).toBeVisible();
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

test('a company staff added by name gets the PIB and MB from its sign-up once approved', async ({
  browser,
}) => {
  const suffix = randomInt(1e6, 9e6);
  const modCtx = await browser.newContext();
  const moderator = await modCtx.newPage();
  await loginModerator(moderator);

  // Staff don't know the PIB or MB: name only.
  await gotoHydrated(moderator, '/sr/moderator/companies/new', '#new-legal');
  await moderator.locator('#new-legal').fill(`Pekara ${suffix} d.o.o.`);
  await moderator.locator('#new-slug').fill(`pekara-${suffix}`);
  await moderator.getByRole('button', { name: 'Kreiraj kompaniju' }).click();
  await expect(moderator).toHaveURL(
    /\/sr\/moderator\/companies\/[0-9a-f-]{36}$/,
  );
  const companyId = moderator.url().split('/').pop() as string;
  expect(await companyIdentifiers(companyId)).toEqual({ pib: null, mb: null });

  // The company signs up under the same name, written its own way.
  const email = `pekara-${suffix}@example.com`;
  const pib = String(randomInt(100000000, 999999999));
  const mb = String(randomInt(10000000, 99999999));
  const employerCtx = await browser.newContext();
  const employer = await employerCtx.newPage();
  await registerEmployerClaiming(
    employer,
    email,
    { id: '', legalName: '', pib, mb },
    { legalName: `PEKARA ${suffix} DOO` },
  );
  await expect(employer).toHaveURL(/\/sr\/employer\/pending/);

  // The moderator sees what they entered, approves, and the company has it.
  await moderator.goto('/sr/moderator/companies');
  const row = moderator
    .getByTestId('join-request-row')
    .filter({ hasText: email });
  await expect(row).toContainText(`PIB ${pib}`);
  await expect(row).toContainText(`MB ${mb}`);
  await row.getByRole('button', { name: 'Odobri' }).click();
  await expect(row).toHaveCount(0);
  expect(await companyIdentifiers(companyId)).toEqual({ pib, mb });

  await employer.goto('/sr/employer');
  await expect(employer).toHaveURL(/\/sr\/employer$/);
  await employerCtx.close();
  await modCtx.close();
});
