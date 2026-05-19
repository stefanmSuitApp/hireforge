import { eq } from 'drizzle-orm';

import type { DrizzleDb } from 'database';
import { jobs } from 'database';
import { isKnownOutboxEventType, type OutboxEventType } from 'shared';

import { workerLog } from './worker-log';

type DrizzleTx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0];

const JOB_LISTING_TOUCH_EVENTS: ReadonlySet<OutboxEventType> = new Set([
  'job_submitted',
  'job_published',
  'job_rejected',
  'job_unpublished',
  'job_force_archived',
  'application_submitted',
]);

function readPayloadIds(payload: unknown): {
  jobId: string;
  applicationId: string;
  candidateId: string;
  companyId: string;
  proformaId: string;
  invoiceId: string;
  subscriptionId: string;
} {
  const pl = payload as Record<string, unknown>;
  return {
    jobId: typeof pl['jobId'] === 'string' ? pl['jobId'] : '',
    applicationId:
      typeof pl['applicationId'] === 'string' ? pl['applicationId'] : '',
    candidateId: typeof pl['candidateId'] === 'string' ? pl['candidateId'] : '',
    companyId: typeof pl['companyId'] === 'string' ? pl['companyId'] : '',
    proformaId: typeof pl['proformaId'] === 'string' ? pl['proformaId'] : '',
    invoiceId: typeof pl['invoiceId'] === 'string' ? pl['invoiceId'] : '',
    subscriptionId:
      typeof pl['subscriptionId'] === 'string' ? pl['subscriptionId'] : '',
  };
}

const EMAIL_TEMPLATE_BY_EVENT: Record<OutboxEventType, string> = {
  application_submitted: 'employer_new_application',
  job_submitted: 'moderator_job_submitted',
  job_rejected: 'employer_job_rejected',
  job_published: 'employer_job_live',
  job_unpublished: 'employer_job_archived',
  job_force_archived: 'staff_job_force_archived',
  proforma_issued: 'employer_proforma_issued',
  invoice_issued: 'employer_invoice_issued',
};

function emailTemplateFor(eventType: OutboxEventType): string {
  return EMAIL_TEMPLATE_BY_EVENT[eventType];
}

async function touchJobListingIfApplicable(
  tx: DrizzleTx,
  eventType: OutboxEventType,
  jobId: string,
  outboxEventId: number,
): Promise<void> {
  if (!jobId || !JOB_LISTING_TOUCH_EVENTS.has(eventType)) {
    return;
  }

  const updated = await tx
    .update(jobs)
    .set({ updatedAt: new Date() })
    .where(eq(jobs.id, jobId))
    .returning({ id: jobs.id });

  workerLog('info', 'indexing_job_listing_touch', {
    service: 'worker',
    outboxEventId: String(outboxEventId),
    eventType,
    jobId,
    rowsUpdated: String(updated.length),
  });
}

function logEmailIntentForEvent(
  row: { id: number; eventType: OutboxEventType },
  pl: ReturnType<typeof readPayloadIds>,
): void {
  const template = emailTemplateFor(row.eventType);
  workerLog('info', 'email_intent', {
    service: 'worker',
    outboxEventId: String(row.id),
    eventType: row.eventType,
    template,
    jobId: pl.jobId || undefined,
    applicationId: pl.applicationId || undefined,
    candidateId: pl.candidateId || undefined,
    companyId: pl.companyId || undefined,
    proformaId: pl.proformaId || undefined,
    invoiceId: pl.invoiceId || undefined,
    subscriptionId: pl.subscriptionId || undefined,
  });
}

/**
 * In-transaction hooks (indexing signal + email intent logs).
 * Must stay fast; anything slow or non-idempotent belongs in separate jobs.
 */
export async function dispatchOutboxHooks(
  tx: DrizzleTx,
  row: { id: number; eventType: string; payload: unknown },
): Promise<void> {
  if (!isKnownOutboxEventType(row.eventType)) {
    workerLog('error', 'outbox_unknown_event_type', {
      service: 'worker',
      outboxEventId: String(row.id),
      eventType: row.eventType,
    });
    return;
  }

  const eventType = row.eventType;
  const pl = readPayloadIds(row.payload);

  await touchJobListingIfApplicable(tx, eventType, pl.jobId, row.id);
  logEmailIntentForEvent({ id: row.id, eventType }, pl);

  workerLog('info', 'outbox_event_handled', {
    service: 'worker',
    outboxEventId: String(row.id),
    eventType,
    jobId: pl.jobId,
    applicationId: pl.applicationId,
    companyId: pl.companyId || undefined,
    proformaId: pl.proformaId || undefined,
    invoiceId: pl.invoiceId || undefined,
  });
}
