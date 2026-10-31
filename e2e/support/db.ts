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

/**
 * A company with one employer member, assigned to `assignedTo` (a staff user
 * id) in `salesStatus`. Returns the member's email.
 */
export async function createCompanyWithEmployer(opts: {
  assignedTo: string | null;
  salesStatus: 'unassigned' | 'pipeline' | 'closed_won' | 'closed_lost';
}): Promise<{ companyId: string; employerEmail: string }> {
  const suffix = randomInt(100000, 999999);
  const companyId = randomUUID();
  const employerEmail = `clan-${suffix}@firma.example`;
  await withDb(async (db) => {
    await db.query(
      `INSERT INTO companies (id, slug, legal_name, pib, mb, country_code, source,
         sales_status, assigned_moderator_id, billing_email)
       VALUES ($1, $2, $3, $4, $5, 'RS', 'moderator_lead', $6, $7,
         'billing@firma.example')`,
      [
        companyId,
        `firma-${suffix}`,
        `Firma ${suffix} d.o.o.`,
        String(randomInt(100000000, 999999999)),
        String(randomInt(10000000, 99999999)),
        opts.salesStatus,
        opts.assignedTo,
      ],
    );
    const user = await db.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, 'not-a-login', 'employer') RETURNING id`,
      [employerEmail],
    );
    await db.query(
      `INSERT INTO employers (user_id, company_id) VALUES ($1, $2)`,
      [user.rows[0].id, companyId],
    );
  });
  return { companyId, employerEmail };
}

export async function staffUserId(email: string): Promise<string> {
  return withDb(async (db) => {
    const r = await db.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [email],
    );
    return r.rows[0].id;
  });
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

export async function companyIdentifiers(
  companyId: string,
): Promise<{ pib: string | null; mb: string | null }> {
  return withDb(async (db) => {
    const r = await db.query<{ pib: string | null; mb: string | null }>(
      'SELECT pib, mb FROM companies WHERE id = $1',
      [companyId],
    );
    return r.rows[0] ?? { pib: null, mb: null };
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

export async function jobSlug(jobId: string): Promise<string | null> {
  return withDb(async (db) => {
    const r = await db.query<{ slug: string | null }>(
      'SELECT slug FROM jobs WHERE id = $1',
      [jobId],
    );
    return r.rows[0]?.slug ?? null;
  });
}

export type SeededJob = {
  id: string;
  slug: string;
  shortId: string;
  title: string;
};

/**
 * A published job of the seed DEVLEGION company in Beograd / Informacione
 * tehnologije, with a slug like the publish flow builds (`<stem>-<shortId>`). `expiresAt` in the past
 * makes it an ended ad. Featured (public to guests) unless `featured: false`,
 * which makes it a teaser that needs sign-in.
 */
export async function createPublishedJob(
  opts: {
    title?: string;
    expiresAt?: Date | null;
    applyMode?: 'internal' | 'external';
    featured?: boolean;
    /** Monthly net RSD range. */
    salary?: { min: number; max: number };
  } = {},
): Promise<SeededJob> {
  // Short ids are 4 chars (see shortIdFromJobSlug); specs that create dozens
  // of jobs can still collide, so retry on the unique slug.
  for (let attempt = 0; ; attempt++) {
    try {
      return await insertPublishedJob(opts);
    } catch (e) {
      const duplicate =
        e instanceof Error && /jobs_slug|short_id/.test(e.message);
      if (!duplicate || attempt >= 4) throw e;
    }
  }
}

async function insertPublishedJob(
  opts: Parameters<typeof createPublishedJob>[0] = {},
): Promise<SeededJob> {
  const shortId = randomInt(36 ** 4)
    .toString(36)
    .padStart(4, '0');
  const title = opts.title ?? `E2E inženjer ${shortId}`;
  const slug = `e2e-inzenjer-beograd-${shortId}`;
  const r = await withDb((db) =>
    db.query<{ id: string }>(
      `INSERT INTO jobs (company_id, created_by_user_id, title, description,
         description_plain, status, slug, short_id, city_id, category_id,
         published_at, expires_at, apply_mode, external_apply_url,
         employment_type, work_model, featured,
         salary_min, salary_max, salary_period, salary_basis)
       SELECT c.id, u.id, $1, $2, $2, 'published', $3, $4, ci.id, jc.id,
         now() - interval '1 day', $5, $6,
         CASE WHEN $6 = 'external' THEN 'https://example.com/apply' END,
         'full_time', 'hybrid', $7,
         $8::int, $9::int,
         CASE WHEN $8::int IS NOT NULL THEN 'month' END,
         CASE WHEN $8::int IS NOT NULL THEN 'net' END
       FROM companies c
       JOIN users u ON u.email = 'employer@hireforge.local'
       JOIN cities ci ON ci.slug = 'beograd' AND ci.country_code = 'RS'
       JOIN job_categories jc ON jc.slug = 'informacione-tehnologije'
       WHERE c.slug = 'devlegion'
       RETURNING id`,
      [
        title,
        `Opis posla za ${title}. Rad u Beogradu, hibridno.`,
        slug,
        shortId,
        opts.expiresAt ?? null,
        opts.applyMode ?? 'internal',
        opts.featured ?? true,
        opts.salary?.min ?? null,
        opts.salary?.max ?? null,
      ],
    ),
  );
  const id = r.rows[0]?.id;
  if (!id) throw new Error('seed company/city/category missing');
  return { id, slug, shortId, title };
}

/** What an edit + re-publish does to the URL: new stem, same short id. */
export async function renameJobSlug(
  job: SeededJob,
  stem: string,
): Promise<string> {
  const slug = `${stem}-${job.shortId}`;
  await withDb((db) =>
    db.query('UPDATE jobs SET slug = $2, updated_at = now() WHERE id = $1', [
      job.id,
      slug,
    ]),
  );
  return slug;
}

/** Stable dates for screenshots. */
export async function setJobPublishedAt(
  jobId: string,
  at: Date,
): Promise<void> {
  await withDb((db) =>
    db.query(
      'UPDATE jobs SET published_at = $2, updated_at = $2 WHERE id = $1',
      [jobId, at],
    ),
  );
}

/** Moves a subscription's creation back in time (for expiry sweeps). */
export async function backdateSubscription(
  subscriptionId: string,
  days: number,
): Promise<void> {
  await withDb(async (db) => {
    await db.query(
      `UPDATE subscriptions SET created_at = now() - make_interval(days => $2)
       WHERE id = $1`,
      [subscriptionId, days],
    );
  });
}

export async function subscriptionState(subscriptionId: string): Promise<{
  status: string;
  proformaVoided: boolean;
  promoRedemptions: number;
}> {
  return withDb(async (db) => {
    const r = await db.query<{
      status: string;
      proforma_voided: boolean;
      promo_redemptions: string;
    }>(
      `SELECT s.status,
              (p.voided_at IS NOT NULL) AS proforma_voided,
              (SELECT count(*) FROM promo_redemptions pr WHERE pr.subscription_id = s.id) AS promo_redemptions
       FROM subscriptions s LEFT JOIN proformas p ON p.id = s.proforma_id
       WHERE s.id = $1`,
      [subscriptionId],
    );
    const row = r.rows[0];
    return {
      status: row?.status ?? '',
      proformaVoided: row?.proforma_voided ?? false,
      promoRedemptions: Number(row?.promo_redemptions ?? 0),
    };
  });
}

export async function promoRedemptionsCounter(code: string): Promise<number> {
  return withDb(async (db) => {
    const r = await db.query<{ redemptions_count: number }>(
      'SELECT redemptions_count FROM promo_codes WHERE code = $1',
      [code],
    );
    return r.rows[0]?.redemptions_count ?? -1;
  });
}
