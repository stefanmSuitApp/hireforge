import { unitConfig } from '../../testing/src/vitest/preset';

// Numbering and expiry talk to Postgres: billing-numbering.int.test.ts and the
// worker / API suites cover them.
export default unitConfig(import.meta.url, {
  coverage: ['src/lib/nbs-middle-rate.ts'],
});
