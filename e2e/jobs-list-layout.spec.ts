import { randomInt } from 'node:crypto';

import { expect, test } from '@playwright/test';

import { loginModerator } from './support/auth-ui';
import { createPublishedJob } from './support/db';
import { gotoHydrated } from './support/ui';

// Stefan, 2026-10-29: on phones the list scrolled inside a ~3-card box, the
// keyword search hid behind "Filteri", and guests saw 12 locked chips first.
test.describe('job search on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('the search is visible first and the page itself scrolls the list', async ({
    page,
  }) => {
    const token = `raspored${randomInt(1e5, 9e5)}`;
    for (let i = 0; i < 8; i++) {
      await createPublishedJob({ title: `${token} ${i}` });
    }
    await gotoHydrated(page, `/sr/jobs?q=${token}`, 'main input[name="q"]');

    const search = page.locator('main input[name="q"]');
    await expect(search).toBeVisible();
    const more = page.getByRole('button', { name: 'Više filtera' });
    const [s, m] = [await search.boundingBox(), await more.boundingBox()];
    expect(s!.y).toBeLessThan(m!.y);

    const card = page.locator('main article').first();
    await expect(card).toBeVisible();
    const scrollBox = await card.evaluate((el) => {
      for (
        let n = el.parentElement;
        n && n !== document.body;
        n = n.parentElement
      ) {
        const { overflowY } = getComputedStyle(n);
        if (overflowY === 'auto' || overflowY === 'scroll') return n.className;
      }
      return null;
    });
    expect(scrollBox).toBeNull();
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight),
    ).toBeGreaterThan(812);
  });
});

// Redesign A step 3 (docs/plans/REDESIGN_A.md): the header counts the
// matching positions, and signed-in filters are labelled rows of chips.
test.describe('job search on a desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the header says how many positions match', async ({ page }) => {
    const token = `brojac${randomInt(1e5, 9e5)}`;
    for (let i = 0; i < 3; i++) {
      await createPublishedJob({ title: `${token} ${i}` });
    }
    await gotoHydrated(page, `/sr/jobs?q=${token}`, 'main input[name="q"]');
    await expect(page.getByText('3 otvorene pozicije')).toBeVisible();
  });

  test('signed-in filters are labelled rows a person can toggle', async ({
    page,
  }) => {
    await loginModerator(page);
    await gotoHydrated(page, '/sr/jobs', 'main input[name="q"]');
    const row = page.getByRole('group', { name: 'Model rada' });
    const hybrid = row.getByRole('button', { name: 'Hibridno' });
    await hybrid.click();
    await expect(page).toHaveURL(/workModel=hybrid/);
    await expect(hybrid).toHaveAttribute('aria-pressed', 'true');
  });
});
