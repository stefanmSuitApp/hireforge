// Every route the API serves, and who may call it (T2.1). Shared by the
// route-registry test and the BFF parity test.
import type { Access, Role } from 'testing/api';

const PUBLIC = (why: string): Access => ({ kind: 'public', why });
const SESSION: Access = { kind: 'session' };
const roles = (...r: Role[]): Access => ({ kind: 'roles', roles: r });
const STAFF = roles('moderator', 'admin');
const ADMIN = roles('admin');
const EMPLOYER = roles('employer');
const CANDIDATE = roles('candidate');

/**
 * Every route, and who may call it. Adding a PUBLIC route needs a reason;
 * anything a person owns belongs behind a role (and in company-isolation tests).
 */
export const ROUTES: Record<string, Access> = {
  'GET /api': PUBLIC('hello-world placeholder from the Nx generator'),
  'GET /api/health/live': PUBLIC('liveness probe'),
  'GET /api/health/ready': PUBLIC('readiness probe (deploy gate)'),
  // Finding (NEEDS_STEFAN.md): anyone can trigger a BullMQ ping job and a
  // Sanity request with this route.
  'GET /api/integration': PUBLIC('integration self-check (dev)'),

  'POST /api/auth/employer/register': PUBLIC('sign-up; rate-limited per IP'),
  'POST /api/auth/candidate/register': PUBLIC('sign-up; rate-limited per IP'),
  'POST /api/auth/candidate/login': PUBLIC('sign-in; rate-limited'),
  'POST /api/auth/employer/login': PUBLIC('sign-in; rate-limited'),
  'POST /api/auth/staff/login': PUBLIC('sign-in; rate-limited'),
  'POST /api/auth/refresh': PUBLIC('the refresh token is the credential'),
  'POST /api/auth/verify-email': PUBLIC('the emailed token is the credential'),
  'POST /api/auth/password-reset/request': PUBLIC(
    'answers the same for unknown emails',
  ),
  'POST /api/auth/password-reset/confirm': PUBLIC(
    'the emailed token is the credential',
  ),
  'POST /api/auth/invite/accept': PUBLIC(
    'the emailed (or staff-shared) invite token is the credential',
  ),
  'POST /api/auth/verify-email/resend': SESSION,

  'GET /api/public/jobs/filters': PUBLIC('taxonomy for the filter UI'),
  'GET /api/public/jobs/previews': PUBLIC('published jobs only'),
  'GET /api/public/jobs/sitemap': PUBLIC(
    'live job URLs and counts for sitemaps and landing pages',
  ),
  'GET /api/public/jobs': PUBLIC('published jobs only'),
  'GET /api/public/jobs/company/:slug': PUBLIC('public company page'),
  'GET /api/public/jobs/by-slug/:slug': PUBLIC('published jobs only'),
  'POST /api/public/jobs/:id/external-click': PUBLIC(
    'click counter; rate-limited',
  ),
  'GET /api/public/jobs/:id/similar': PUBLIC('published jobs only'),
  'GET /api/public/jobs/:id': PUBLIC('published jobs only'),
  'GET /api/public/job-description-media/:id': PUBLIC(
    'images of published jobs only',
  ),
  'GET /api/public/employers': PUBLIC(
    'directory of companies with live jobs; sign-in only when PUBLIC_JOBS is off',
  ),

  'POST /api/cms/sync/package': { kind: 'token', header: 'x-cms-sync-secret' },

  'GET /api/internal/whoami': SESSION,
  'GET /api/internal/admin/ping': ADMIN,

  'GET /api/candidate/me': CANDIDATE,
  'PATCH /api/candidate/profile': CANDIDATE,
  'GET /api/candidate/resumes': CANDIDATE,
  'POST /api/candidate/resumes/generate': CANDIDATE,
  'POST /api/candidate/resumes': CANDIDATE,
  'GET /api/candidate/resumes/:id/download': CANDIDATE,
  'DELETE /api/candidate/resumes/:id': CANDIDATE,
  'PATCH /api/candidate/applications/:id': CANDIDATE,
  'POST /api/candidate/applications': CANDIDATE,
  'GET /api/candidate/applications': CANDIDATE,
  'GET /api/candidate/saved-jobs': CANDIDATE,
  'POST /api/candidate/saved-jobs': CANDIDATE,
  'DELETE /api/candidate/saved-jobs/:jobId': CANDIDATE,
  'POST /api/candidate/saved-searches': CANDIDATE,

  'GET /api/employer/workspace': EMPLOYER,
  'GET /api/employer/join-request': EMPLOYER,
  'GET /api/employer/packages': EMPLOYER,
  'GET /api/employer/subscriptions': EMPLOYER,
  'GET /api/employer/billing/proformas/:id/pdf': EMPLOYER,
  'GET /api/employer/billing/proformas/:id': EMPLOYER,
  'GET /api/employer/jobs': EMPLOYER,
  'POST /api/employer/jobs': EMPLOYER,
  'GET /api/employer/jobs/:id/applications': EMPLOYER,
  'POST /api/employer/jobs/:id/submit': EMPLOYER,
  'POST /api/employer/jobs/:id/image': EMPLOYER,
  'GET /api/employer/jobs/:id': EMPLOYER,
  'PATCH /api/employer/jobs/:id': EMPLOYER,
  'POST /api/employer/subscriptions': EMPLOYER,

  'GET /api/moderator/me': STAFF,
  'POST /api/moderator/jobs': STAFF,
  'GET /api/moderator/jobs/queue': STAFF,
  'GET /api/moderator/subscriptions/pending-payment': STAFF,
  'GET /api/moderator/jobs/:id/authoring': STAFF,
  'GET /api/moderator/jobs/:id': STAFF,
  'GET /api/moderator/companies/:companyId/job-composer-bootstrap': STAFF,
  'PATCH /api/moderator/jobs/:id': STAFF,
  'POST /api/moderator/jobs/:id/image': STAFF,
  'POST /api/moderator/jobs/:id/publish': STAFF,
  'POST /api/moderator/jobs/:id/publish-directly': STAFF,
  'POST /api/moderator/jobs/:id/reject': STAFF,
  'POST /api/moderator/jobs/:id/unpublish': STAFF,
  'POST /api/moderator/subscriptions/:id/mark-paid': STAFF,
  'GET /api/moderator/companies': STAFF,
  'GET /api/moderator/companies/:id': STAFF,
  'POST /api/moderator/companies': STAFF,
  'POST /api/moderator/companies/:id/accounts': STAFF,
  'POST /api/moderator/companies/:id/accounts/:userId/invite': STAFF,
  'POST /api/moderator/companies/:id/pickup': STAFF,
  'POST /api/moderator/companies/:id/close-won': STAFF,
  'POST /api/moderator/companies/:id/close-lost': STAFF,
  'PATCH /api/moderator/companies/:id': STAFF,
  'GET /api/moderator/employers': STAFF,
  'PATCH /api/moderator/employers/:employerId': STAFF,
  'GET /api/moderator/company-join-requests': STAFF,
  'POST /api/moderator/company-join-requests/:id/approve': STAFF,
  'POST /api/moderator/company-join-requests/:id/reject': STAFF,

  'GET /api/admin/promo-codes': ADMIN,
  'POST /api/admin/promo-codes': ADMIN,
  'PATCH /api/admin/promo-codes/:id': ADMIN,
  'GET /api/admin/campaigns': ADMIN,
  'GET /api/public/campaign': PUBLIC(
    'running campaign for the banner; never a code',
  ),
  'POST /api/admin/campaigns': ADMIN,
  'PATCH /api/admin/campaigns/:id': ADMIN,
  'GET /api/admin/companies/:id/assignment-history': ADMIN,
  'POST /api/admin/companies/:id/reassign': ADMIN,
  'GET /api/admin/users': ADMIN,
  'PATCH /api/admin/users/:id': ADMIN,
  'GET /api/admin/job-categories': ADMIN,
  'POST /api/admin/job-categories': ADMIN,
  'PATCH /api/admin/job-categories/:id': ADMIN,
  'DELETE /api/admin/job-categories/:id': ADMIN,
  'GET /api/admin/audit': ADMIN,
  'POST /api/admin/jobs/:id/publish-directly': ADMIN,
  'POST /api/admin/jobs/:id/patch-publish': ADMIN,
  'POST /api/admin/jobs/:id/force-archive': ADMIN,
  'GET /api/admin/subscriptions/pending-enterprise': ADMIN,
  'POST /api/admin/subscriptions/:id/activate': ADMIN,
  'PATCH /api/admin/subscriptions/:id/max-active-jobs': ADMIN,
  'POST /api/admin/subscriptions/:id/cancel': ADMIN,
};
