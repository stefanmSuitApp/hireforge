import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import swc from 'unplugin-swc';
import {
  configDefaults,
  defineConfig,
  mergeConfig,
  type ViteUserConfig,
} from 'vitest/config';
import { testCacheDir } from './cache';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/** Integration tests need Docker; unit configs never pick them up. */
export const INTEGRATION_GLOB = 'src/**/*.int.test.ts';

/** SWC emits the decorator metadata NestJS dependency injection relies on. */
const nestDecorators = () =>
  swc.vite({
    jsc: {
      target: 'es2022',
      parser: { syntax: 'typescript', decorators: true },
      transform: {
        legacyDecorator: true,
        decoratorMetadata: true,
        // Same as the apps' tsconfig `"jsx": "react-jsx"` (PDF templates are .tsx).
        react: { runtime: 'automatic' },
      },
    },
  });

/** Dense logic must stay at least this covered (TEST_COVERAGE.md T5). */
export const COVERAGE_THRESHOLD = 90;

/**
 * Unit config (`pnpm test`, no Docker). `configUrl` is the config file's
 * `import.meta.url`: it sets the project root and its own cache directory.
 * `coverage` lists the dense-logic files whose line and branch coverage
 * `pnpm test` enforces; code that talks to Postgres or Redis is covered by
 * the integration suites instead, and UI by behaviour tests.
 */
export function unitConfig(
  configUrl: string,
  {
    coverage,
    extra = {},
  }: { coverage?: string[]; extra?: ViteUserConfig } = {},
): ViteUserConfig {
  return mergeConfig(
    defineConfig({
      root: dirname(fileURLToPath(configUrl)),
      cacheDir: testCacheDir(configUrl),
      plugins: [nxViteTsPaths()],
      test: {
        environment: 'node',
        globals: true,
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        exclude: [...configDefaults.exclude, INTEGRATION_GLOB],
        passWithNoTests: false,
        ...(coverage && {
          coverage: {
            enabled: true,
            provider: 'v8',
            include: coverage,
            reporter: ['text-summary'],
            reportsDirectory: `${testCacheDir(configUrl)}-coverage`,
            thresholds: {
              lines: COVERAGE_THRESHOLD,
              branches: COVERAGE_THRESHOLD,
              perFile: true,
            },
          },
        }),
      },
    }),
    extra,
  );
}

/**
 * Integration config (`pnpm test:integration`): real Postgres + Redis from
 * Testcontainers, one database per test file, one Redis DB per worker.
 * `nest: true` adds SWC so Nest modules get their decorator metadata.
 */
export function integrationConfig(
  configUrl: string,
  {
    nest = false,
    include = [INTEGRATION_GLOB],
    extra = {},
  }: { nest?: boolean; include?: string[]; extra?: ViteUserConfig } = {},
): ViteUserConfig {
  return mergeConfig(
    defineConfig({
      root: dirname(fileURLToPath(configUrl)),
      cacheDir: testCacheDir(configUrl),
      plugins: [nxViteTsPaths(), ...(nest ? [nestDecorators()] : [])],
      test: {
        environment: 'node',
        globals: true,
        // A separate option: mergeConfig appends arrays instead of replacing them.
        include,
        globalSetup: [here('../containers/global-setup.ts')],
        setupFiles: [here('../containers/setup-file.ts')],
        // Each worker gets its own Redis database (0-15): stay below 16.
        maxWorkers: 6,
        testTimeout: 30_000,
        hookTimeout: 120_000,
        // A flaky test is a bug (TEST_COVERAGE.md rules).
        retry: 0,
        // The API logs every request as JSON; show logs of failed tests only.
        silent: 'passed-only',
      },
    }),
    extra,
  );
}
