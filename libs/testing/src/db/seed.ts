import { hash } from 'bcryptjs';
import type { Pool, PoolClient } from 'pg';
import type { SeedCompany } from '../companies';
import { testDb } from './test-database';

type Db = Pool | PoolClient;

/** The password of every user the factories create. */
export const TEST_PASSWORD = 'Test-password-1';

// Cost 4: the API's bcrypt.compare accepts any cost, and 12 rounds per user
// would make the role matrix take minutes.
let hashed: Promise<string> | undefined;
const passwordHash = () => (hashed ??= hash(TEST_PASSWORD, 4));

let seq = 0;
const next = () => `${process.env['VITEST_POOL_ID'] ?? '0'}-${++seq}`;

const db = (given?: Db): Db => given ?? testDb().pool;

/** The one row an `insert … returning` gave back. */
function one<T>(rows: T[]): T {
  const row = rows[0];
  if (!row) throw new Error('insert returned no row');
  return row;
}

export type Role = 'admin' | 'moderator' | 'employer' | 'candidate';

export interface SeededUser {
  id: string;
  email: string;
  role: Role;
}

export async function insertUser(
  role: Role,
  {
    email,
    verified = true,
    publicDisplayName = null,
  }: {
    email?: string;
    verified?: boolean;
    publicDisplayName?: string | null;
  } = {},
  given?: Db,
): Promise<SeededUser> {
  const address = email ?? `${role}-${next()}@test.sljakam.local`;
  const { rows } = await db(given).query<{ id: string }>(
    `insert into users (email, role, password_hash, email_verified_at, public_display_name)
     values ($1, $2, $3, $4, $5) returning id`,
    [
      address,
      role,
      await passwordHash(),
      verified ? new Date() : null,
      publicDisplayName,
    ],
  );
  return { id: one(rows).id, email: address, role };
}

export interface SeededCompany {
  id: string;
  slug: string;
  legalName: string;
}

/**
 * A domestic company. Pass COMPANY_A / COMPANY_B for the isolation pair; any
 * other call gets a unique slug and PIB/MB.
 */
export async function insertCompany(
  {
    company,
    assignedModeratorId = null,
    salesStatus = 'unassigned',
    source = 'admin_lead',
    verified = true,
  }: {
    company?: Partial<SeedCompany>;
    assignedModeratorId?: string | null;
    salesStatus?: 'unassigned' | 'pipeline' | 'closed_won' | 'closed_lost';
    source?: 'self_signup' | 'moderator_lead' | 'admin_lead';
    verified?: boolean;
  } = {},
  given?: Db,
): Promise<SeededCompany> {
  const n = next();
  const digits =
    String(Date.now() % 1e6).padStart(6, '0') + String(seq).padStart(3, '0');
  const values = {
    slug: company?.slug ?? `firma-${n}`,
    legalName: company?.legalName ?? `Firma ${n} d.o.o.`,
    pib: company?.pib ?? digits.slice(-9),
    mb: company?.mb ?? digits.slice(-8),
  };
  const { rows } = await db(given).query<{ id: string }>(
    `insert into companies (id, slug, legal_name, pib, mb, source, sales_status,
       assigned_moderator_id, verified_at, billing_email, address_line_1,
       address_postal_code, address_city, billing_contact_name, invoice_currency)
     values (coalesce($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9,
       $10, 'Knez Mihailova 1', '11000', 'Beograd', 'Billing Person', 'RSD')
     returning id`,
    [
      company?.id ?? null,
      values.slug,
      values.legalName,
      values.pib,
      values.mb,
      source,
      salesStatus,
      assignedModeratorId,
      verified ? new Date() : null,
      `billing-${n}@test.sljakam.local`,
    ],
  );
  return { id: one(rows).id, slug: values.slug, legalName: values.legalName };
}

