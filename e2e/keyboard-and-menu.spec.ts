import { expect, test } from '@playwright/test';

import { gotoHydrated } from './support/ui';

test('the first Tab offers a skip link that jumps past the header', async ({
  page,
}) => {
  await page.goto('/sr/jobs');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Preskoči na sadržaj' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('the menu traps focus, closes on Escape and gives focus back', async ({
    page,
  }) => {
    await gotoHydrated(page, '/sr', 'header button[aria-haspopup="dialog"]');
    const toggle = page
      .locator('header')
      .getByRole('button', { name: 'Glavna navigacija' });
    await toggle.click();
    const menu = page.getByRole('dialog', { name: 'Glavna navigacija' });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Poslovi' })).toBeVisible();

    // Focus stays inside the open menu.
    for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
    expect(
      await menu.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);

    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(toggle).toBeFocused();
  });

  test("the hero search box has a name and a guest's filter button is big enough to tap", async ({
    page,
  }) => {
    await page.goto('/sr');
    await expect(page.getByRole('searchbox')).toHaveAccessibleName(/.+/);

    await gotoHydrated(page, '/sr/jobs', 'main input[name="q"]');
    const more = page.getByRole('button', { name: 'Više filtera' });
    const box = await more.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});
