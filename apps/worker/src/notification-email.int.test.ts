// T4.2 every notification reaches the Resend stub with the right recipient,
// language and links, once per (event, recipient); billing mails too.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb } from 'database';
import { startResendStub } from 'testing';
import {
  insertCandidate,
  insertCompany,
  insertEmployer,
  insertJob,
  insertJoinRequest,
  insertOutboxEvent,
  testDb,
} from 'testing/db';
import { sendBillingTransactionalEmail } from './billing-email-dispatch';
import { sendNotificationForOutboxEvent } from './notification-email';

const ORIGIN = 'https://sljakam.test';
const { db, pool } = createDb(testDb().url);
const q = (sql: string, params: unknown[] = []) =>
  testDb().pool.query(sql, params);
let resend: Awaited<ReturnType<typeof startResendStub>>;

beforeAll(async () => {
  resend = await startResendStub();
  Object.assign(process.env, resend.env, {
    APP_PUBLIC_ORIGIN: ORIGIN,
    NEXT_PUBLIC_APP_URL: ORIGIN,
  });
});
afterAll(async () => {
  await resend.close();
  await pool.end();
});

/** A company (in `lang`) with two employers and a published job. */
async function companyWithJob(lang: 'sr' | 'en' = 'sr') {
  const company = await insertCompany();
  await q('update companies set invoice_language = $2 where id = $1', [
    company.id,
    lang,
  ]);
  const first = await insertEmployer(company.id);
  const second = await insertEmployer(company.id);
  const job = await insertJob(company.id, first.id, {
    status: 'published',
    title: 'Zavarivač',
  });
  return { company, employers: [first, second], job };
}

async function notify(
  eventType: Parameters<typeof sendNotificationForOutboxEvent>[1]['eventType'],
  payload: Record<string, unknown>,
) {
  const id = await insertOutboxEvent(eventType, payload);
  await sendNotificationForOutboxEvent(db, {
    outboxEventId: id,
    eventType,
    payload,
  });
  return id;
}

describe('employer notifications about a job', () => {
  const cases = [
    [
      'application_submitted',
      (jobId: string) => `${ORIGIN}/sr/employer/jobs/${jobId}/applications`,
    ],
    ['job_published', (_: string, slug: string) => `${ORIGIN}/sr/jobs/${slug}`],
    [
      'job_rejected',
      (jobId: string) => `${ORIGIN}/sr/employer/jobs/${jobId}/edit`,
    ],
    ['job_expiring_soon', () => `${ORIGIN}/sr/employer/jobs`],
    ['job_expired', () => `${ORIGIN}/sr/employer/packages`],
  ] as const;

  for (const [eventType, link] of cases) {
    it(`${eventType}: every employer of the company gets one email with the job title and its link`, async () => {
      const { employers, job } = await companyWithJob();
      const id = await notify(eventType, {
        jobId: job.id,
        reason: 'Opis je prekratak.',
        expiresAt: '2026-02-01T10:00:00.000Z',
      });
      for (const employer of employers) {
        const mail = resend.to(employer.email);
        expect(mail, `${eventType} to ${employer.email}`).toHaveLength(1);
        expect(mail[0]?.subject).toBeTruthy();
        expect(mail[0]?.html).toContain('Zavarivač');
        expect(mail[0]?.html).toContain(link(job.id, job.slug));
        expect(mail[0]?.idempotencyKey).toBe(`outbox-${id}-${employer.id}`);
      }
    });
  }

  it('the rejection email includes the moderator reason', async () => {
    const { employers, job } = await companyWithJob();
    await notify('job_rejected', { jobId: job.id, reason: 'Nedostaje plata.' });
    expect(resend.to(employers[0]?.email ?? '')[0]?.html).toContain(
      'Nedostaje plata.',
    );
  });

  it('the expiring-soon date is shown in Belgrade time', async () => {
    const { employers, job } = await companyWithJob();
    // 23:30 UTC on the 1st is already the 2nd in Belgrade.
    await notify('job_expiring_soon', {
      jobId: job.id,
      expiresAt: '2026-02-01T23:30:00.000Z',
    });
    expect(resend.to(employers[0]?.email ?? '')[0]?.text).toMatch(
      /2\.\s?2\.\s?2026/,
    );
  });

  it('a company that invoices in English gets English emails with /en/ links', async () => {
    const { employers, job } = await companyWithJob('en');
    await notify('job_published', { jobId: job.id });
    const mail = resend.to(employers[0]?.email ?? '')[0];
    expect(mail?.html).toContain(`${ORIGIN}/en/jobs/`);
    const sr = await companyWithJob('sr');
    await notify('job_published', { jobId: sr.job.id });
    expect(resend.to(sr.employers[0]?.email ?? '')[0]?.subject).not.toBe(
      mail?.subject,
    );
  });

  it('sending the same event twice reaches Resend with the same key, so it is stored once', async () => {
    const { employers, job } = await companyWithJob();
    const id = await insertOutboxEvent('job_published', { jobId: job.id });
    for (let i = 0; i < 2; i++) {
      await sendNotificationForOutboxEvent(db, {
        outboxEventId: id,
        eventType: 'job_published',
        payload: { jobId: job.id },
      });
    }
    expect(resend.to(employers[0]?.email ?? '')).toHaveLength(1);
  });

  it('an event for a deleted job sends nothing and does not throw', async () => {
    await expect(
      notify('job_published', {
        jobId: '00000000-0000-4000-8000-00000000dead',
      }),
    ).resolves.toBeDefined();
  });

  it('a Resend error is thrown, so the BullMQ job retries', async () => {
    const { job } = await companyWithJob();
    resend.reply({ status: 500, body: '{"message":"down"}' });
    try {
      await expect(
        notify('job_published', { jobId: job.id }),
      ).rejects.toThrow();
    } finally {
      // Back to the recording behaviour for the other tests.
      const fresh = await startResendStub();
      Object.assign(process.env, fresh.env);
      await resend.close();
      resend = fresh;
    }
  });
});