export async function insertEmployer(
  companyId: string,
  options: { verified?: boolean; email?: string } = {},
  given?: Db,
): Promise<SeededUser & { companyId: string }> {
  const user = await insertUser('employer', options, given);
  await db(given).query(
    `insert into employers (user_id, company_id) values ($1, $2)`,
    [user.id, companyId],
  );
  return { ...user, companyId };
}

export async function insertCandidate(
  options: { verified?: boolean; email?: string; fullName?: string } = {},
  given?: Db,
): Promise<SeededUser & { candidateId: string }> {
  const user = await insertUser('candidate', options, given);
  const { rows } = await db(given).query<{ id: string }>(
    `insert into candidates (user_id, full_name) values ($1, $2) returning id`,
    [user.id, options.fullName ?? 'Petar Petrović'],
  );
  return { ...user, candidateId: one(rows).id };
}

/** A moderator; with `pipeline`, those companies are assigned to them. */
export async function insertModerator(
  { pipeline = [] }: { pipeline?: string[] } = {},
  given?: Db,
): Promise<SeededUser> {
  const user = await insertUser(
    'moderator',
    { publicDisplayName: 'Mira Moderator' },
    given,
  );
  if (pipeline.length) {
    await db(given).query(
      `update companies set assigned_moderator_id = $1, sales_status = 'pipeline'
       where id = any($2::uuid[])`,
      [user.id, pipeline],
    );
  }
  return user;
}

export const insertAdmin = (given?: Db) => insertUser('admin', {}, given);

export async function categoryId(slug = 'it', given?: Db): Promise<string> {
  const { rows } = await db(given).query<{ id: string }>(
    `select id from job_categories where slug = $1`,
    [slug],
  );
  if (!rows[0]) throw new Error(`job category ${slug} is not seeded`);
  return rows[0].id;
}

export async function cityId(slug = 'beograd', given?: Db): Promise<string> {
  const { rows } = await db(given).query<{ id: string }>(
    `select id from cities where slug = $1 and country_code = 'RS' limit 1`,
    [slug],
  );
  if (!rows[0]) throw new Error(`city ${slug} is not seeded`);
  return rows[0].id;
}

export type PackageCode = 'tezga' | 'sljaka' | 'sef' | 'gazda';

const PACKAGE_NAMES: Record<PackageCode, string> = {
  tezga: 'TEZGA',
  sljaka: 'ŠLJAKA',
  sef: 'ŠEF',
  gazda: 'GAZDA',
};

export interface SeededSubscription {
  id: string;
  proformaId: string | null;
}

/**
 * A subscription with the package's real entitlements snapshot. `active`
 * starts now and runs `durationDays`; `pending_payment` gets a proforma.
 */
export async function insertSubscription(
  companyId: string,
  {
    packageCode = 'sef',
    status = 'active',
    durationDays = 30,
    priceMinor = 5500,
    currency = 'EUR',
  }: {
    packageCode?: PackageCode;
    status?: 'pending_payment' | 'active' | 'expired' | 'cancelled';
    durationDays?: number;
    priceMinor?: number;
    currency?: string;
  } = {},
  given?: Db,
): Promise<SeededSubscription> {
  const client = db(given);
  const { rows } = await client.query<{ id: string }>(
    `insert into subscriptions (company_id, package_code, package_name_snapshot,
       duration_days_snapshot, price_minor_snapshot, currency_snapshot,
       entitlements_json_snapshot, status, starts_at, ends_at)
     select $1, $2, $3, $4, $5, $6,
       (select jsonb_object_agg(key, value) from package_entitlements where package_code = $2),
       $7::subscription_status,
       case when $7 in ('active', 'expired') then now() - case when $7 = 'expired' then make_interval(days => $4 + 1) else interval '0' end end,
       case when $7 in ('active', 'expired') then now() + make_interval(days => $4) - case when $7 = 'expired' then make_interval(days => $4 + 1) else interval '0' end end
     returning id`,
    [
      companyId,
      packageCode,
      PACKAGE_NAMES[packageCode],
      durationDays,
      priceMinor,
      currency,
      status,
    ],
  );
  const id = one(rows).id;
  let proformaId: string | null = null;
  if (status === 'pending_payment') {
    proformaId = await insertProforma(
      id,
      { totalMinor: priceMinor, currency },
      client,
    );
  }
  return { id, proformaId };
}

