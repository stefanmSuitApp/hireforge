// Clarity (decided 2026-10-31): nothing is requested from clarity.ms until
// the visitor accepts, and private pages never load it. Runs against the
// second web server that has a Clarity id (production build only).
import { expect, type Page } from '@playwright/test';

import { CLARITY_WEB_PORT, E2E_CLARITY_PROJECT_ID } from './playwright.config';
import { test } from './support/fixtures';
import { gotoHydrated } from './support/ui';

const origin = `http://127.0.0.1:${CLARITY_WEB_PORT}`;

test.skip(
  process.env['E2E_WEB'] !== 'start',
  'needs the production build (E2E_WEB=start)',
);

/** Stubs the tag (no request leaves the machine) and records each load. */
async function watchClarity(page: Page): Promise<string[]> {
  const loads: string[] = [];
  await page.route('https://www.clarity.ms/**', (route) => {
    loads.push(route.request().url());
    return route.fulfill({ contentType: 'text/javascript', body: '' });
  });
  return loads;
}

const banner = (page: Page) =>
  page.getByRole('complementary', { name: 'Kolačići za analitiku' });

test('Clarity loads only after Prihvatam, and the choice is remembered', async ({
  page,
}) => {
  const loads = await watchClarity(page);
  await gotoHydrated(page, `${origin}/sr/jobs`, 'main');
  await expect(banner(page)).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(loads).toEqual([]);

  await banner(page).getByRole('button', { name: 'Prihvatam' }).click();
  await expect(banner(page)).toBeHidden();
  await expect
    .poll(() => loads)
    .toEqual([`https://www.clarity.ms/tag/${E2E_CLARITY_PROJECT_ID}`]);

  await page.goto(`${origin}/sr`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(banner(page)).toHaveCount(0);
});

test('declining loads nothing; the footer link lets the visitor change their mind', async ({
  page,
}) => {
  const loads = await watchClarity(page);
  await gotoHydrated(page, `${origin}/sr`, 'main');
  await banner(page).getByRole('button', { name: 'Odbijam' }).click();
  await expect(banner(page)).toBeHidden();

  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(banner(page)).toHaveCount(0);
  await page.waitForLoadState('networkidle');
  expect(loads).toEqual([]);

  await page.getByRole('button', { name: 'Podešavanja kolačića' }).click();
  await expect(banner(page)).toBeVisible();
});

test('private pages never ask and never load Clarity, even after consent', async ({
  page,
  context,
}) => {
  const loads = await watchClarity(page);
  const login = `${origin}/sr/employer/login`;
  await gotoHydrated(page, login, '#employer-email');
  await expect(banner(page)).toHaveCount(0);

  await context.addCookies([
    { name: 'hf_analytics_consent', value: 'granted', url: origin },
  ]);
  await gotoHydrated(page, login, '#employer-email');
  await page.waitForLoadState('networkidle');
  expect(loads).toEqual([]);
});
