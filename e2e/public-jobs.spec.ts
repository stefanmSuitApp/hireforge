import { expect, expectNoA11yViolations, test } from './support/fixtures';
import { createPublishedJob, renameJobSlug, SEED_PASSWORD } from './support/db';
import { resetRateLimits } from './support/redis';
import { WEB_ORIGIN } from './support/ports';
import { waitHydrated } from './support/ui';

test.beforeEach(async () => {
  await resetRateLimits();
});

test('a logged-out visitor browses jobs, opens one and signs in to apply', async ({
  page,
}) => {
  const job = await createPublishedJob();

  await page.goto('/sr/jobs');
  await expect(page).toHaveURL(/\/sr\/jobs$/);
  await expectNoA11yViolations(page);

  // Mobile-style navigation: open the job's own page from its card link.
  await page.goto(`/sr/jobs/${job.slug}`);
  await expect(
    page.getByRole('heading', { level: 1, name: job.title }),
  ).toBeVisible();
  await expectNoA11yViolations(page);

  await waitHydrated(page, 'main a[href$="/apply"]');
  await page
    .getByRole('link', { name: 'Konkuriši za ovaj posao' })
    .first()
    .click();
  await page.waitForURL(
    (url) =>
      url.pathname === '/sr/candidate/login' &&
      url.searchParams.get('returnTo') === `/sr/jobs/${job.slug}/apply`,
  );

  await waitHydrated(page, '#candidate-email');
  await page.locator('#candidate-email').fill('candidate@hireforge.local');
  await page.locator('#candidate-password').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname === `/sr/jobs/${job.slug}/apply`);
  await expect(page.getByText(job.title).first()).toBeVisible();
});

test('the employers directory is public', async ({ page }) => {
  await createPublishedJob();
  await page.goto('/sr/employers');
  await expect(page).toHaveURL(/\/sr\/employers$/);
  await expect(page.getByRole('link', { name: /DEVLEGION/ })).toBeVisible();
});

test('the server sends the page language and a self canonical', async ({
  request,
}) => {
  const job = await createPublishedJob();
  const html = await (await request.get(`/en/jobs/${job.slug}`)).text();
  expect(html).toMatch(/<html lang="en"/);
  expect(html).toContain(
    `<link rel="canonical" href="${WEB_ORIGIN}/en/jobs/${job.slug}"/>`,
  );
  expect(html).toMatch(/hrefLang="sr"/i);
});

test('a missing job is a real 404', async ({ request }) => {
  const res = await request.get('/sr/jobs/nema-ovog-oglasa-zz99');
  expect(res.status()).toBe(404);
});

test('an old job URL from before an edit 301s to the current slug', async ({
  request,
}) => {
  const job = await createPublishedJob();
  const current = await renameJobSlug(job, 'e2e-novi-naslov-beograd');
  const res = await request.get(`/sr/jobs/${job.slug}`, { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers()['location']).toMatch(new RegExp(`/sr/jobs/${current}$`));
});

test('an expired ad stays reachable but is noindex, closed and out of lists', async ({
  page,
}) => {
  const job = await createPublishedJob({
    expiresAt: new Date(Date.now() - 60_000),
  });
  const res = await page.goto(`/sr/jobs/${job.slug}`);
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('status')).toContainText('istekao');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /noindex/,
  );
  await expect(
    page.getByRole('link', { name: 'Konkuriši za ovaj posao' }),
  ).toHaveCount(0);

  await page.goto('/sr/jobs');
  await expect(page.getByText(job.title)).toHaveCount(0);
});

test('a logged-out visitor on a phone: named logo link, clean console, save asks to sign in', async ({
  page,
}) => {
  await createPublishedJob();
  await page.setViewportSize({ width: 375, height: 812 });
  const consoleErrors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });

  await page.goto('/sr/jobs');
  // The wordmark is hidden at this width; the link still needs a name.
  await expect(
    page.getByRole('banner').getByRole('link', { name: 'Šljakam' }),
  ).toBeVisible();

  const save = page.getByRole('button', { name: 'Sačuvaj oglas' }).first();
  await expect(save).toBeEnabled();
  expect(consoleErrors).toEqual([]);

  await save.click();
  await page.waitForURL((url) => url.pathname === '/sr/candidate/login');
});
