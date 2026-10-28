import { expect, test } from '../support/fixtures';
import { SEED_JOB_ID, setJobPublishedAt } from '../support/db';

test.use({ fixedClock: true });

test.beforeAll(async () => {
  // Server-rendered dates come from the DB: pin the seed job's.
  await setJobPublishedAt(SEED_JOB_ID, new Date('2026-10-15T07:00:00Z'));
});

const SCREENS: Array<[name: string, path: string]> = [
  ['home', '/sr'],
  ['jobs-list', '/sr/jobs'],
  ['job-detail', `/sr/jobs/${SEED_JOB_ID}`],
  ['company', '/sr/companies/devlegion'],
  ['landing-city', '/sr/jobs/city/beograd'],
  ['sign-in', '/sr/sign-in'],
];

for (const [name, path] of SCREENS) {
  test(`${name} looks as approved`, async ({ page }) => {
    await page.goto(path);
    // Client-loaded blocks (similar jobs, previews) settle first.
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      // Live content (CMS banners, counters) can be marked data-visual-mask.
      mask: [page.locator('[data-visual-mask]')],
    });
  });
}
