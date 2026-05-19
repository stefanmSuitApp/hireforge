import { billingSequences } from 'database';
import type { DrizzleDbOrTx } from 'database';
import { sql } from 'drizzle-orm';

/** Matches `billing_sequences.kind` CHECK constraint. */
export type BillingDocumentKind = 'proforma' | 'invoice' | 'credit_note';

const DISPLAY_PREFIX: Record<BillingDocumentKind, string> = {
  proforma: 'PR',
  invoice: 'RA',
  credit_note: 'CN',
};

/** Stable (kind, year) → `pg_advisory_xact_lock` pair. */
function lockKeys(kind: BillingDocumentKind, year: number): [number, number] {
  const kindKey = kind === 'proforma' ? 1 : kind === 'invoice' ? 2 : 3;
  return [kindKey, year];
}

export type AllocatedBillingNumber = {
  /** Same shape persisted on `proformas` / `invoices` / `credit_notes`. */
  number: string;
  /** Current `last_value` for `(kind, year)` after allocation. */
  sequence: number;
};

/**
 * Atomic billing document numbers: advisory lock + UPSERT on
 * `billing_sequences` inside the caller’s transaction.
 */
export class BillingNumberingService {
  static async allocate(
    db: DrizzleDbOrTx,
    type: BillingDocumentKind,
    year: number,
  ): Promise<AllocatedBillingNumber> {
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new RangeError(
        'billing year must be an integer between 2000 and 2100',
      );
    }

    const [lockK1, lockK2] = lockKeys(type, year);
    await db.execute(sql`select pg_advisory_xact_lock(${lockK1}, ${lockK2})`);

    const [row] = await db
      .insert(billingSequences)
      .values({
        kind: type,
        year,
        lastValue: 1,
      })
      .onConflictDoUpdate({
        target: [billingSequences.kind, billingSequences.year],
        set: {
          lastValue: sql`${billingSequences.lastValue} + 1`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ lastValue: billingSequences.lastValue });

    if (row == null) {
      throw new Error('billing sequence allocation returned no row');
    }

    const prefix = DISPLAY_PREFIX[type];
    const padded = String(row.lastValue).padStart(6, '0');
    return {
      number: `${prefix}-${year}/${padded}`,
      sequence: row.lastValue,
    };
  }
}
