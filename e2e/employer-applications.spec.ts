import { expect, test } from '@playwright/test';

import { readyCandidate } from './support/candidate';
import { createPublishedJob, SEED_PASSWORD } from './support/db';
import { resetRateLimits } from './support/redis';
import { gotoHydrated, waitHydrated } from './support/ui';

test.beforeEach(async () => {
  await resetRateLimits();
});

// Employers could see applicants but not open their CVs or answer them.
test('the employer downloads a CV, shortlists, then hires; the candidate sees it', async ({
  page,
}) => {
  const job = await createPublishedJob();
  const candidate = await readyCandidate();
  const applied = await candidate.api.post('candidate/applications', {
    data: { jobId: job.id },
  });
  expect(applied.ok(), await applied.text()).toBeTruthy();

  await gotoHydrated(page, '/sr/employer/login', '#employer-email');
  await page.locator('#employer-email').fill('employer@hireforge.local');
  await page.locator('#employer-password').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/sr\/employer$/);

  await page.goto(`/sr/employer/jobs/${job.id}/applications`);
  const row = page.getByRole('row').filter({ hasText: candidate.email });
  await waitHydrated(page, 'button');
  await expect(row.getByText('Poslato')).toBeVisible();

  const download = page.waitForEvent('download');
  await row.getByRole('link', { name: 'Preuzmi CV' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('cv.pdf');
  await expect(row.getByText('Otvoreno')).toBeVisible();

  await row.getByRole('button', { name: 'U uži izbor' }).click();
  await expect(row.getByText('U užem izboru')).toBeVisible();

  await row.getByRole('button', { name: 'Zaposli' }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Zaposli' })
    .click();
  await expect(row.getByText('Zaposlen')).toBeVisible();
  await expect(row.getByRole('button')).toHaveCount(0);

  const mine = await candidate.api.get('candidate/applications');
  expect(JSON.stringify(await mine.json())).toContain('"hired"');
  await candidate.api.dispose();
});
