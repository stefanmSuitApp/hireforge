import { expect, test } from '@playwright/test';

import { gotoHydrated } from './support/ui';

// Stefan, 2026-10-29: no public prices, but a visiting employer should see
// that posting is affordable and where to start.
test('a visiting employer finds the pitch and starts sign-up from the employers page', async ({
  page,
}) => {
  await gotoHydrated(
    page,
    '/sr/employers',
    'main a[href="/sr/employer/register"]',
  );
  const pitch = page.getByRole('region', { name: 'Zapošljavaš?' });
  await expect(pitch).toContainText('pristupačnoj ceni');
  await expect(pitch).not.toContainText(/RSD|EUR|€|din/);
  await pitch.getByRole('link', { name: 'Napravi nalog poslodavca' }).click();
  await expect(page).toHaveURL(/\/sr\/employer\/register$/);
});
