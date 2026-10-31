// T2.3: company isolation at the API, for every resource a company, candidate
// or moderator owns. Phase A's company takeover is the hole these close.
import type { INestApplication } from '@nestjs/common';
import { COMPANY_A, COMPANY_B } from 'testing';
import {
  insertAdmin,
  insertApplication,
  insertCandidate,
  insertCompany,
  insertEmployer,
  insertJob,
  insertJoinRequest,
  insertModerator,
  insertSubscription,
  testDb,
} from 'testing/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { describeIsolation, type Party } from './__harness__/isolation';
import {
  http,
  seedNbsRate,
  signIn,
  startApp,
  stopApp,
} from './__harness__/test-app';

let app: INestApplication;
const server = () => app.getHttpServer();
const q = (sql: string, params: unknown[] = []) =>
  testDb().pool.query(sql, params);
const row = async (sql: string, id: string) =>
  (await q(sql, [id])).rows[0] ?? null;

beforeAll(async () => {
  app = await startApp();
  await seedNbsRate();
});
afterAll(() => stopApp(app));

// --- parties -----------------------------------------------------------------

let employers: Promise<{ a: Party; b: Party }> | undefined;
/** Employers of the look-alike companies A and B, each with an active ŠEF plan. */
function employerParties() {
  employers ??= (async () => {
    const party = async (company: typeof COMPANY_A): Promise<Party> => {
      const c = await insertCompany({ company });
      await insertSubscription(c.id);
      const user = await insertEmployer(c.id);
      return {
        ...(await signIn(server(), user)),
        companyId: c.id,
        userId: user.id,
      };
    };
    return { a: await party(COMPANY_A), b: await party(COMPANY_B) };
  })();
  return employers;
}

async function candidateParties() {
  const party = async (): Promise<Party> => {
    const user = await insertCandidate();
    return {
      ...(await signIn(server(), user)),
      candidateId: user.candidateId,
      userId: user.id,
    };
  };
  return { a: await party(), b: await party() };
}

async function moderatorParties() {
  const party = async (): Promise<Party> => {
    const user = await insertModerator();
    return { ...(await signIn(server(), user)), userId: user.id };
  };
  return { a: await party(), b: await party() };
}

/** A published job of some third company, for candidates to apply to or save. */
async function publishedJob(): Promise<string> {
  const company = await insertCompany();
  const author = await insertEmployer(company.id);
  return (await insertJob(company.id, author.id, { status: 'published' })).id;
}

const DRAFT = {
  title: 'Zidar (m/ž)',
  description: 'Gradilište u Beogradu, prijava putem Šljakama.',
  citySlug: 'beograd',
  categorySlug: 'it',
  workModel: 'onsite',
  employmentType: 'full_time',
  seniority: 'mid',
};

// --- employer A vs employer B ---------------------------------------------------

/**
 * Employer job routes refuse another company's job with 403
 * JOB_FORBIDDEN_COMPANY instead of 404, which confirms the id exists (Known
 * issue, tracked by the it.fails below). Isolation itself holds.
 */
const JOB_DENIED = [403, 404] as const;

describeIsolation({
  name: 'employer jobs',
  app: () => app,
  parties: employerParties,
  create: async (a) => {
    const res = await http(app)
      .post('/api/employer/jobs')
      .set(a.headers)
      .send(DRAFT)
      .expect(201);
    return res.body.id as string;
  },
  snapshot: (id) =>
    row(
      'select company_id, title, status, submitted_at, updated_at from jobs where id = $1',
      id,
    ),
  list: '/api/employer/jobs',
  calls: [
    {
      name: 'read',
      method: 'get',
      path: (id) => `/api/employer/jobs/${id}`,
      deniedStatus: JOB_DENIED,
    },
    {
      name: 'edit the draft',
      method: 'patch',
      path: (id) => `/api/employer/jobs/${id}`,
      body: { ...DRAFT, title: 'Changed by B' },
      deniedStatus: JOB_DENIED,
    },
    {
      name: 'list its applications',
      method: 'get',
      path: (id) => `/api/employer/jobs/${id}/applications`,
      deniedStatus: JOB_DENIED,
    },
    {
      name: 'submit for moderation',
      method: 'post',
      path: (id) => `/api/employer/jobs/${id}/submit`,
      okStatus: 201,
      deniedStatus: JOB_DENIED,
    },
  ],
});

