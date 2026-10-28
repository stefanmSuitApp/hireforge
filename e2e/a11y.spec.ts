import { expectNoA11yViolations, test } from './support/fixtures';
import { SEED_MODERATOR, SEED_PASSWORD } from './support/db';
import { resetRateLimits } from './support/redis';
import { gotoHydrated } from './support/ui';

test.beforeEach(async () => {
  await resetRateLimits();
});

const PUBLIC_PAGES = [
  '/sr',
  '/en',
  '/sr/sign-in',
  '/sr/candidate/login',
  '/sr/candidate/register',
  '/sr/employer/login',
  '/sr/employer/register',
];

for (const path of PUBLIC_PAGES) {
  test(`public page ${path} has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto(path);
    await expectNoA11yViolations(page);
  });
}

test('candidate workspace has no WCAG A/AA violations', async ({ page }) => {
  await gotoHydrated(page, '/sr/candidate/login', '#candidate-email');
  await page.locator('#candidate-email').fill('candidate@hireforge.local');
  await page.locator('#candidate-password').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/sr\/candidate$/);
  await expectNoA11yViolations(page);
});

test('employer workspace has no WCAG A/AA violations', async ({ page }) => {
  await gotoHydrated(page, '/sr/employer/login', '#employer-email');
  await page.locator('#employer-email').fill('employer@hireforge.local');
  await page.locator('#employer-password').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/sr\/employer$/);
  await expectNoA11yViolations(page);
});

test('moderator workspace has no WCAG A/AA violations', async ({ page }) => {
  await gotoHydrated(page, '/sr/moderator/login', '#mod-email');
  await page.locator('#mod-email').fill(SEED_MODERATOR.email);
  await page.locator('#mod-password').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/sr\/moderator$/);
  await expectNoA11yViolations(page);
});
