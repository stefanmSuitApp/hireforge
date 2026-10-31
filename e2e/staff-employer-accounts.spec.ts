import { randomInt } from 'node:crypto';

import { expect, test } from '@playwright/test';

import { employerCompanyIdsForEmail, emailVerifiedAt } from './support/db';
import { loginModerator } from './support/auth-ui';
import { expectEmail, linkFrom } from './support/mail';
import { resetRateLimits } from './support/redis';
import { gotoHydrated } from './support/ui';

test.beforeEach(async () => {
  await resetRateLimits();
});

test('a moderator creates a company and its account; the employer activates it from the invite', async ({
  browser,
}) => {
  const suffix = randomInt(1e6, 9e6);
  const legalName = `Pozivnica ${suffix} d.o.o.`;
  const email = `invited-${suffix}@example.com`;

  const modCtx = await browser.newContext();
  const moderator = await modCtx.newPage();
  await loginModerator(moderator);

  // Create the company with an identifier, so a later self-signup finds it.
  await gotoHydrated(moderator, '/sr/moderator/companies/new', '#new-legal');
  await moderator.locator('#new-legal').fill(legalName);
  await moderator.locator('#new-slug').fill(`pozivnica-${suffix}`);
  await moderator.getByLabel('PIB').fill(String(randomInt(1e8, 9e8)));
  await moderator.getByRole('button', { name: 'Kreiraj kompaniju' }).click();
  await expect(moderator).toHaveURL(
    /\/sr\/moderator\/companies\/[0-9a-f-]{36}$/,
  );
  const companyId = moderator.url().split('/').pop() as string;

  // Add the account: linked at once, waiting for activation.
  await moderator.getByLabel('E-pošta za nalog').fill(email);
  await moderator.getByRole('button', { name: 'Pošalji pozivnicu' }).click();
  await expect(moderator.getByTestId('invite-result')).toContainText(email);
  const shownLink = await moderator
    .getByLabel('Link za aktivaciju')
    .inputValue();
  expect(shownLink).toContain('/accept-invite?token=');
  const member = moderator.getByTestId('company-member').filter({
    hasText: email,
  });
  await expect(member).toContainText('Čeka aktivaciju');
  expect(await employerCompanyIdsForEmail(email)).toEqual([companyId]);

  // The employer follows the emailed link and sets a password.
  const invite = await expectEmail(email, /pozvani|nalog/i);
  const link = linkFrom(invite, '/accept-invite?token=');
  expect(link).toBe(shownLink);

  const employerCtx = await browser.newContext();
  const employer = await employerCtx.newPage();
  await gotoHydrated(employer, link, '#invite-password');
  await employer.getByLabel('Nova lozinka').fill('Pozivnica9!');
  await employer.getByLabel('Ponovi lozinku').fill('Pozivnica9!');
  await employer.getByRole('button', { name: 'Aktiviraj nalog' }).click();
  await expect(employer.getByRole('status')).toContainText('aktiviran');
  expect(await emailVerifiedAt(email)).not.toBeNull();

  // The link works once.
  await gotoHydrated(employer, link, '#invite-password');
  await employer.getByLabel('Nova lozinka').fill('Pozivnica9!');
  await employer.getByLabel('Ponovi lozinku').fill('Pozivnica9!');
  await employer.getByRole('button', { name: 'Aktiviraj nalog' }).click();
  await expect(employer.getByText(/neispravan ili je istekao/)).toBeVisible();

  // Signs in straight into the company's workspace.
  await gotoHydrated(employer, '/sr/employer/login', '#employer-email');
  await employer.locator('#employer-email').fill(email);
  await employer.locator('#employer-password').fill('Pozivnica9!');
  await employer.locator('button[type="submit"]').click();
  await expect(employer).toHaveURL(/\/sr\/employer$/);
  await expect(employer.getByText(legalName).first()).toBeVisible();

  // The moderator now sees the account as active.
  await moderator.reload();
  await expect(
    moderator.getByTestId('company-member').filter({ hasText: email }),
  ).toContainText('Aktivan');

  await employerCtx.close();
  await modCtx.close();
});

test('a moderator can resend an invite; only the newest link works', async ({
  browser,
}) => {
  const suffix = randomInt(1e6, 9e6);
  const email = `resend-${suffix}@example.com`;

  const modCtx = await browser.newContext();
  const moderator = await modCtx.newPage();
  await loginModerator(moderator);
  await gotoHydrated(moderator, '/sr/moderator/companies/new', '#new-legal');
  await moderator.locator('#new-legal').fill(`Ponovo ${suffix} d.o.o.`);
  await moderator.locator('#new-slug').fill(`ponovo-${suffix}`);
  await moderator.getByLabel('MB').fill(String(randomInt(1e7, 9e7)));
  await moderator.getByRole('button', { name: 'Kreiraj kompaniju' }).click();
  await expect(moderator).toHaveURL(
    /\/sr\/moderator\/companies\/[0-9a-f-]{36}$/,
  );

  await moderator.getByLabel('E-pošta za nalog').fill(email);
  await moderator.getByRole('button', { name: 'Pošalji pozivnicu' }).click();
  const first = await moderator.getByLabel('Link za aktivaciju').inputValue();

  await moderator
    .getByTestId('company-member')
    .filter({ hasText: email })
    .getByRole('button', { name: 'Pošalji ponovo' })
    .click();
  await expect
    .poll(() => moderator.getByLabel('Link za aktivaciju').inputValue())
    .not.toBe(first);
  const second = await moderator.getByLabel('Link za aktivaciju').inputValue();

  const employerCtx = await browser.newContext();
  const employer = await employerCtx.newPage();
  await gotoHydrated(employer, first, '#invite-password');
  await employer.getByLabel('Nova lozinka').fill('Pozivnica9!');
  await employer.getByLabel('Ponovi lozinku').fill('Pozivnica9!');
  await employer.getByRole('button', { name: 'Aktiviraj nalog' }).click();
  await expect(employer.getByText(/neispravan ili je istekao/)).toBeVisible();

  await gotoHydrated(employer, second, '#invite-password');
  await employer.getByLabel('Nova lozinka').fill('Pozivnica9!');
  await employer.getByLabel('Ponovi lozinku').fill('Pozivnica9!');
  await employer.getByRole('button', { name: 'Aktiviraj nalog' }).click();
  await expect(employer.getByRole('status')).toContainText('aktiviran');

  await employerCtx.close();
  await modCtx.close();
});
