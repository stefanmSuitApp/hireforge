import { randomInt } from 'node:crypto';

import { expect, test } from '@playwright/test';
import sharp from 'sharp';

import { loginModerator } from './support/auth-ui';
import { resetRateLimits } from './support/redis';
import { gotoHydrated } from './support/ui';

test.beforeEach(async () => {
  await resetRateLimits();
});

test('a moderator uploads a company logo; the public company page shows it until it is removed', async ({
  page,
  browser,
}) => {
  const suffix = randomInt(1e6, 9e6);
  const slug = `logo-${suffix}`;
  await loginModerator(page);
  await gotoHydrated(page, '/sr/moderator/companies/new', '#new-legal');
  await page.locator('#new-legal').fill(`Logo ${suffix} d.o.o.`);
  await page.locator('#new-slug').fill(slug);
  await page.getByRole('button', { name: 'Kreiraj kompaniju' }).click();
  await expect(page).toHaveURL(/\/sr\/moderator\/companies\/[0-9a-f-]{36}$/);

  const png = await sharp({
    create: {
      width: 300,
      height: 120,
      channels: 4,
      background: { r: 20, g: 120, b: 90, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  await page.getByLabel('Otpremi logo').setInputFiles({
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: png,
  });
  const preview = page.getByRole('img', { name: 'Trenutni logo' });
  await expect(preview).toHaveAttribute(
    'src',
    /\/api\/public\/company-logos\//,
  );

  // A guest sees it on the company's public page.
  const guest = await (await browser.newContext()).newPage();
  await guest.goto(`/sr/companies/${slug}`);
  const logo = guest.locator('img[src*="/api/public/company-logos/"]').first();
  await expect(logo).toBeVisible();
  const src = (await logo.getAttribute('src')) as string;
  const image = await guest.request.get(src);
  expect(image.status()).toBe(200);
  expect(image.headers()['content-type']).toBe('image/webp');

  await page.getByRole('button', { name: 'Ukloni logo' }).click();
  await expect(preview).toHaveCount(0);
  await guest.goto(`/sr/companies/${slug}`);
  await expect(
    guest.locator('img[src*="/api/public/company-logos/"]'),
  ).toHaveCount(0);
});
