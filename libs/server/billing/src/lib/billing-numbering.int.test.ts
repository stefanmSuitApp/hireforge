import { afterAll, describe, expect, it } from 'vitest';

import { createDb } from 'database';
import { testDb } from 'testing/db';

import { BillingNumberingService } from './billing-numbering';

// Was opt-in (RUN_BILLING_CONCURRENCY_STRESS=1 against a hand-made database);
// now always runs on this file's own Postgres.
const { db, pool } = createDb(testDb().url);
afterAll(() => pool.end());

describe('BillingNumberingService.allocate on real Postgres', () => {
  it('hands out 50 unique, gap-free numbers to 50 parallel transactions', async () => {
    const numbers = await Promise.all(
      Array.from({ length: 50 }, () =>
        db.transaction((tx) =>
          BillingNumberingService.allocate(tx, 'credit_note', 2099),
        ),
      ),
    );
    const sequences = numbers.map((n) => n.sequence).sort((a, b) => a - b);
    expect(sequences).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
    expect(new Set(numbers.map((n) => n.number)).size).toBe(50);
    expect(numbers.find((n) => n.sequence === 7)?.number).toBe(
      'CN-2099/000007',
    );
  });

  it('a rolled-back transaction gives its number back (no gaps)', async () => {
    await db
      .transaction(async (tx) => {
        await BillingNumberingService.allocate(tx, 'invoice', 2098);
        throw new Error('roll back');
      })
      .catch(() => undefined);
    const next = await db.transaction((tx) =>
      BillingNumberingService.allocate(tx, 'invoice', 2098),
    );
    expect(next.number).toBe('RA-2098/000001');
  });

  it('keeps a separate sequence per document kind and per year', async () => {
    const [proforma, invoice, nextYear] = await Promise.all([
      db.transaction((tx) =>
        BillingNumberingService.allocate(tx, 'proforma', 2097),
      ),
      db.transaction((tx) =>
        BillingNumberingService.allocate(tx, 'invoice', 2097),
      ),
      db.transaction((tx) =>
        BillingNumberingService.allocate(tx, 'proforma', 2096),
      ),
    ]);
    expect([proforma.number, invoice.number, nextYear.number]).toEqual([
      'PR-2097/000001',
      'RA-2097/000001',
      'PR-2096/000001',
    ]);
  });

  it('refuses a year outside 2000-2100 before touching the database', async () => {
    await expect(
      db.transaction((tx) =>
        BillingNumberingService.allocate(tx, 'invoice', 1999),
      ),
    ).rejects.toThrow(RangeError);
  });
});
