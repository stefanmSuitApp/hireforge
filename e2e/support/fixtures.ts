import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, type Page } from '@playwright/test';

export { expect };

/**
 * The fixed browser time for screenshot specs (`E2E_NOW`, ISO 8601), so
 * relative dates rendered in the client stay stable. Server-rendered dates
 * still come from the API clock.
 */
export function fixedNow(): Date {
  return new Date(process.env['E2E_NOW'] ?? '2026-10-15T09:00:00+02:00');
}

export type Theme = 'light' | 'dark';

export const test = base.extend<{ fixedClock: boolean; theme: Theme }>({
  /** Opt in per spec: `test.use({ fixedClock: true })`. */
  fixedClock: [false, { option: true }],
  page: async ({ page, fixedClock }, use) => {
    if (fixedClock) {
      await page.clock.setFixedTime(fixedNow());
    }
    await use(page);
  },
  // Playwright reads fixture dependencies from the destructured first
  // argument, so it must be `{}`.
  // eslint-disable-next-line no-empty-pattern
  theme: async ({}, use, testInfo) => {
    await use((testInfo.project.use.colorScheme ?? 'light') as Theme);
  },
});

const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** WCAG 2.1 A/AA scan of the current page; the failure lists each rule with the offending elements. */
export async function expectNoA11yViolations(page: Page): Promise<void> {
  // Next streams <title> with the metadata, and the auth pages call
  // router.refresh() on mount, which drops <title> while the head re-renders.
  // Scanning before either settles is a false `document-title` failure.
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveTitle(/\S/);
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_AA)
    .analyze();
  expect(
    violations.map(
      (v) =>
        `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
    ),
  ).toEqual([]);
}