describeIsolation({
  name: 'employer proformas',
  app: () => app,
  parties: employerParties,
  create: async (a) => {
    const sub = await insertSubscription(a.companyId ?? '', {
      status: 'pending_payment',
      packageCode: 'tezga',
      priceMinor: 3000,
    });
    return sub.proformaId ?? '';
  },
  snapshot: (id) =>
    row(
      'select subscription_id, total_minor, paid_at, voided_at from proformas where id = $1',
      id,
    ),
  list: '/api/employer/subscriptions',
  calls: [
    {
      name: 'read the proforma',
      method: 'get',
      path: (id) => `/api/employer/billing/proformas/${id}`,
    },
    // The PDF is rendered after issue; its download is proven in billing-flow.int.test.ts.
    {
      name: 'download the proforma PDF',
      method: 'get',
      path: (id) => `/api/employer/billing/proformas/${id}/pdf`,
      ownerSkip: true,
    },
  ],
});

describeIsolation({
  name: 'employer applications',
  app: () => app,
  parties: employerParties,
  create: async (a) => {
    const job = await insertJob(a.companyId ?? '', a.userId, {
      status: 'published',
    });
    const candidate = await insertCandidate();
    return insertApplication(job.id, candidate.candidateId);
  },
  snapshot: (id) =>
    row('select status, updated_at from applications where id = $1', id),
  calls: [
    // The CV file itself is proven in applications-flow.int.test.ts.
    {
      name: 'download the CV',
      method: 'get',
      path: (id) => `/api/employer/applications/${id}/cv`,
      ownerSkip: true,
    },
    {
      name: 'shortlist',
      method: 'patch',
      path: (id) => `/api/employer/applications/${id}`,
      body: { status: 'shortlisted' },
    },
  ],
});

describe('employer company profile and purchases', () => {
  it("B's workspace is B's company, whatever company id B sends", async () => {
    const { a, b } = await employerParties();
    const res = await http(app)
      .get(`/api/employer/workspace?companyId=${a.companyId}`)
      .set(b.headers)
      .set('x-company-id', a.companyId ?? '')
      .expect(200);
    expect(JSON.stringify(res.body)).not.toContain(a.companyId);
    expect(JSON.stringify(res.body)).toContain(b.companyId);
  });

  it("a job B creates with A's company id in the body belongs to B's company", async () => {
    const { a, b } = await employerParties();
    const res = await http(app)
      .post(`/api/employer/jobs?companyId=${a.companyId}`)
      .set(b.headers)
      .send({ ...DRAFT, companyId: a.companyId, company_id: a.companyId });
    expect(res.status).toBe(201);
    const job = await row(
      'select company_id from jobs where id = $1',
      res.body.id,
    );
    expect(job?.company_id).toBe(b.companyId);
  });

  it("B can't buy a package for A's company, and A gets no subscription from it", async () => {
    const { a, b } = await employerParties();
    const before = await q(
      'select count(*)::int as n from subscriptions where company_id = $1',
      [a.companyId],
    );
    const res = await http(app)
      .post('/api/employer/subscriptions')
      .set(b.headers)
      .send({
        companyId: a.companyId,
        packageCode: 'tezga',
        durationDays: 30,
        currency: 'EUR',
      });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SUBSCRIPTION_FORBIDDEN');
    const after = await q(
      'select count(*)::int as n from subscriptions where company_id = $1',
      [a.companyId],
    );
    expect(after.rows[0].n).toBe(before.rows[0].n);
  });

  it("B can't upload an image into A's job description, and no media row appears", async () => {
    const { a, b } = await employerParties();
    const job = await http(app)
      .post('/api/employer/jobs')
      .set(a.headers)
      .send(DRAFT)
      .expect(201);
    const res = await http(app)
      .post(`/api/employer/jobs/${job.body.id}/image`)
      .set(b.headers)
      .attach('file', PNG_1PX, { filename: 'x.png', contentType: 'image/png' });
    expect(JOB_DENIED).toContain(res.status);
    const media = await q(
      'select count(*)::int as n from job_description_media where job_id = $1',
      [job.body.id],
    );
    expect(media.rows[0].n).toBe(0);
  });

  it("B's job applications list never shows A's applicants", async () => {
    const { a, b } = await employerParties();
    const jobOfA = await insertJob(a.companyId ?? '', a.userId, {
      status: 'published',
    });
    const candidate = await insertCandidate({
      email: 'tajna.kandidatkinja@example.test',
    });
    await insertApplication(jobOfA.id, candidate.candidateId);
    const res = await http(app)
      .get(`/api/employer/jobs/${jobOfA.id}/applications`)
      .set(b.headers);
    expect(JOB_DENIED).toContain(res.status);
    expect(JSON.stringify(res.body)).not.toContain('tajna.kandidatkinja');
  });
});

