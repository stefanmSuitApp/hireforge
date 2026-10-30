import { expect, test } from '@playwright/test';

// Redesign A step 5: the About page stands on its own copy (the CMS text is
// an extra section), so it is there even before Sanity has the document.
test('the about page tells the story and leads to the jobs', async ({
  page,
}) => {
  await page.goto('/sr/about');
  await expect(
    page.getByRole('heading', { level: 1, name: /pouzdano zapošljavanje/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Tri stvari do kojih nam je stalo' }),
  ).toBeVisible();
  await page
    .getByRole('main')
    .getByRole('link', { name: 'Pogledaj poslove' })
    .click();
  await expect(page).toHaveURL(/\/sr\/jobs$/);
});

// Stefan, 2026-10-30: the "Kako rastemo" line was half drawn while the whole
// timeline was on screen (it only finished well above the middle).
test('the timeline line is fully drawn once the steps are on screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 800 });
  await page.goto('/sr/about');
  const steps = page.getByRole('list').filter({ hasText: 'Korak 3' });
  // Bring the section in from below until its last line is just visible.
  await steps.evaluate((el) => {
    const section = el.closest('section')!;
    const bottom = section.getBoundingClientRect().bottom + window.scrollY;
    window.scrollTo(0, bottom - window.innerHeight);
  });
  await page.evaluate(() => new Promise(requestAnimationFrame));
  const line = page.locator('[data-testid="about-timeline-line"]');
  const [lineBox, stepsBox] = [
    await line.boundingBox(),
    await steps.boundingBox(),
  ];
  expect(lineBox!.width).toBeGreaterThan(stepsBox!.width - 2);
});
