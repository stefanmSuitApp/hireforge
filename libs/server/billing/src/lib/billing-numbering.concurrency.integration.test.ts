import { afterAll, describe, expect, it } from 'vitest';

import { createDb } from 'database';

import { BillingNumberingService } from './billing-numbering';

const runConcurrency =
  process.env['RUN_BILLING_CONCURRENCY_STRESS'] === '1' &&
  Boolean(process.env['DATABASE_URL']?.trim());

/**
 * Opt-in: allocates 50 real `billing_sequences` rows for `credit_note` / year 2099.
 * Run: `RUN_BILLING_CONCURRENCY_STRESS=1 DATABASE_URL=… pnpm exec nx test server-billing`
 */
describe.skipIf(!runConcurrency)(
  'BillingNumberingService concurrent allocation (stress)',
  () => {
    const conn = process.env['DATABASE_URL'] ?? '';
    const { db, pool } = createDb(conn);
    const STRESS_YEAR = 2099;

    afterAll(async () => {
      await pool.end();
    });

    it('returns 50 unique document numbers in parallel', async () => {
      const nums = await Promise.all(
        Array.from({ length: 50 }, () =>
          db.transaction(async (tx) =>
            BillingNumberingService.allocate(tx, 'credit_note', STRESS_YEAR),
          ),
        ),
      );
      const set = new Set(nums.map((n) => n.number));
      expect(set.size).toBe(50);
    });
  },
);
