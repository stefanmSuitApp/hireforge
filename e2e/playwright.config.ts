import { defineConfig, devices } from '@playwright/test';

/**
 * Run via `pnpm e2e` (scripts/e2e/run.mjs), which prepares the isolated e2e
 * database and passes E2E_DATABASE_URL / E2E_REDIS_URL.
 */
const API_PORT = 4100;
const WEB_PORT = 3100;
const apiOrigin = `http://127.0.0.1:${API_PORT}`;

/**
 * `E2E_WEB=start` serves a production build (`next start`, built by
 * scripts/e2e/run.mjs) — used in CI, where `next dev` compiles every route on
 * first visit and blows test timeouts. Default is `next dev` for local work.
 */
const webMode = process.env['E2E_WEB'] === 'start' ? 'start' : 'dev';

const databaseUrl = process.env['E2E_DATABASE_URL'] ?? '';
const redisUrl = process.env['E2E_REDIS_URL'] ?? '';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  outputDir: './test-results',
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: 'node dist/apps/api/main.js',
      cwd: '..',
      url: `${apiOrigin}/api/health/live`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        API_PORT: String(API_PORT),
        DATABASE_URL: databaseUrl,
        REDIS_URL: redisUrl,
        // Never send real email from tests.
        RESEND_API_KEY: '',
      },
    },
    {
      // next-intl resolves its request config relative to cwd (see next.config.js).
      command: `node ../../node_modules/next/dist/bin/next ${webMode} --port ${WEB_PORT} --hostname 127.0.0.1`,
      cwd: '../apps/web',
      url: `http://127.0.0.1:${WEB_PORT}/sr/employer/login`,
      reuseExistingServer: false,
      timeout: 240_000,
      env: {
        NEXT_PUBLIC_API_URL: apiOrigin,
        NEST_API_URL: apiOrigin,
        NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${WEB_PORT}`,
      },
    },
  ],
});
