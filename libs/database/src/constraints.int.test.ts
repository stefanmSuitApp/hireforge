// What the database itself refuses, independent of service code. Each case
// is a rule some service relies on as its last line of defence.
import { DatabaseError } from 'pg';
import { describe, expect, it } from 'vitest';
import {
  insertAdmin,
  insertApplication,
  insertCandidate,
  insertCompany,
  insertEmployer,
  insertJob,
  insertJoinRequest,
  insertModerator,
  insertProforma,
  insertPromoCode,
  insertResume,
  insertSubscription,
  testDb,
} from 'testing/db';

const q = (sql: string, params: unknown[] = []) =>
  testDb().pool.query(sql, params);

/** Runs `sql` and expects Postgres to refuse it with `code` on `constraint`. */
async function refused(
  run: Promise<unknown>,
  code: '23505' | '23503' | '23514' | '23502',
  constraint?: string,
): Promise<void> {
  const error = await run.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error, 'expected Postgres to refuse this').toBeInstanceOf(
    DatabaseError,
  );
  expect((error as DatabaseError).code).toBe(code);
  if (constraint) expect((error as DatabaseError).constraint).toBe(constraint);
}

async function invoice(subscriptionId: string, number: string, voided = false) {
  return q(
    `insert into invoices (subscription_id, number, total_minor, currency, voided_at)
     values ($1, $2, 5500, 'EUR', $3)`,
    [subscriptionId, number, voided ? new Date() : null],
  );
}

describe('billing', () => {
  it('a subscription can have only one live invoice (0028)', async () => {
    const company = await insertCompany();
    const sub = await insertSubscription(company.id);
    await invoice(sub.id, 'RA-2099/C00001');
    await refused(
      invoice(sub.id, 'RA-2099/C00002'),
      '23505',
      'invoices_subscription_live_unique',
    );
  });

  it('a voided invoice does not block the replacement', async () => {
    const company = await insertCompany();
    const sub = await insertSubscription(company.id);
    await invoice(sub.id, 'RA-2099/C00003', true);
    await expect(invoice(sub.id, 'RA-2099/C00004')).resolves.toBeDefined();
  });

  it('invoice and proforma numbers are unique', async () => {
    const company = await insertCompany();
    const a = await insertSubscription(company.id);
    const b = await insertSubscription(company.id);
    await invoice(a.id, 'RA-2099/C00005');
    await refused(
      invoice(b.id, 'RA-2099/C00005'),
      '23505',
      'invoices_number_unique',
    );
    await q(
      `insert into proformas (subscription_id, number, total_minor, currency) values ($1, 'PR-2099/C1', 1, 'EUR')`,
      [a.id],
    );
    await refused(
      q(
        `insert into proformas (subscription_id, number, total_minor, currency) values ($1, 'PR-2099/C1', 1, 'EUR')`,
        [b.id],
      ),
      '23505',
      'proformas_number_unique',
    );
  });

  it('billing sequences accept only proforma, invoice and credit_note', async () => {
    await refused(
      q(
        `insert into billing_sequences (kind, year, last_value) values ('receipt', 2099, 1)`,
      ),
      '23514',
      'billing_sequences_kind_check',
    );
  });

  it('a company with a subscription cannot be deleted (invoices must survive)', async () => {
    const company = await insertCompany();
    await insertSubscription(company.id);
    await refused(
      q('delete from companies where id = $1', [company.id]),
      '23503',
    );
  });

  it('a subscription with a proforma cannot be deleted', async () => {
    const company = await insertCompany();
    const sub = await insertSubscription(company.id, { status: 'cancelled' });
    await insertProforma(sub.id);
    await refused(
      q('delete from subscriptions where id = $1', [sub.id]),
      '23503',
    );
  });

  it('a company VAT treatment is one of the three regimes', async () => {
    const company = await insertCompany();
    await refused(
      q(`update companies set vat_treatment = 'rs_exempt' where id = $1`, [
        company.id,
      ]),
      '23514',
      'companies_vat_treatment_check',
    );
  });
});

