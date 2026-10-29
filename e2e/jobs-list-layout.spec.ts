import { randomInt } from 'node:crypto';

import { expect, test } from '@playwright/test';

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
