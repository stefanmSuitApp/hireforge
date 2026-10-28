import { eq } from 'drizzle-orm';

import type { DrizzleDb } from 'database';
import {
  companies,
  companyJoinRequests,
  employers,
  jobs,
  users,
} from 'database';
import {
  appPublicOrigin,
  emailLocale,
  type EmailLocale,
  type NotificationEmail,
  notificationMessage,
  sendEmail,
} from 'server-email';
import type { OutboxEventType } from 'shared';

import { workerLog } from './worker-log';

/** Outbox events that email someone (billing mails stay in billing-email-dispatch). */
export const NOTIFICATION_EVENT_TYPES: ReadonlySet<OutboxEventType> = new Set([
  'application_submitted',
  'job_published',
  'job_rejected',
  'job_expiring_soon',
  'job_expired',
  'company_join_request_decided',
]);

type Recipient = { userId: string; email: string };
type Prepared = {
  locale: EmailLocale;
  recipients: Recipient[];
  email: NotificationEmail;
};

function str(payload: Record<string, unknown>, key: string): string {
  const v = payload[key];
  return typeof v === 'string' ? v : '';
}

async function companyEmployers(
  db: DrizzleDb,
  companyId: string,
): Promise<Recipient[]> {
  return db
    .select({ userId: users.id, email: users.email })
    .from(employers)
    .innerJoin(users, eq(employers.userId, users.id))
    .where(eq(employers.companyId, companyId));
}

async function prepareJobEmail(
  db: DrizzleDb,
  eventType: OutboxEventType,
  payload: Record<string, unknown>,
): Promise<Prepared | null> {
  const jobId = str(payload, 'jobId');
  if (!jobId) {
    return null;
  }
  const [job] = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      slug: jobs.slug,
      companyId: jobs.companyId,
      invoiceLanguage: companies.invoiceLanguage,
    })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(eq(jobs.id, jobId))
    .limit(1);
  if (!job) {
    return null;
  }
  const locale = emailLocale(job.invoiceLanguage);
  const origin = appPublicOrigin();
  const recipients = await companyEmployers(db, job.companyId);
  const jobsUrl = `${origin}/${locale}/employer/jobs`;

  let email: NotificationEmail;
  switch (eventType) {
    case 'application_submitted':
      email = {
        kind: 'employer_new_application',
        jobTitle: job.title,
        applicationsUrl: `${jobsUrl}/${job.id}/applications`,
      };
      break;
    case 'job_published':
      email = {
        kind: 'employer_job_published',
        jobTitle: job.title,
        jobUrl: `${origin}/${locale}/jobs/${job.slug ?? job.id}`,
      };
      break;
    case 'job_rejected':
      email = {
        kind: 'employer_job_rejected',
        jobTitle: job.title,
        reason: str(payload, 'reason') || null,
        editUrl: `${jobsUrl}/${job.id}/edit`,
      };
      break;
    case 'job_expiring_soon': {
      const expiresAt = str(payload, 'expiresAt');
      email = {
        kind: 'employer_job_expiring_soon',
        jobTitle: job.title,
        expiresOn: expiresAt
          ? new Date(expiresAt).toLocaleDateString(
              locale === 'en' ? 'en-GB' : 'sr-Latn-RS',
              { timeZone: 'Europe/Belgrade' },
            )
          : '',
        jobsUrl,
      };
      break;
    }
    case 'job_expired':
      email = {
        kind: 'employer_job_expired',
        jobTitle: job.title,
        packagesUrl: `${origin}/${locale}/employer/packages`,
      };
      break;
    default:
      return null;
  }
  return { locale, recipients, email };
}

async function prepareJoinDecisionEmail(
  db: DrizzleDb,
  payload: Record<string, unknown>,
): Promise<Prepared | null> {
  const requestId = str(payload, 'joinRequestId');
  if (!requestId) {
    return null;
  }
  const [row] = await db
    .select({
      status: companyJoinRequests.status,
      userId: users.id,
      email: users.email,
      companyName: companies.legalName,
    })
    .from(companyJoinRequests)
    .innerJoin(users, eq(companyJoinRequests.userId, users.id))
    .innerJoin(companies, eq(companyJoinRequests.companyId, companies.id))
    .where(eq(companyJoinRequests.id, requestId))
    .limit(1);
  if (!row || row.status === 'pending') {
    return null;
  }
  const approved = row.status === 'approved';
  const locale: EmailLocale = 'sr';
  return {
    locale,
    recipients: [{ userId: row.userId, email: row.email }],
    email: {
      kind: 'company_join_request_decided',
      companyName: row.companyName,
      approved,
      url: `${appPublicOrigin()}/${locale}/${approved ? 'employer' : 'employer/login'}`,
    },
  };
}

/**
 * Sends the notification for one outbox event. Throws on delivery errors so
 * the BullMQ job retries; Resend dedupes per (outbox event, recipient).
 */
export async function sendNotificationForOutboxEvent(
  db: DrizzleDb,
  input: {
    outboxEventId: number;
    eventType: OutboxEventType;
    payload: unknown;
  },
): Promise<void> {
  const payload = (input.payload ?? {}) as Record<string, unknown>;
  const prepared =
    input.eventType === 'company_join_request_decided'
      ? await prepareJoinDecisionEmail(db, payload)
      : await prepareJobEmail(db, input.eventType, payload);
  if (!prepared || prepared.recipients.length === 0) {
    workerLog('warn', 'notification_email_no_recipient', {
      service: 'worker',
      outboxEventId: String(input.outboxEventId),
      eventType: input.eventType,
    });
    return;
  }
  const message = notificationMessage(prepared.locale, prepared.email);
  for (const recipient of prepared.recipients) {
    const result = await sendEmail({
      to: recipient.email,
      ...message,
      idempotencyKey: `outbox-${input.outboxEventId}-${recipient.userId}`,
    });
    workerLog('info', 'notification_email', {
      service: 'worker',
      outboxEventId: String(input.outboxEventId),
      eventType: input.eventType,
      kind: prepared.email.kind,
      status: result.status,
    });
  }
}
