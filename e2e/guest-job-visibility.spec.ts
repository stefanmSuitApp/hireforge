import { randomInt } from 'node:crypto';

import { expect, expectNoA11yViolations, test } from './support/fixtures';

import { createPublishedJob, SEED_PASSWORD } from './support/db';
import { resetRateLimits } from './support/redis';
import { gotoHydrated, waitHydrated } from './support/ui';

// Option B (docs/plans/GUEST_ACCESS_B.md): every job ad is public; guests
// browse the first 20 results and need an account for the advanced filters.

test.beforeEach(async () => {
  await resetRateLimits();
});

/** More jobs than a guest sees, all matching one search word. */
async function manyJobs(count = 22) {
  const token = `pregled${randomInt(1e5, 9e5)}`;
  const jobs = [];
  for (let i = 0; i < count; i++) {
    jobs.push(
      await createPublishedJob({ title: `${token} ${i}`, featured: false }),
    );
  }
  return { token, jobs };
}

test('a guest reads any job in full, featured or not, with JobPosting markup', async ({
  page,
  request,
}) => {
  const plain = await createPublishedJob({ featured: false });
  const res = await request.get(`/sr/jobs/${plain.slug}`, { maxRedirects: 0 });
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain('"@type":"JobPosting"');

  await page.goto(`/sr/jobs/${plain.slug}`);
  await expect(
    page.getByRole('heading', { level: 1, name: plain.title }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /DEVLEGION/ }).first(),
  ).toBeVisible();

  const sitemap = await (await request.get('/sitemaps/jobs-0.xml')).text();
  expect(sitemap).toContain(`/sr/jobs/${plain.slug}`);
});

test('a guest sees the first 20 results and a way to the rest', async ({
  page,
}) => {
  const { token } = await manyJobs();
  await page.goto(`/sr/jobs?q=${token}`);
  await expect(
    page.locator(`main a[aria-label^="Otvori oglas: ${token}"]`),
  ).toHaveCount(20);
  const cta = page.getByRole('complementary').filter({ hasText: '22' });
  await expect(cta).toContainText('Prijavi se da vidiš sva 22 oglasa');

  // Signing in from the prompt comes back to the same search, all of it.
  await cta.getByRole('link', { name: 'Prijavi se' }).click();
  await page.getByRole('link', { name: 'Prijava kandidata' }).click();
  await waitHydrated(page, '#candidate-email');
  await page.locator('#candidate-email').fill('candidate@hireforge.local');
  await page.locator('#candidate-password').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(
    (url) => url.pathname === '/sr/jobs' && url.searchParams.get('q') === token,
  );
  await expect(page.getByRole('complementary')).toHaveCount(0);
  await expect(page.getByText(/od 22$/)).toBeVisible();
});