describe('promo codes', () => {
  it('codes are unique', async () => {
    await insertPromoCode({ code: 'LETO26' });
    await refused(
      insertPromoCode({ code: 'LETO26' }),
      '23505',
      'promo_codes_code_unique',
    );
  });

  it('a percent discount must be between 0 and 100', async () => {
    await refused(
      insertPromoCode({ discountType: 'percent', value: 101 }),
      '23514',
      'promo_codes_value_range_check',
    );
  });

  it('a fixed discount may not be negative', async () => {
    await refused(
      insertPromoCode({ discountType: 'fixed', value: -1 }),
      '23514',
      'promo_codes_value_range_check',
    );
  });

  it('the validity window cannot end before it starts', async () => {
    await refused(
      insertPromoCode({
        validFrom: new Date('2026-02-01'),
        validTo: new Date('2026-01-01'),
      }),
      '23514',
      'promo_codes_validity_window_check',
    );
  });

  it('an unknown discount type is refused', async () => {
    await refused(
      insertPromoCode({ discountType: 'bogo' as 'fixed' }),
      '23514',
      'promo_codes_discount_type_check',
    );
  });

  // 0029 adds the column only: "fixed codes need a currency" is checkout's
  // rule (apps/api promo tests), not the database's.
  it('the database itself still accepts a fixed code without a currency', async () => {
    await expect(
      insertPromoCode({ discountType: 'fixed', value: 500, currency: null }),
    ).resolves.toBeDefined();
  });
});

describe('auth tokens', () => {
  async function token(userId: string, hash: string, purpose = 'email_verify') {
    return q(
      `insert into auth_tokens (user_id, purpose, token_hash, expires_at)
       values ($1, $2, $3, now() + interval '1 hour')`,
      [userId, purpose, hash],
    );
  }

  it('a token hash is unique', async () => {
    const user = await insertCandidate();
    await token(user.id, 'h-unique');
    await refused(
      token(user.id, 'h-unique'),
      '23505',
      'auth_tokens_token_hash_unique',
    );
  });

  it('a purpose is email_verify or password_reset', async () => {
    const user = await insertCandidate();
    await refused(
      token(user.id, 'h-purpose', 'login'),
      '23514',
      'auth_tokens_purpose_check',
    );
  });

  it('every token has an expiry', async () => {
    const user = await insertCandidate();
    await refused(
      q(
        `insert into auth_tokens (user_id, purpose, token_hash) values ($1, 'email_verify', 'h-exp')`,
        [user.id],
      ),
      '23502',
    );
  });

  it("a user's tokens go when the user goes", async () => {
    const user = await insertCandidate();
    await token(user.id, 'h-cascade');
    await q('delete from users where id = $1', [user.id]);
    const { rowCount } = await q(
      `select 1 from auth_tokens where token_hash = 'h-cascade'`,
    );
    expect(rowCount).toBe(0);
  });
});

describe('slugs', () => {
  it('two companies cannot share a slug', async () => {
    await insertCompany({ company: { slug: 'ista-firma' } });
    await refused(
      insertCompany({ company: { slug: 'ista-firma' } }),
      '23505',
      'companies_slug_unique',
    );
  });

  it('PIB, MB and VAT id are unique when present', async () => {
    await insertCompany({ company: { pib: '111111111', mb: '11111111' } });
    await refused(
      insertCompany({ company: { pib: '111111111' } }),
      '23505',
      'companies_pib_unique',
    );
    await refused(
      insertCompany({ company: { mb: '11111111' } }),
      '23505',
      'companies_mb_unique',
    );
  });

  it('two published jobs cannot share a slug, but drafts and expired ones can', async () => {
    const company = await insertCompany();
    const employer = await insertEmployer(company.id);
    const a = await insertJob(company.id, employer.id, { status: 'published' });
    const b = await insertJob(company.id, employer.id, { status: 'expired' });
    await q(`update jobs set slug = $1 where id = $2`, [a.slug, b.id]);
    const draft = await insertJob(company.id, employer.id);
    await q(`update jobs set slug = $1 where id = $2`, [a.slug, draft.id]);
    const c = await insertJob(company.id, employer.id, { status: 'published' });
    await refused(
      q(`update jobs set slug = $1 where id = $2`, [a.slug, c.id]),
      '23505',
      'jobs_slug_published_unique',
    );
  });

  it('two categories cannot share a slug', async () => {
    await refused(
      q(`insert into job_categories (slug, name_sr) values ('it', 'IT 2')`),
      '23505',
      'job_categories_slug_unique',
    );
  });

  it('a user email is unique', async () => {
    const user = await insertCandidate();
    await refused(
      q(`insert into users (email, role) values ($1, 'employer')`, [
        user.email,
      ]),
      '23505',
      'users_email_unique',
    );
  });
});

