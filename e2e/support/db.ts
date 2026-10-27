import { randomInt, randomUUID } from 'node:crypto';

import { Client } from 'pg';

/** Seeded staff (scripts/db/seed-domain-baseline.sql). */
export const SEED_PASSWORD = 'HireforgeDev1!';
export const SEED_MODERATOR = {
  id: '00000000-0000-4000-8000-000000000002',
  email: 'moderator@hireforge.local',
};

async function withDb<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  const db = new Client({ connectionString: process.env['E2E_DATABASE_URL'] });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

export type ExistingCompany = {
  id: string;
  legalName: string;
  pib: string;
  mb: string;
};

/** A company another employer already owns, in the seed moderator's pipeline. */
export async function createOwnedCompany(): Promise<ExistingCompany> {
  const suffix = randomInt(100000, 999999);
  const company: ExistingCompany = {
    id: randomUUID(),
    legalName: `Žrtva ${suffix} d.o.o.`,
    pib: String(randomInt(100000000, 999999999)),
    mb: String(randomInt(10000000, 99999999)),
  };
  await withDb(async (db) => {
    await db.query(
      `INSERT INTO companies (id, slug, legal_name, pib, mb, country_code, source,
         sales_status, assigned_moderator_id, billing_email, iban)
       VALUES ($1, $2, $3, $4, $5, 'RS', 'moderator_lead', 'pipeline', $6,
         'billing@victim.example', 'RS35105008123123123173')`,
      [
        company.id,
        `zrtva-${suffix}`,
        company.legalName,
        company.pib,
        company.mb,
        SEED_MODERATOR.id,
      ],
    );
  });
  return company;
}

export async function employerCompanyIdsForEmail(
  email: string,
): Promise<string[]> {
  return withDb(async (db) => {
    const r = await db.query<{ company_id: string }>(
      `SELECT e.company_id FROM employers e JOIN users u ON u.id = e.user_id
       WHERE u.email = $1`,
      [email],
    );
    return r.rows.map((row) => row.company_id);
  });
}

export async function companyBillingEmail(companyId: string): Promise<string> {
  return withDb(async (db) => {
    const r = await db.query<{ billing_email: string }>(
      'SELECT billing_email FROM companies WHERE id = $1',
      [companyId],
    );
    return r.rows[0]?.billing_email ?? '';
  });
}
