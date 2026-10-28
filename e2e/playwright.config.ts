import { defineConfig, devices } from '@playwright/test';

/**
 * Run via `pnpm e2e` (scripts/e2e/run.mjs), which prepares the isolated e2e
 * database and passes E2E_DATABASE_URL / E2E_REDIS_URL / E2E_*_PORT.
 */
const API_PORT = Number(process.env['E2E_API_PORT'] ?? 4100);
const WEB_PORT = Number(process.env['E2E_WEB_PORT'] ?? 3100);
const apiOrigin = `http://127.0.0.1:${API_PORT}`;

/**
 * `E2E_WEB=start` serves a production build (`next start`, built by
 * scripts/e2e/run.mjs) — used in CI, where `next dev` compiles every route on
 * first visit and blows test timeouts. Default is `next dev` for local work.
 */
const webMode = process.env['E2E_WEB'] === 'start' ? 'start' : 'dev';

const databaseUrl = process.env['E2E_DATABASE_URL'] ?? '';
const redisUrl = process.env['E2E_REDIS_URL'] ?? '';

export const E2E_INDEXNOW_KEY = 'e2e-indexnow-key-0001';

const MAIL_PORT = Number(process.env['E2E_MAIL_PORT'] ?? 4300);
export const FAKE_RESEND_ORIGIN = `http://127.0.0.1:${MAIL_PORT}`;

/**
 * Email goes to the local fake (e2e/support/fake-resend.mjs), never to Resend:
 * the key is bogus and the base URL is overridden (both set on purpose).
 */
const emailEnv = {
  RESEND_API_KEY: 're_e2e_fake',
  RESEND_API_URL: FAKE_RESEND_ORIGIN,
  APP_PUBLIC_ORIGIN: `http://127.0.0.1:${WEB_PORT}`,
};

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
      command: 'node e2e/support/fake-resend.mjs',
      cwd: '..',
      env: { FAKE_RESEND_PORT: String(MAIL_PORT) },
      url: `${FAKE_RESEND_ORIGIN}/health`,
      reuseExistingServer: false,
      timeout: 10_000,
    },
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
        ...emailEnv,
      },
    },
    {
      // Outbox → notification emails + scheduled sweeps. Sanity / NBS schedulers off.
      command: 'node dist/apps/worker/main.js',
      cwd: '..',
      wait: { stdout: /worker_started/ },
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        DATABASE_URL: databaseUrl,
        REDIS_URL: redisUrl,
        OUTBOX_POLL_INTERVAL_MS: '500',
        // Fast tick: billing/job expiry sweeps run while tests wait for them.
        WORKER_SCHEDULE_TICK_MS: '1000',
        WORKER_CMS_PACKAGES_RECONCILE_MS: '0',
        WORKER_NBS_MIDDLE_RATE_MS: '0',
        ...emailEnv,
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
        // Discovery integrations (e2e/discovery.spec.ts); test values only.
        INDEXNOW_KEY: E2E_INDEXNOW_KEY,
        GOOGLE_SITE_VERIFICATION: 'e2e-google-verification',
      },
    },
  ],
});
