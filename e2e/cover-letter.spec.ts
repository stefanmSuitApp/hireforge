import { expect, test } from '@playwright/test';

import { readyCandidate } from './support/candidate';
import { createPublishedJob, SEED_PASSWORD } from './support/db';
import { resetRateLimits } from './support/redis';
import { gotoHydrated, waitHydrated } from './support/ui';

test.beforeEach(async () => {
  await resetRateLimits();
});

// Cover letters used to be stored but never shown to the employer.
test("the employer reads the candidate's cover letter", async ({ page }) => {
  const job = await createPublishedJob();
  const candidate = await readyCandidate();
  const letter =
    'Imam pet godina iskustva sa NestJS-om.\nMogu odmah da počnem.';
  const applied = await candidate.api.post('candidate/applications', {
    data: { jobId: job.id, coverLetterText: letter },
  });
  expect(applied.ok(), await applied.text()).toBeTruthy();

  await gotoHydrated(page, '/sr/employer/login', '#employer-email');
  await page.locator('#employer-email').fill('employer@hireforge.local');
  await page.locator('#employer-password').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();
  // Exact: a looser pattern also matches /sr/employer/login itself.
  await expect(page).toHaveURL(/\/sr\/employer$/);

  await page.goto(`/sr/employer/jobs/${job.id}/applications`);
  const row = page.getByRole('row').filter({ hasText: candidate.email });
  await waitHydrated(page, 'summary');
  await expect(row.getByText('Mogu odmah da počnem.')).toBeHidden();
  await row.getByText('Pročitaj').click();
  await expect(
    row.getByText('Imam pet godina iskustva sa NestJS-om.'),
  ).toBeVisible();
  await expect(row.getByText('Mogu odmah da počnem.')).toBeVisible();
});
