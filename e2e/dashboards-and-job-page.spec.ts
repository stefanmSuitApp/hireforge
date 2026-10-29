import { randomInt } from 'node:crypto';

import { readyCandidate } from './support/candidate';
import { expect, test } from './support/fixtures';
import { createPublishedJob, SEED_PASSWORD } from './support/db';
import { resetRateLimits } from './support/redis';
import { gotoHydrated } from './support/ui';

// Design review 02: dashboards with real numbers, packages that say what's
// not included, and a job page with one apply button and an end date.

test.beforeEach(async () => {
  await resetRateLimits();
});

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000);

test('a short job ad has one apply button, its end date and no postal code', async ({
  page,
}) => {
  const job = await createPublishedJob({ expiresAt: inDays(10) });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/sr/jobs/${job.slug}`);

  await expect(
    page.getByRole('link', { name: 'Konkuriši za ovaj posao' }).filter({
      visible: true,
    }),
  ).toHaveCount(1);
  await expect(page.getByText(/Ističe:/)).toBeVisible();
  await expect(page.getByRole('main')).not.toContainText('(11000)');
});

test('the candidate overview shows my applications, saved jobs and what my profile lacks', async ({
  page,
}) => {
  const job = await createPublishedJob({
    title: `Pregled kandidat ${randomInt(1e5, 9e5)}`,
  });
  const saved = await createPublishedJob({
    title: `Sačuvan oglas ${randomInt(1e5, 9e5)}`,
  });
  const cand = await readyCandidate();
  await cand.api.post('candidate/applications', { data: { jobId: job.id } });
  await cand.api.post('candidate/saved-jobs', { data: { jobId: saved.id } });

  await gotoHydrated(page, '/sr/candidate/login', '#candidate-email');
  await page.locator('#candidate-email').fill(cand.email);
  await page.locator('#candidate-password').fill(cand.password);
  await page.locator('#candidate-password').press('Enter');
  await expect(page).toHaveURL(/\/sr\/candidate$/);

  const recent = page.getByRole('heading', { name: 'Poslednje prijave' });
  await expect(recent).toBeVisible();
  await expect(page.getByRole('link', { name: job.title })).toBeVisible();
  await expect(page.getByText('Poslato')).toBeVisible();
  await expect(page.getByRole('link', { name: saved.title })).toBeVisible();
  // No name yet: the overview asks for it and links to the profile.
  await page.getByRole('link', { name: 'Dodaj ime i prezime' }).click();
  await expect(page).toHaveURL(/\/sr\/candidate\/profile$/);
});

test('the employer overview shows applicants and ads ending this week', async ({
  page,
}) => {
  const ending = await createPublishedJob({
    title: `Ističe uskoro ${randomInt(1e5, 9e5)}`,
    expiresAt: inDays(3),
  });
  const cand = await readyCandidate();
  await cand.api.post('candidate/applications', { data: { jobId: ending.id } });

  await gotoHydrated(page, '/sr/employer/login', '#employer-email');
  await page.locator('#employer-email').fill('employer@hireforge.local');
  await page.locator('#employer-password').fill(SEED_PASSWORD);
  await page.locator('#employer-password').press('Enter');
  await expect(page).toHaveURL(/\/sr\/employer$/);

  const ends = page
    .getByRole('heading', { name: 'Ističu u narednih 7 dana' })
    .locator('..');
  await expect(ends.getByRole('link', { name: ending.title })).toBeVisible();
  const withApplicants = page
    .getByRole('heading', { name: 'Oglasi sa kandidatima' })
    .locator('..');
  await expect(withApplicants.getByRole('link').first()).toBeVisible();
});

test('a package card lists what it does not include apart from what it does', async ({
  page,
}) => {
  await gotoHydrated(page, '/sr/employer/login', '#employer-email');
  await page.locator('#employer-email').fill('employer@hireforge.local');
  await page.locator('#employer-password').fill(SEED_PASSWORD);
  await page.locator('#employer-password').press('Enter');
  await expect(page).toHaveURL(/\/sr\/employer$/);
  await page.goto('/sr/employer/packages');

  const tezga = page
    .getByRole('heading', { name: 'Tezga', exact: true })
    .locator('xpath=ancestor::div[contains(@class,"rounded")][1]');
  const notIncluded = tezga
    .getByText('Nije uključeno', { exact: true })
    .locator('..');
  await expect(notIncluded).toContainText('Istaknut oglas');
  await expect(page.getByLabel('Promo kod')).toHaveAttribute(
    'placeholder',
    'Unesi kod',
  );
});
