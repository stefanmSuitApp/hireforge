import type { Page } from '@playwright/test';

/**
 * Production builds render forms before React hydrates them; clicks in that
 * window are lost. React tags hydrated DOM nodes with `__reactFiber$…`, so
 * wait for that on a field before interacting.
 */
export async function gotoHydrated(
  page: Page,
  url: string,
  selector: string,
): Promise<void> {
  await page.goto(url);
  await waitHydrated(page, selector);
}

/** For pages reached by clicking a link rather than `goto`. */
export async function waitHydrated(
  page: Page,
  selector: string,
): Promise<void> {
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel);
    return (
      el != null && Object.keys(el).some((k) => k.startsWith('__reactFiber'))
    );
  }, selector);
}