describe('join request decisions', () => {
  it.each([
    ['approved', '/sr/employer'],
    ['rejected', '/sr/employer/login'],
  ] as const)(
    'a %s request emails the requester with the company name',
    async (status, path) => {
      const company = await insertCompany({
        company: { legalName: 'Odluka d.o.o.' },
      });
      const requester = await insertCandidate();
      const requestId = await insertJoinRequest(
        requester.id,
        company.id,
        status,
      );
      await notify('company_join_request_decided', {
        joinRequestId: requestId,
        companyId: company.id,
        decision: status,
      });
      const mail = resend.to(requester.email);
      expect(mail).toHaveLength(1);
      expect(mail[0]?.html).toContain('Odluka d.o.o.');
      expect(mail[0]?.html).toContain(`${ORIGIN}${path}`);
    },
  );

  it('a still-pending request sends nothing', async () => {
    const company = await insertCompany();
    const requester = await insertCandidate();
    const requestId = await insertJoinRequest(
      requester.id,
      company.id,
      'pending',
    );
    await notify('company_join_request_decided', { joinRequestId: requestId });
    expect(resend.to(requester.email)).toHaveLength(0);
  });
});

describe('billing emails', () => {
  async function billed(lang: 'sr' | 'en') {
    const company = await insertCompany();
    const employer = await insertEmployer(company.id);
    return { company, employer, lang };
  }

  it('proforma_issued: the employer gets a link to the proforma, in Serbian', async () => {
    const { company, employer } = await billed('sr');
    await sendBillingTransactionalEmail({
      db,
      eventType: 'proforma_issued',
      payload: {
        companyId: company.id,
        proformaId: 'pf-1',
        invoiceLanguage: 'sr',
      },
    });
    const mail = resend.to(employer.email)[0];
    expect(mail?.subject).toBe('Šljakam — profaktura je spremna');
    expect(mail?.html).toContain(`${ORIGIN}/sr/employer/billing/proforma/pf-1`);
    // Copy fix in this phase: "izadata" was a typo for "izdata" (issued).
    expect(mail?.text).toContain('Profaktura je izdata.');
  });

  it('invoice_issued in English links to the packages page', async () => {
    const { company, employer } = await billed('en');
    await sendBillingTransactionalEmail({
      db,
      eventType: 'invoice_issued',
      payload: {
        companyId: company.id,
        invoiceId: 'inv-1',
        invoiceLanguage: 'en',
      },
    });
    const mail = resend.to(employer.email)[0];
    expect(mail?.subject).toBe('Šljakam — invoice issued');
    expect(mail?.html).toContain(`${ORIGIN}/en/employer/packages`);
  });

  it('other events never send a billing email', async () => {
    const { company, employer } = await billed('sr');
    await sendBillingTransactionalEmail({
      db,
      eventType: 'job_published',
      payload: { companyId: company.id },
    });
    expect(resend.to(employer.email)).toHaveLength(0);
  });
});
