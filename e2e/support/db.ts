import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';

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

/** Seeded published job (scripts/db/seed-domain-baseline.sql). */
export const SEED_JOB_ID = '20000000-0000-4000-8000-000000000001';

export async function authTokenCount(
  email: string,
  purpose: 'email_verify' | 'password_reset',
): Promise<number> {
  return withDb(async (db) => {
    const r = await db.query<{ n: string }>(
      `SELECT count(*) AS n FROM auth_tokens t JOIN users u ON u.id = t.user_id
       WHERE u.email = $1 AND t.purpose = $2`,
      [email, purpose],
    );
    return Number(r.rows[0]?.n ?? 0);
  });
}

/**
 * The real token only exists in the sent email, so tests plant their own
 * (same storage format as the API: SHA-256 hex of the raw token).
 */
export async function plantAuthToken(
  email: string,
  purpose: 'email_verify' | 'password_reset',
): Promise<string> {
  const raw = randomBytes(32).toString('base64url');
  await withDb(async (db) => {
    await db.query(
      `INSERT INTO auth_tokens (user_id, purpose, token_hash, expires_at)
       SELECT id, $2, $3, now() + interval '1 hour' FROM users WHERE email = $1`,
      [email, purpose, createHash('sha256').update(raw).digest('hex')],
    );
  });
  return raw;
}

export async function emailVerifiedAt(email: string): Promise<Date | null> {
  return withDb(async (db) => {
    const r = await db.query<{ email_verified_at: Date | null }>(
      'SELECT email_verified_at FROM users WHERE email = $1',
      [email],
    );
    return r.rows[0]?.email_verified_at ?? null;
  });
}

/** Seeded employer with a verified email whose company the seed moderator owns. */
export const SEED_EMPLOYER_VERIFIED = {
  email: 'maticstefan1996@gmail.com',
  companyId: '10000000-0000-4000-8000-000000000002',
};

export async function liveInvoiceCount(
  subscriptionId: string,
): Promise<number> {
  return withDb(async (db) => {
    const r = await db.query<{ n: string }>(
      'SELECT count(*) AS n FROM invoices WHERE subscription_id = $1 AND voided_at IS NULL',
      [subscriptionId],
    );
    return Number(r.rows[0]?.n ?? 0);
  });
}

export const SEED_ADMIN_EMAIL = 'admin@hireforge.local';

export async function jobPublishTimes(jobId: string): Promise<{
  status: string;
  publishedAt: Date | null;
  expiresAt: Date | null;
}> {
  return withDb(async (db) => {
    const r = await db.query<{
      status: string;
      published_at: Date | null;
      expires_at: Date | null;
    }>('SELECT status, published_at, expires_at FROM jobs WHERE id = $1', [
      jobId,
    ]);
    const row = r.rows[0];
    return {
      status: row?.status ?? '',
      publishedAt: row?.published_at ?? null,
      expiresAt: row?.expires_at ?? null,
    };
  });
}

export async function auditRows(
  entityId: string,
): Promise<{ action: string; metadata: Record<string, unknown> | null }[]> {
  return withDb(async (db) => {
    const r = await db.query<{
      action: string;
      metadata: Record<string, unknown> | null;
    }>(
      'SELECT action, metadata FROM staff_audit_log WHERE entity_id = $1 ORDER BY created_at',
      [entityId],
    );
    return r.rows;
  });
}

export async function promoRedemptionCount(code: string): Promise<number> {
  return withDb(async (db) => {
    const r = await db.query<{ n: string }>(
      'SELECT count(*) AS n FROM promo_redemptions WHERE code = $1',
      [code],
    );
    return Number(r.rows[0]?.n ?? 0);
  });
}
