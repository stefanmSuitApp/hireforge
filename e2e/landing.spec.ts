import { expect, expectNoA11yViolations, test } from './support/fixtures';
import { createPublishedJob } from './support/db';

test("a city landing page lists that city's live jobs with its own title", async ({
  page,
}) => {
  const live = await createPublishedJob();
  const expired = await createPublishedJob({
    expiresAt: new Date(Date.now() - 60_000),
  });

  await page.goto('/sr/jobs/city/beograd');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Poslovi — Beograd' }),
  ).toBeVisible();
  await expect(page.getByText(live.title)).toBeVisible();
  await expect(page.getByText(expired.title)).toHaveCount(0);
  await expect(
    page.getByRole('navigation', { name: 'Putanja' }).getByRole('link', {
      name: 'Poslovi',
    }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute(
    'content',
    /noindex/,
  );
  await expectNoA11yViolations(page);

  // Visitors move between neighbouring landing pages by plain links.
  // The "Druge oblasti" block: the heading's own container.
  await page
    .getByRole('heading', { level: 2, name: 'Druge oblasti' })
    .locator('xpath=..')
    .getByRole('link', { name: /^IT/ })
    .click();
  await expect(page).toHaveURL(/\/sr\/jobs\/category\/it\/city\/beograd$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'IT poslovi — Beograd' }),
  ).toBeVisible();
  await expect(page.getByText(live.title)).toBeVisible();
});

test('a landing page without live jobs is noindex, an unknown one is a 404', async ({
  page,
  request,
}) => {
  await page.goto('/en/jobs/city/novi-sad');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Jobs in Novi Sad' }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /noindex/,
  );
  expect((await request.get('/sr/jobs/city/atlantida')).status()).toBe(404);
});

test('a filtered list URL canonicalizes to its landing page', async ({
  page,
}) => {
  await page.goto('/sr/jobs?city=beograd');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /\/sr\/jobs\/city\/beograd$/,
  );
});

test('the filter bar is in the first HTML, not swapped in later (no layout shift)', async ({
  browser,
}) => {
  await createPublishedJob();
  // Without JavaScript a streamed-in block never replaces its placeholder, so
  // this sees exactly what the first paint shows (and what no-JS crawlers see).
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  await page.goto('/sr/jobs/city/beograd');
  // Phones show results first: the filters are in the HTML, folded behind
  // one button (so opening them shifts nothing that was already painted).
  await expect(page.getByRole('button', { name: /^Filteri/ })).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: 'Brzo konkurisanje',
      includeHidden: true,
    }),
  ).toBeAttached();
  await expect(
    page.getByRole('searchbox', { name: 'Reči', includeHidden: true }),
  ).toBeAttached();
  await context.close();
});
