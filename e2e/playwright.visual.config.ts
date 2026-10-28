import { defineConfig, type Project } from '@playwright/test';

import base from './playwright.config';

/**
 * Visual baselines (WARN-ONLY: not part of `pnpm e2e`, never blocks a push;
 * CI runs it on main with continue-on-error). Run through
 * `pnpm e2e:visual` (scripts/e2e/visual-linux.mjs): pages render in the
 * official Playwright Linux image so local runs match CI's baselines.
 * Update: `pnpm e2e:visual:update`, or the "update screenshots" workflow.
 */
const linuxBrowser = process.env['E2E_BROWSER_WS'];

// Mobile first: 375 before 1440. The UI has no dark theme yet (light only).
const widths = {
  'phone-375': {
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true,
  },
  'desktop-1440': { viewport: { width: 1440, height: 900 } },
} satisfies Record<string, Project['use']>;

export default defineConfig({
  ...base,
  testDir: './visual',
  testMatch: '**/*.visual.ts',
  updateSnapshots: 'none',
  // Baselines are committed for Linux only (the image above / CI).
  snapshotPathTemplate:
    '{testDir}/__screenshots__/linux/{projectName}/{arg}{ext}',
  expect: {
    ...base.expect,
    toHaveScreenshot: {
      // CI tolerates 0.1 % of pixels for font rasterization noise.
      ...(process.env['CI']
        ? { maxDiffPixelRatio: 0.001 }
        : { maxDiffPixels: 0 }),
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },
  use: {
    ...base.use,
    reducedMotion: 'reduce',
    timezoneId: 'Europe/Belgrade',
    locale: 'sr-Latn-RS',
    ...(linuxBrowser ? { connectOptions: { wsEndpoint: linuxBrowser } } : {}),
  },
  projects: Object.entries(widths).map(([name, use]) => ({
    name,
    use: { ...base.use, ...use, colorScheme: 'light' as const },
  })),
});