let documentSeq = 0;

export async function insertProforma(
  subscriptionId: string,
  {
    totalMinor = 5500,
    currency = 'EUR',
  }: { totalMinor?: number; currency?: string } = {},
  given?: Db,
): Promise<string> {
  const number = `PR-2099/T${process.env['VITEST_POOL_ID'] ?? '0'}${String(++documentSeq).padStart(5, '0')}`;
  const { rows } = await db(given).query<{ id: string }>(
    `insert into proformas (subscription_id, number, total_minor, currency)
     values ($1, $2, $3, $4) returning id`,
    [subscriptionId, number, totalMinor, currency],
  );
  const id = one(rows).id;
  await db(given).query(
    `update subscriptions set proforma_id = $1 where id = $2`,
    [id, subscriptionId],
  );
  return id;
}

export type JobStatus =
  | 'draft'
  | 'submitted'
  | 'published'
  | 'rejected'
  | 'archived'
  | 'expired';

export interface SeededJob {
  id: string;
  slug: string;
  shortId: string;
}

/**
 * A job of `companyId`. Published and expired jobs get a slug, short id and
 * `published_at`; `expired` has `expires_at` in the past.
 */
export async function insertJob(
  companyId: string,
  createdByUserId: string,
  {
    status = 'draft',
    title = 'Senior TypeScript developer',
    description = 'Gradimo platformu za zapošljavanje. NestJS, PostgreSQL, Next.js.',
    subscriptionId = null,
    category = 'it',
    city = 'beograd',
    expiresInDays = 30,
    applyMode = 'internal',
    externalApplyUrl = null,
  }: {
    status?: JobStatus;
    title?: string;
    description?: string;
    subscriptionId?: string | null;
    category?: string;
    city?: string;
    expiresInDays?: number;
    applyMode?: 'internal' | 'external';
    externalApplyUrl?: string | null;
  } = {},
  given?: Db,
): Promise<SeededJob> {
  const n = next();
  const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${n}`;
  const shortId = `t${n.replace(/\D/g, '')}`.slice(0, 12);
  const live =
    status === 'published' || status === 'expired' || status === 'archived';
  const { rows } = await db(given).query<{ id: string }>(
    `insert into jobs (company_id, created_by_user_id, subscription_id, title,
       description, description_plain, description_html, status, slug, short_id,
       category_id, city_id, submitted_at, published_at, expires_at, apply_mode,
       external_apply_url)
     values ($1, $2, $3, $4, $5, $5, '<p>' || $5 || '</p>', $6::job_status, $7, $8,
       (select id from job_categories where slug = $9),
       (select id from cities where slug = $10 and country_code = 'RS' limit 1),
       case when $6 <> 'draft' then now() end,
       case when $11 then now() - interval '1 day' end,
       case when $11 then now() + make_interval(days => $12) end,
       $13, $14)
     returning id`,
    [
      companyId,
      createdByUserId,
      subscriptionId,
      title,
      description,
      status,
      live ? slug : null,
      live ? shortId : null,
      category,
      city,
      live,
      status === 'expired' ? -1 : expiresInDays,
      applyMode,
      externalApplyUrl,
    ],
  );
  return { id: one(rows).id, slug, shortId };
}

export async function insertResume(
  candidateId: string,
  { isPrimary = true }: { isPrimary?: boolean } = {},
  given?: Db,
): Promise<string> {
  const { rows } = await db(given).query<{ id: string }>(
    `insert into resume_assets (candidate_id, storage_key, original_filename, mime_type, byte_size, is_primary)
     values ($1, $2, 'cv.pdf', 'application/pdf', 1024, $3) returning id`,
    [candidateId, `test/${next()}/cv.pdf`, isPrimary],
  );
  return one(rows).id;
}

export async function insertApplication(
  jobId: string,
  candidateId: string,
  {
    status = 'submitted',
    resumeAssetId = null,
  }: { status?: string; resumeAssetId?: string | null } = {},
  given?: Db,
): Promise<string> {
  const { rows } = await db(given).query<{ id: string }>(
    `insert into applications (job_id, candidate_id, status, resume_asset_id, cover_letter_text)
     values ($1, $2, $3::application_status, $4, 'Zdravo, prijavljujem se.') returning id`,
    [jobId, candidateId, status, resumeAssetId],
  );
  return one(rows).id;
}

export async function insertSavedJob(
  candidateId: string,
  jobId: string,
  given?: Db,
): Promise<string> {
  const { rows } = await db(given).query<{ id: string }>(
    `insert into saved_jobs (candidate_id, job_id) values ($1, $2) returning id`,
    [candidateId, jobId],
  );
  return one(rows).id;
}

export async function insertSavedSearch(
  candidateId: string,
  query: Record<string, string> = { q: 'developer' },
  given?: Db,
): Promise<string> {
  const { rows } = await db(given).query<{ id: string }>(
    `insert into saved_job_searches (candidate_id, query_json) values ($1, $2) returning id`,
    [candidateId, JSON.stringify(query)],
  );
  return one(rows).id;
}

export async function insertJoinRequest(
  userId: string,
  companyId: string,
  status: 'pending' | 'approved' | 'rejected' = 'pending',
  given?: Db,
): Promise<string> {
  const { rows } = await db(given).query<{ id: string }>(
    `insert into company_join_requests (user_id, company_id, status) values ($1, $2, $3) returning id`,
    [userId, companyId, status],
  );
  return one(rows).id;
}

export type PromoInput = {
  code?: string;
  discountType?: 'percent' | 'fixed' | 'full_free';
  value?: number;
  currency?: string | null;
  maxPerCompany?: number | null;
  maxRedemptions?: number | null;
  applicablePackages?: string[] | null;
  validFrom?: Date | null;
  validTo?: Date | null;
};

export async function insertPromoCode(
  {
    code = `PROMO${next().replace(/\D/g, '')}`,
    discountType = 'percent',
    value = 10,
    currency = discountType === 'fixed' ? 'EUR' : null,
    maxPerCompany = null,
    maxRedemptions = null,
    applicablePackages = null,
    validFrom = null,
    validTo = null,
  }: PromoInput = {},
  given?: Db,
): Promise<{ id: string; code: string }> {
  const { rows } = await db(given).query<{ id: string }>(
    `insert into promo_codes (code, discount_type, value, currency, max_per_company,
       max_redemptions, applicable_packages, valid_from, valid_to)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
    [
      code,
      discountType,
      value,
      currency,
      maxPerCompany,
      maxRedemptions,
      applicablePackages,
      validFrom,
      validTo,
    ],
  );
  return { id: one(rows).id, code };
}

export async function insertOutboxEvent(
  eventType: string,
  payload: Record<string, unknown>,
  given?: Db,
): Promise<number> {
  const { rows } = await db(given).query<{ id: number }>(
    `insert into outbox_events (event_type, payload) values ($1, $2) returning id`,
    [eventType, JSON.stringify(payload)],
  );
  return one(rows).id;
}

/** COMPANY_A or COMPANY_B with one verified employer and an active ŠEF subscription. */
export async function seedCompanyWithEmployer(
  company: SeedCompany,
  given?: Db,
): Promise<{
  company: SeededCompany;
  employer: SeededUser & { companyId: string };
  subscription: SeededSubscription;
}> {
  const row = await insertCompany({ company }, given);
  const employer = await insertEmployer(row.id, {}, given);
  const subscription = await insertSubscription(row.id, {}, given);
  return { company: row, employer, subscription };
}
