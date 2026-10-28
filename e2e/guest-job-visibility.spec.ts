import { randomInt } from 'node:crypto';

import { expect, test } from '@playwright/test';

import { createPublishedJob, SEED_PASSWORD } from './support/db';
import { resetRateLimits } from './support/redis';
import { gotoHydrated, waitHydrated } from './support/ui';

// Guests see featured (paid) jobs in full; every other job is a teaser
// (title, city, date) that opens after sign-in.

test.beforeEach(async () => {
  await resetRateLimits();
});

async function twoJobs() {
  const token = `vidljivost${randomInt(1e5, 9e5)}`;
  const paid = await createPublishedJob({ title: `${token} izdvojen` });
  const plain = await createPublishedJob({
    title: `${token} obican`,
    featured: false,
  });
  return { token, paid, plain };
}

const cardLink = (title: string) => `main a[aria-label$="${title}"]` as const;

test('a guest sees a featured job in full and a locked teaser that opens after sign-in', async ({
  page,
}) => {
  const { token, paid, plain } = await twoJobs();

  await page.goto(`/sr/jobs?q=${token}`);
  await expect(page.locator(cardLink(paid.title))).toHaveAttribute(
    'href',
    `/sr/jobs/${paid.slug}`,
  );
  await expect(page.locator(cardLink(plain.title))).toHaveAttribute(
    'href',
    `/sr/sign-in?returnTo=${encodeURIComponent(`/sr/jobs/${plain.slug}`)}`,
  );
  const plainCard = page.locator('article', { hasText: plain.title });
  await expect(
    plainCard.getByText('Prijavi se da vidiš poslodavca'),
  ).toBeVisible();
  await expect(plainCard.getByRole('link', { name: /DEVLEGION/ })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole('complementary').getByText(/te čeka/),
  ).toBeVisible();

  await waitHydrated(page, cardLink(plain.title));
  await page.locator(cardLink(plain.title)).click();
  await page.waitForURL(
    (url) =>
      url.pathname === '/sr/sign-in' &&
      url.searchParams.get('returnTo') === `/sr/jobs/${plain.slug}`,
  );

  await page.getByRole('link', { name: 'Prijava kandidata' }).click();
  await waitHydrated(page, '#candidate-email');
  await page.locator('#candidate-email').fill('candidate@hireforge.local');
  await page.locator('#candidate-password').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname === `/sr/jobs/${plain.slug}`);
  await expect(
    page.getByRole('heading', { level: 1, name: plain.title }),
  ).toBeVisible();
});

test('a non-featured job page sends a guest to sign-in and stays out of the sitemap', async ({
  request,
}) => {
  const { paid, plain } = await twoJobs();

  const locked = await request.get(`/sr/jobs/${plain.slug}`, {
    maxRedirects: 0,
  });
  expect(locked.status()).toBe(307);
  expect(locked.headers()['location']).toContain(
    `/sr/sign-in?returnTo=${encodeURIComponent(`/sr/jobs/${plain.slug}`)}`,
  );
  expect((await request.get(`/sr/jobs/${paid.slug}`)).status()).toBe(200);

  const jobs = await (await request.get('/sitemaps/jobs-0.xml')).text();
  expect(jobs).toContain(`/sr/jobs/${paid.slug}`);
  expect(jobs).not.toContain(plain.slug);
});

test('the header shows the jobs and employers to guests', async ({ page }) => {
  await page.goto('/sr');
  const nav = page.locator('header nav');
  await expect(nav.getByRole('link', { name: 'Poslovi' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Poslodavci' })).toBeVisible();
});

test('signing up from the locked-jobs prompt comes back with every job open', async ({
  page,
}) => {
  const { token, plain } = await twoJobs();
  await gotoHydrated(
    page,
    `/sr/jobs?q=${token}`,
    'main aside a[href*="/candidate/register"]',
  );
  await page
    .getByRole('complementary')
    .getByRole('link', { name: 'Napravi nalog' })
    .click();

  await waitHydrated(page, '#candidate-reg-email');
  await page.locator('#candidate-reg-name').fill('Vesna Teaser');
  await page
    .locator('#candidate-reg-email')
    .fill(`teaser-${randomInt(1e6, 9e6)}@example.com`);
  await page.locator('#candidate-reg-password').fill('Lozinka123!');
  await page.locator('button[type="submit"]').click();

  await page.waitForURL((url) => url.pathname === '/sr/jobs');
  await page.goto(`/sr/jobs?q=${token}`);
  await expect(page.locator(cardLink(plain.title))).toHaveAttribute(
    'href',
    `/sr/jobs/${plain.slug}`,
  );
  await expect(page.getByRole('complementary')).toHaveCount(0);
});