test('page 2 of a list is out of the index and shows a guest page 1', async ({
  request,
}) => {
  const { token } = await manyJobs();
  const html = await (await request.get(`/sr/jobs?q=${token}&page=2`)).text();
  expect(html).toMatch(/<meta name="robots" content="noindex/);
  expect(html).toContain('Prijavi se da vidiš sva 22 oglasa');
});

// Guests get one locked "Više filtera" button, not a dozen locked chips
// (Stefan, 2026-10-29); signing in comes back to the same search.
test('more filters ask a guest to sign in, then the filters are there', async ({
  page,
}) => {
  await createPublishedJob({ featured: false });
  await gotoHydrated(page, '/sr/jobs?q=e2e', 'main input[name="q"]');
  await expect(page.getByRole('button', { name: 'Rad od kuće' })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: 'Više filtera' }).click();
  const sheet = page.getByRole('dialog', {
    name: 'Prijavi se da koristiš ove filtere',
  });
  await expect(sheet).toBeVisible();

  await sheet.getByRole('link', { name: 'Prijavi se' }).click();
  await page.getByRole('link', { name: 'Prijava kandidata' }).click();
  await waitHydrated(page, '#candidate-email');
  await page.locator('#candidate-email').fill('candidate@hireforge.local');
  await page.locator('#candidate-password').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(
    (url) => url.pathname === '/sr/jobs' && url.searchParams.get('q') === 'e2e',
  );
  await page.getByRole('button', { name: 'Rad od kuće' }).click();
  await page.waitForURL(
    (url) => url.searchParams.get('workModel') === 'remote',
  );
  await expect(
    page.getByRole('button', { name: 'Rad od kuće' }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('a filtered link opened as a guest explains the filter needs an account', async ({
  page,
}) => {
  await page.goto('/sr/jobs?workModel=remote');
  await expect(
    page
      .getByRole('complementary')
      .getByText('Prijavi se da koristiš ove filtere'),
  ).toBeVisible();
});

test('the header shows the jobs and employers to guests', async ({ page }) => {
  await page.goto('/sr');
  const nav = page.locator('header nav');
  await expect(nav.getByRole('link', { name: 'Poslovi' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Poslodavci' })).toBeVisible();
});

// B3: conversion without leaving the job.

test('a guest signs up from "Konkuriši" without leaving the job, then lands on its apply form', async ({
  page,
}) => {
  const job = await createPublishedJob({ featured: false });
  await gotoHydrated(page, `/sr/jobs/${job.slug}`, 'main a[href$="/apply"]');
  await page
    .getByRole('link', { name: 'Konkuriši za ovaj posao' })
    .first()
    .click();

  const sheet = page.getByRole('dialog', { name: 'Napravi nalog i konkuriši' });
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText(job.title);
  await expect(page).toHaveURL(new RegExp(`/sr/jobs/${job.slug}$`));
  await expectNoA11yViolations(page);

  await waitHydrated(page, '#candidate-reg-email');
  await sheet.locator('#candidate-reg-name').fill('Gost Konkurent');
  await sheet
    .locator('#candidate-reg-email')
    .fill(`gost-${randomInt(1e6, 9e6)}@example.com`);
  await sheet.locator('#candidate-reg-password').fill('Lozinka123!');
  await sheet.getByRole('button', { name: 'Napravi nalog' }).click();

  await page.waitForURL((url) => url.pathname === `/sr/jobs/${job.slug}/apply`);
  await expect(page.getByText(job.title).first()).toBeVisible();
  // A new account confirms its email before the application goes out.
  await expect(
    page.getByText('Potvrdi e-poštu pre konkurisanja'),
  ).toBeVisible();
});

test('a signed-in candidate goes straight to the apply form', async ({
  page,
}) => {
  const job = await createPublishedJob({ featured: false });
  await gotoHydrated(page, '/sr/candidate/login', '#candidate-email');
  await page.locator('#candidate-email').fill('candidate@hireforge.local');
  await page.locator('#candidate-password').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname === '/sr/candidate');

  await gotoHydrated(page, `/sr/jobs/${job.slug}`, 'main a[href$="/apply"]');
  // No "sign in to apply" for someone who already is.
  await expect(
    page.getByRole('main').getByRole('link', { name: /Prijavi se/ }),
  ).toHaveCount(0);
  await page
    .getByRole('link', { name: 'Konkuriši za ovaj posao' })
    .first()
    .click();
  await page.waitForURL((url) => url.pathname === `/sr/jobs/${job.slug}/apply`);
});

test('the sign-up bar shows from the 3rd job a guest opens and stays dismissed', async ({
  page,
}) => {
  const jobs = [];
  for (let i = 0; i < 3; i++) {
    jobs.push(await createPublishedJob({ featured: false }));
  }
  const bar = page.getByRole('complementary', { name: 'Napravi nalog' });

  for (const job of jobs.slice(0, 2)) {
    await gotoHydrated(page, `/sr/jobs/${job.slug}`, 'main a[href$="/apply"]');
  }
  await expect(bar).toHaveCount(0);

  await gotoHydrated(
    page,
    `/sr/jobs/${jobs[2].slug}`,
    'main a[href$="/apply"]',
  );
  await expect(bar).toBeVisible();
  await expect(
    bar.getByRole('link', { name: 'Napravi nalog' }),
  ).toHaveAttribute(
    'href',
    `/sr/candidate/register?returnTo=${encodeURIComponent(`/jobs/${jobs[2].slug}`)}`,
  );
  await expectNoA11yViolations(page);

  await bar.getByRole('button', { name: 'Zatvori' }).click();
  await expect(bar).toHaveCount(0);
  await page.goto('/sr/jobs');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(bar).toHaveCount(0);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('the sign-up bar leaves job pages to the sticky apply bar', async ({
    page,
  }) => {
    for (let i = 0; i < 3; i++) {
      const job = await createPublishedJob({ featured: false });
      await gotoHydrated(
        page,
        `/sr/jobs/${job.slug}`,
        'main a[href$="/apply"]',
      );
    }
    const bar = page.getByRole('complementary', { name: 'Napravi nalog' });
    await expect(bar).toBeHidden();
    await gotoHydrated(page, '/sr/jobs', 'main');
    await expect(bar).toBeVisible();
  });
});
