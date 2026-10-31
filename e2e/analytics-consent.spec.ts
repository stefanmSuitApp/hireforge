// Clarity and Google Analytics (decided 2026-10-31): nothing is requested
// from either until the visitor accepts, and private pages never load them.
// Runs against the second web server that has both ids (production build
// only).
import { expect, type Page } from '@playwright/test';

import {
  CLARITY_WEB_PORT,
  E2E_CLARITY_PROJECT_ID,
  E2E_GA_MEASUREMENT_ID,
} from './playwright.config';
import { test } from './support/fixtures';
import { gotoHydrated } from './support/ui';

const origin = `http://127.0.0.1:${CLARITY_WEB_PORT}`;

test.skip(
  process.env['E2E_WEB'] !== 'start',
  'needs the production build (E2E_WEB=start)',
);

const TRACKERS = [
  'https://www.clarity.ms/**',
  'https://*.clarity.ms/**',
  'https://www.googletagmanager.com/**',
  'https://*.google-analytics.com/**',
];

/** Stubs both tags (no request leaves the machine) and records each one. */
async function watchAnalytics(page: Page): Promise<string[]> {
  const loads: string[] = [];
  for (const pattern of TRACKERS) {
    await page.route(pattern, (route) => {
      loads.push(route.request().url());
      return route.fulfill({ contentType: 'text/javascript', body: '' });
    });
  }
  return loads;
}

const banner = (page: Page) =>
  page.getByRole('complementary', { name: 'Kolačići za analitiku' });

test('analytics load only after Prihvatam, and the choice is remembered', async ({
  page,
}) => {
  const loads = await watchAnalytics(page);
  await gotoHydrated(page, `${origin}/sr/jobs`, 'main');
  await expect(banner(page)).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(loads).toEqual([]);

  await banner(page).getByRole('button', { name: 'Prihvatam' }).click();
  await expect(banner(page)).toBeHidden();
  await expect
    .poll(() => [...loads].sort())
    .toEqual([
      `https://www.clarity.ms/tag/${E2E_CLARITY_PROJECT_ID}`,
      `https://www.googletagmanager.com/gtag/js?id=${E2E_GA_MEASUREMENT_ID}`,
    ]);

  await page.goto(`${origin}/sr`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(banner(page)).toHaveCount(0);
});

test('declining loads nothing; the footer link lets the visitor change their mind', async ({
  page,
}) => {
  const loads = await watchAnalytics(page);
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

test('private pages never ask and never load analytics, even after consent', async ({
  page,
  context,
}) => {
  const loads = await watchAnalytics(page);
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