describe('applications, CVs and join requests', () => {
  it('a candidate has one active application per job; after withdrawing they may apply again', async () => {
    const company = await insertCompany();
    const employer = await insertEmployer(company.id);
    const job = await insertJob(company.id, employer.id, {
      status: 'published',
    });
    const candidate = await insertCandidate();
    const first = await insertApplication(job.id, candidate.candidateId);
    await refused(
      insertApplication(job.id, candidate.candidateId),
      '23505',
      'applications_candidate_job_active_unique',
    );
    await q(`update applications set status = 'withdrawn' where id = $1`, [
      first,
    ]);
    await expect(
      insertApplication(job.id, candidate.candidateId),
    ).resolves.toBeDefined();
  });

  it('a candidate has at most one primary CV', async () => {
    const candidate = await insertCandidate();
    await insertResume(candidate.candidateId);
    await refused(
      insertResume(candidate.candidateId),
      '23505',
      'resume_assets_candidate_primary_unique',
    );
    await expect(
      insertResume(candidate.candidateId, { isPrimary: false }),
    ).resolves.toBeDefined();
  });

  it('a CV attached to an application cannot be deleted', async () => {
    const company = await insertCompany();
    const employer = await insertEmployer(company.id);
    const job = await insertJob(company.id, employer.id, {
      status: 'published',
    });
    const candidate = await insertCandidate();
    const resume = await insertResume(candidate.candidateId);
    await insertApplication(job.id, candidate.candidateId, {
      resumeAssetId: resume,
    });
    await refused(
      q('delete from resume_assets where id = $1', [resume]),
      '23503',
    );
  });

  it('a user has at most one pending join request', async () => {
    const a = await insertCompany();
    const b = await insertCompany();
    const user = await insertCandidate();
    await insertJoinRequest(user.id, a.id);
    await refused(
      insertJoinRequest(user.id, b.id),
      '23505',
      'company_join_requests_user_pending_unique',
    );
    await expect(
      insertJoinRequest(user.id, b.id, 'rejected'),
    ).resolves.toBeDefined();
  });

  it('a join request status is pending, approved or rejected', async () => {
    const company = await insertCompany();
    const user = await insertCandidate();
    await refused(
      insertJoinRequest(user.id, company.id, 'maybe' as 'pending'),
      '23514',
      'company_join_requests_status_check',
    );
  });

  it('an employer membership is unique per user and company', async () => {
    const company = await insertCompany();
    const employer = await insertEmployer(company.id);
    await refused(
      q('insert into employers (user_id, company_id) values ($1, $2)', [
        employer.id,
        company.id,
      ]),
      '23505',
      'employers_user_id_company_id_unique',
    );
  });
});

describe('deleting companies, jobs and users', () => {
  it("deleting a company without billing removes its jobs, employers and their jobs' applications", async () => {
    const company = await insertCompany();
    const employer = await insertEmployer(company.id);
    const job = await insertJob(company.id, employer.id, {
      status: 'published',
    });
    const candidate = await insertCandidate();
    await insertApplication(job.id, candidate.candidateId);
    await q('delete from jobs where company_id = $1', [company.id]);
    await q('delete from companies where id = $1', [company.id]);
    const left = await q(
      `select (select count(*) from employers where company_id = $1)::int as employers,
              (select count(*) from applications where job_id = $2)::int as applications`,
      [company.id, job.id],
    );
    expect(left.rows[0]).toEqual({ employers: 0, applications: 0 });
  });

  it('a user who created jobs cannot be deleted (the job keeps its author)', async () => {
    const company = await insertCompany();
    const employer = await insertEmployer(company.id);
    await insertJob(company.id, employer.id);
    await refused(q('delete from users where id = $1', [employer.id]), '23503');
  });

  it('deleting a moderator keeps their companies and clears the assignment', async () => {
    const company = await insertCompany();
    const moderator = await insertModerator({ pipeline: [company.id] });
    await q('delete from users where id = $1', [moderator.id]);
    const { rows } = await q(
      'select assigned_moderator_id from companies where id = $1',
      [company.id],
    );
    expect(rows[0].assigned_moderator_id).toBeNull();
  });

  // actor_user_id is ON DELETE SET NULL (0034): the audit rows outlive the
  // staff user.
  it('deleting a staff user keeps the audit rows of what they did', async () => {
    const admin = await insertAdmin();
    await q(
      `insert into staff_audit_log (actor_user_id, action, entity_type, entity_id)
       values ($1, 'subscription.mark_paid', 'subscription', 'x')`,
      [admin.id],
    );
    await q('delete from users where id = $1', [admin.id]);
    const { rowCount } = await q(
      `select 1 from staff_audit_log where action = 'subscription.mark_paid'`,
    );
    expect(rowCount).toBe(1);
  });
});
