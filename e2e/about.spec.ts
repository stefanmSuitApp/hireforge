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
