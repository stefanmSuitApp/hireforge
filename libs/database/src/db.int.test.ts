import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { insertCompany } from 'testing/db';
import { testDb } from 'testing/db';
import { createDb } from './db';
import { companies } from './schema';

const { db, pool } = createDb(testDb().url);
afterAll(() => pool.end());

describe('createDb', () => {
  it('reads rows through the Drizzle schema from the migrated database', async () => {
    const seeded = await insertCompany();
    const [row] = await db
      .select({ slug: companies.slug, country: companies.countryCode })
      .from(companies)
      .where(eq(companies.id, seeded.id));
    expect(row).toEqual({ slug: seeded.slug, country: 'RS' });
  });
});
