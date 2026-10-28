import { E2E_INDEXNOW_KEY } from './playwright.config';
import { expect, test } from './support/fixtures';

test('the IndexNow key file proves ownership, other keys 404', async ({
  request,
}) => {
  const res = await request.get(`/${E2E_INDEXNOW_KEY}.txt`);
  expect(res.status()).toBe(200);
  expect(await res.text()).toBe(E2E_INDEXNOW_KEY);
  expect((await request.get('/not-the-key-0000.txt')).status()).toBe(404);
  // The rewrite must not shadow robots.txt or llms.txt.
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap:');
  expect(await (await request.get('/llms.txt')).text()).toContain('# Šljakam');
});

test('pages carry search engine verification, theme colour and a manifest', async ({
  page,
  request,
}) => {
  await page.goto('/sr');
  await expect(
    page.locator('meta[name="google-site-verification"]'),
  ).toHaveAttribute('content', 'e2e-google-verification');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    'content',
    '#007767',
  );
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await request.get(href ?? '')).json();
  expect(manifest).toMatchObject({ name: 'Šljakam', start_url: '/sr' });
  for (const icon of manifest.icons as Array<{ src: string }>) {
    expect((await request.get(icon.src)).status(), icon.src).toBe(200);
  }
});
