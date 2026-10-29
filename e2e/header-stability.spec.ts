import { expect, test } from '@playwright/test';

import { loginModerator } from './support/auth-ui';
import { resetRateLimits } from './support/redis';
import { gotoHydrated } from './support/ui';

// Headless Chromium hides scrollbars by default, which hides the bug below.
test.use({
  launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] },
  viewport: { width: 1440, height: 900 },
});

test.beforeEach(async () => {
  await resetRateLimits();
});

const isDark = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.classList.contains('dark'));

test('the header nav stays put between short and long pages', async ({
  page,
}) => {
  await page.goto('/sr/jobs');
  const firstLink = page.locator('header nav[aria-label] a').first();
  const navX = async () => (await firstLink.boundingBox())?.x;

  // Short page: nothing to scroll.
  await page.addStyleTag({
    content: '#main-content, footer { display: none !important; }',
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= window.innerHeight,
    ),
  ).toBe(true);
  const shortX = await navX();

  // Long page: the scrollbar appears.
  await page.evaluate(() => {
    const filler = document.createElement('div');
    filler.style.height = '5000px';
    document.body.append(filler);
  });
  expect(
    await page.evaluate(
      () => window.innerWidth - document.documentElement.clientWidth,
    ),
    'the browser draws a scrollbar',
  ).toBeGreaterThan(0);
  expect(await navX()).toBe(shortX);
});

test('opening the account menu does not shift the page', async ({ page }) => {
  await loginModerator(page);
  await gotoHydrated(page, '/sr/jobs', 'header button[aria-haspopup="menu"]');
  const firstLink = page.locator('header nav[aria-label] a').first();
  const before = (await firstLink.boundingBox())?.x;

  await page.locator('header button[aria-haspopup="menu"]').click();
  await expect(page.getByRole('menu')).toBeVisible();
  // The menu locks scrolling, which is when the extra margin appeared.
  await expect(page.locator('body[data-scroll-locked]')).toHaveCount(1);
  expect((await firstLink.boundingBox())?.x).toBe(before);
});

test.describe('on a light OS', () => {
  test.use({ colorScheme: 'light' });

  test('switching language keeps the dark theme', async ({ page }) => {
    await gotoHydrated(page, '/sr/jobs', 'header button[aria-label^="Tema"]');
    const toggle = page
      .locator('header')
      .getByRole('button', { name: /^Tema/ });
    await toggle.click(); // system → light
    await toggle.click(); // light → dark
    await expect(toggle).toHaveAccessibleName(/tamna/);
    expect(await isDark(page)).toBe(true);

    await page.locator('header a[hreflang="en"]').first().click();
    await page.waitForURL('**/en/jobs');
    await expect(
      page.locator('header').getByRole('button', { name: /^Theme: dark/ }),
    ).toBeVisible();
    await page.waitForTimeout(500);
    expect(await isDark(page)).toBe(true);
  });
});
