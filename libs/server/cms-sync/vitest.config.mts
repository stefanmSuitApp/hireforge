import { unitConfig } from '../../testing/src/vitest/preset';

// package-mirror.ts writes to Postgres: covered by the API and worker suites.
export default unitConfig(import.meta.url, {
  coverage: ['src/lib/map-sanity-package.ts'],
});
