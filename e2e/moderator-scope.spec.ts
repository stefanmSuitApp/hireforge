import { expect, test } from '@playwright/test';

import { loginModerator } from './support/auth-ui';
import {
  createCompanyWithEmployer,
  SEED_ADMIN_EMAIL,
  SEED_MODERATOR,
  staffUserId,
} from './support/db';
import { resetRateLimits } from './support/redis';

test.beforeEach(async () => {
  await resetRateLimits();
});

// Stefan, 2026-10-29: moderators work only their own companies and the lead
// pool; another staff member's client stays out of their employer list.
test("a moderator's employer list shows their companies, not someone else's client", async ({
  page,
}) => {
  const mine = await createCompanyWithEmployer({
    assignedTo: SEED_MODERATOR.id,
    salesStatus: 'pipeline',
  });
  const theirs = await createCompanyWithEmployer({
    assignedTo: await staffUserId(SEED_ADMIN_EMAIL),
    salesStatus: 'closed_won',
  });

  await loginModerator(page);
  // The staff tab, not the public header's "Poslodavci" (/sr/employers).
  await page.locator('a[href="/sr/moderator/employers"]').first().click();
  await expect(page).toHaveURL(/\/sr\/moderator\/employers$/);

  await expect(page.getByText(mine.employerEmail)).toBeVisible();
  await expect(page.getByText(theirs.employerEmail)).toHaveCount(0);
});