describe('employer job ids', () => {
  // A 403 would tell B that A's job id exists: answer like an unknown id.
  it("another company's job id answers 404, exactly like an unknown id", async () => {
    const { a, b } = await employerParties();
    const job = await insertJob(a.companyId ?? '', a.userId);
    const unknown = await http(app)
      .get('/api/employer/jobs/00000000-0000-4000-8000-00000000dead')
      .set(b.headers);
    const foreign = await http(app)
      .get(`/api/employer/jobs/${job.id}`)
      .set(b.headers);
    expect(foreign.status).toBe(unknown.status);
    expect(foreign.body.error.code).toBe(unknown.body.error.code);
  });
});

// --- candidate A vs candidate B -------------------------------------------------

describeIsolation({
  name: 'candidate applications',
  app: () => app,
  parties: candidateParties,
  create: async (a) =>
    insertApplication(await publishedJob(), a.candidateId ?? ''),
  snapshot: (id) =>
    row(
      'select candidate_id, status, updated_at from applications where id = $1',
      id,
    ),
  list: '/api/candidate/applications',
  calls: [
    {
      name: 'withdraw',
      method: 'patch',
      path: (id) => `/api/candidate/applications/${id}`,
      body: { status: 'withdrawn' },
    },
  ],
});

describeIsolation({
  name: 'candidate CVs',
  app: () => app,
  parties: candidateParties,
  create: async (a) => {
    const res = await http(app)
      .post('/api/candidate/resumes')
      .set(a.headers)
      .attach('file', PDF_MINIMAL, {
        filename: 'moj-cv.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    return res.body.id as string;
  },
  snapshot: (id) =>
    row(
      'select candidate_id, storage_key, is_primary from resume_assets where id = $1',
      id,
    ),
  list: '/api/candidate/resumes',
  calls: [
    {
      name: 'download',
      method: 'get',
      path: (id) => `/api/candidate/resumes/${id}/download`,
    },
    {
      name: 'delete',
      method: 'delete',
      path: (id) => `/api/candidate/resumes/${id}`,
    },
  ],
});

describeIsolation({
  name: 'candidate saved jobs',
  app: () => app,
  parties: candidateParties,
  create: async (a) => {
    const jobId = await publishedJob();
    await http(app)
      .post('/api/candidate/saved-jobs')
      .set(a.headers)
      .send({ jobId })
      .expect(201);
    return jobId;
  },
  // Keyed by the job: what matters is that A's bookmark survives B's call.
  snapshot: async (jobId) =>
    (
      await q(
        'select candidate_id from saved_jobs where job_id = $1 order by candidate_id',
        [jobId],
      )
    ).rows,
  list: '/api/candidate/saved-jobs',
  calls: [
    {
      name: 'unsave',
      method: 'delete',
      path: (jobId) => `/api/candidate/saved-jobs/${jobId}`,
      // B never saved it: removing "B's bookmark" is a no-op, never A's.
      deniedStatus: [200, 204, 404],
    },
  ],
});

describe('candidate profile', () => {
  it("B's profile is B's, whatever candidate id B sends", async () => {
    const { a, b } = await candidateParties();
    const res = await http(app)
      .get(`/api/candidate/me?candidateId=${a.candidateId}&userId=${a.userId}`)
      .set(b.headers)
      .expect(200);
    expect(res.body.user.id).toBe(b.userId);
    expect(JSON.stringify(res.body)).not.toContain(a.userId);
  });

  it("B can't apply with A's CV", async () => {
    const { a, b } = await candidateParties();
    const cv = await http(app)
      .post('/api/candidate/resumes')
      .set(a.headers)
      .attach('file', PDF_MINIMAL, {
        filename: 'a.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    const res = await http(app)
      .post('/api/candidate/applications')
      .set(b.headers)
      .send({ jobId: await publishedJob(), resumeAssetId: cv.body.id });
    expect([400, 403, 404]).toContain(res.status);
    const used = await q(
      'select count(*)::int as n from applications where resume_asset_id = $1',
      [cv.body.id],
    );
    expect(used.rows[0].n).toBe(0);
  });
});

// --- moderator A vs moderator B (Phase A moderator scoping) ----------------------

async function pipelineCompanyOf(moderatorId: string): Promise<string> {
  const company = await insertCompany({
    salesStatus: 'pipeline',
    assignedModeratorId: moderatorId,
  });
  return company.id;
}

describeIsolation({
  name: "a moderator's pipeline company",
  app: () => app,
  parties: moderatorParties,
  create: (a) => pipelineCompanyOf(a.userId),
  snapshot: (id) =>
    row(
      'select legal_name, slug, sales_status, assigned_moderator_id, verified_at from companies where id = $1',
      id,
    ),
  list: '/api/moderator/companies',
  calls: [
    {
      name: 'read',
      method: 'get',
      path: (id) => `/api/moderator/companies/${id}`,
      deniedStatus: [403, 404],
    },
    {
      name: 'edit',
      method: 'patch',
      path: (id) => `/api/moderator/companies/${id}`,
      body: { legalName: 'Promenio moderator B d.o.o.' },
      deniedStatus: [403, 404],
    },
    {
      name: 'pick up',
      method: 'post',
      path: (id) => `/api/moderator/companies/${id}/pickup`,
      deniedStatus: [403, 404, 409],
      ownerSkip: true,
    },
    {
      name: 'close lost',
      method: 'post',
      path: (id) => `/api/moderator/companies/${id}/close-lost`,
      body: { reason: 'B tried' },
      deniedStatus: [403, 404],
      ownerSkip: true,
    },
    {
      name: 'close won',
      method: 'post',
      path: (id) => `/api/moderator/companies/${id}/close-won`,
      deniedStatus: [403, 404],
    },
  ],
});

describeIsolation({
  name: "a join request to a moderator's company",
  app: () => app,
  parties: moderatorParties,
  create: async (a) => {
    const company = await pipelineCompanyOf(a.userId);
    const requester = await insertCandidate();
    await q(`update users set role = 'employer' where id = $1`, [requester.id]);
    return insertJoinRequest(requester.id, company);
  },
  snapshot: (id) =>
    row(
      'select status, decided_by_user_id from company_join_requests where id = $1',
      id,
    ),
  list: '/api/moderator/company-join-requests',
  calls: [
    {
      name: 'approve',
      method: 'post',
      path: (id) => `/api/moderator/company-join-requests/${id}/approve`,
      deniedStatus: [403, 404],
    },
  ],
});

describeIsolation({
  name: "a pending payment of a moderator's company",
  app: () => app,
  parties: moderatorParties,
  create: async (a) => {
    const company = await pipelineCompanyOf(a.userId);
    return (await insertSubscription(company, { status: 'pending_payment' }))
      .id;
  },
  snapshot: (id) =>
    row(
      'select status, starts_at, invoice_id, enabled_by_user_id from subscriptions where id = $1',
      id,
    ),
  list: '/api/moderator/subscriptions/pending-payment',
  calls: [
    {
      name: 'mark paid',
      method: 'post',
      path: (id) => `/api/moderator/subscriptions/${id}/mark-paid`,
      body: { paymentReference: '97-1234' },
      deniedStatus: [403, 404],
    },
  ],
});

// Stefan, 2026-10-29: moderators act only on their own companies and the
// lead pool (unassigned / closed-lost), like company details; admins on all.
describe('moderator scoping of employer memberships', () => {
  it("moderator B can't move an employer into moderator A's closed-won company", async () => {
    const { a, b } = await moderatorParties();
    const client = await insertCompany({
      salesStatus: 'closed_won',
      assignedModeratorId: a.userId,
    });
    const lead = await insertCompany();
    const outsider = await insertEmployer(lead.id);
    const { rows } = await q('select id from employers where user_id = $1', [
      outsider.id,
    ]);
    const res = await http(app)
      .patch(`/api/moderator/employers/${rows[0].id}`)
      .set(b.headers)
      .send({ companyId: client.id });
    expect([403, 404]).toContain(res.status);
    const after = await q(
      'select company_id from employers where user_id = $1',
      [outsider.id],
    );
    expect(after.rows[0].company_id).toBe(lead.id);
  });

  it("moderator B can't pull an employer out of moderator A's client either", async () => {
    const { a, b } = await moderatorParties();
    const client = await insertCompany({
      salesStatus: 'closed_won',
      assignedModeratorId: a.userId,
    });
    const member = await insertEmployer(client.id);
    const lead = await insertCompany();
    const { rows } = await q('select id from employers where user_id = $1', [
      member.id,
    ]);
    const res = await http(app)
      .patch(`/api/moderator/employers/${rows[0].id}`)
      .set(b.headers)
      .send({ companyId: lead.id });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('STAFF_COMPANY_VIEW_FORBIDDEN');
  });

  it('a moderator moves employers between their own and lead-pool companies', async () => {
    const { a } = await moderatorParties();
    const mine = await insertCompany({
      salesStatus: 'pipeline',
      assignedModeratorId: a.userId,
    });
    const lead = await insertCompany();
    const member = await insertEmployer(lead.id);
    const { rows } = await q('select id from employers where user_id = $1', [
      member.id,
    ]);
    await http(app)
      .patch(`/api/moderator/employers/${rows[0].id}`)
      .set(a.headers)
      .send({ companyId: mine.id })
      .expect(200);
  });

  it("the employer list hides another moderator's clients from B, not from an admin", async () => {
    const { a, b } = await moderatorParties();
    const client = await insertCompany({
      salesStatus: 'closed_won',
      assignedModeratorId: a.userId,
    });
    const member = await insertEmployer(client.id);
    const admin = await signIn(server(), await insertAdmin());
    const listed = async (headers: Record<string, string>) =>
      JSON.stringify(
        (
          await http(app)
            .get('/api/moderator/employers?limit=100')
            .set(headers)
            .expect(200)
        ).body,
      ).includes(member.id);
    expect(await listed(a.headers)).toBe(true);
    expect(await listed(b.headers)).toBe(false);
    expect(await listed(admin.headers)).toBe(true);
  });
});

describe('moderator scoping of jobs on behalf of a company', () => {
  it("moderator B can't create a job or open the composer for A's client", async () => {
    const { a, b } = await moderatorParties();
    const client = await insertCompany({
      salesStatus: 'closed_won',
      assignedModeratorId: a.userId,
    });
    await insertSubscription(client.id);
    const created = await http(app)
      .post('/api/moderator/jobs')
      .set(b.headers)
      .send({ ...DRAFT, companyId: client.id });
    expect(created.status).toBe(403);
    const bootstrap = await http(app)
      .get(`/api/moderator/companies/${client.id}/job-composer-bootstrap`)
      .set(b.headers);
    expect(bootstrap.status).toBe(403);
    const { rows } = await q(
      'select count(*)::int as n from jobs where company_id = $1',
      [client.id],
    );
    expect(rows[0].n).toBe(0);
  });

  it('the assigned moderator and an admin still can', async () => {
    const { a } = await moderatorParties();
    const client = await insertCompany({
      salesStatus: 'closed_won',
      assignedModeratorId: a.userId,
    });
    await insertSubscription(client.id);
    const admin = await signIn(server(), await insertAdmin());
    for (const headers of [a.headers, admin.headers]) {
      await http(app)
        .get(`/api/moderator/companies/${client.id}/job-composer-bootstrap`)
        .set(headers)
        .expect(200);
      await http(app)
        .post('/api/moderator/jobs')
        .set(headers)
        .send({ ...DRAFT, companyId: client.id })
        .expect(201);
    }
  });
});

// A 1×1 PNG and the smallest PDF the upload accepts.
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const PDF_MINIMAL = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
);
